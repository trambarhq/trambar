var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Database = require('database');
var TaskQueue = require('utils/task-queue');

var HookManager = require('gitlab-adapter/hook-manager');
var CommentImporter = require('gitlab-adapter/comment-importer');
var CommentExporter = require('gitlab-adapter/comment-exporter');
var EventImporter = require('gitlab-adapter/event-importer');
var RepoImporter = require('gitlab-adapter/repo-importer');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Project = require('accessors/project');
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var User = require('accessors/user');

var server;
var database;

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return db.need('global').then(() => {
            return new Promise((resolve, reject) => {
                // listen for Webhook invocation
                var app = Express();
                app.use(BodyParser.json());
                app.set('json spaces', 2);
                app.post('/gitlab/hook/:repoId/:projectId', handleHookCallback);
                server = app.listen(80, () => {
                    console.log('Listening...')
                    resolve();
                });
            });
        }).then(() => {
            // install hooks
            return HookManager.installHooks(db);
        }).then(() => {
            // listen for database change events
            var tables = [
                'project',
                'reaction',
                'server',
                'story',
            ];
            return db.listen(tables, 'change', handleDatabaseChanges, 100).then(() => {
                var tables = [
                    'project',
                    'repo',
                    'user',
                    'role',
                ];
                return db.listen(tables, 'sync', handleDatabaseSyncRequests, 0);
            });
        }).then(() => {
            // try importing events from all projects, as events could have
            // occurred while Trambar is down
            var criteria = {
                deleted: false
            };
            return Project.find(db, 'global', criteria, '*').each((project) => {
                var criteria = {
                    id: project.repo_ids,
                    type: 'gitlab',
                    deleted: false,
                };
                return Repo.find(db, 'global', criteria, '*').each((repo) => {
                    var criteria = {
                        id: repo.server_id,
                        deleted: false,
                    };
                    return Server.find(db, 'global', criteria, '*').each((server) => {
                        return taskQueue.schedule(`import_repo_events:${repo.id}`, () => {
                            return EventImporter.importEvents(db, server, repo, project);
                        });
                    });
                });
            });
        });
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server.on('close', () => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

var taskQueue = new TaskQueue;

function handleDatabaseChanges(events) {
    _.each(events, (event) => {
        handleDatabaseEvent(event);
    });
}

function handleDatabaseSyncRequests(events) {
    _.each(events, (event) => {
        handleDatabaseSyncRequest(event);
    });
}

function handleDatabaseEvent(event) {
    if (event.action === 'DELETE') {
        return;
    }
    var db = database;
    var schema = event.schema;
    var table = event.table;
    var diff = event.diff;
    if (table === 'server') {
        // import roles, and repos from server when API access is gained
        if (diff.settings) {
            var criteria = {
                id: event.id,
                type: 'gitlab',
                deleted: false,
            };
            return Server.findOne(db, 'global', criteria, '*').then((server) => {
                if (!server) {
                    return;
                }
                if (!server.settings.api || !server.settings.oauth) {
                    return;
                }
                if (!server.settings.api.access_token || !server.settings.oauth.baseURL) {
                    return;
                }
                return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server);
                });
            });
        }
    } else if (table === 'project') {
        // import events from repository when it's added to project
        if (diff.repo_ids) {
            var repoIdsBefore = diff.repo_ids[0];
            var repoIdsAfter = diff.repo_ids[1];
            var newRepoIds = _.difference(repoIdsAfter, repoIdsBefore);
            if (_.isEmpty(newRepoIds)) {
                return;
            }
            return Project.findOne(db, 'global', { id: event.id }, '*').then((project) => {
                if (!project) {
                    return;
                }
                return Repo.find(db, 'global', { id: newRepoIds }, '*').then((repos) => {
                    var serverIds = _.uniq(_.map(repos, 'server_id'));
                    return Server.find(db, 'global', { id: serverIds }, '*').then((servers) => {
                        _.each(repos, (repo) => {
                            var server = _.find(servers, { id: repo.server_id });
                            if (!server) {
                                return;
                            }
                            return taskQueue.schedule(`import_repo_events:${repo.id}`, () => {
                                // make sure the project-specific schema exists
                                return db.need(project.name, 5000).then(() => {
                                    return EventImporter.importEvents(db, server, repo, project);
                                });
                            });
                        });
                    });
                });
            });
        }
    } else if (event.table === 'story') {
        // copy contents from story to issue tracker
        Story.findOne(db, schema, { id: event.id }, '*').then((story) => {
            /*
            if (story.details.issue_tracking && story.repo_id) {
                return taskQueue.schedule(`export_story:${story.id}`, () => {
                    return StoryExporter.exportStory(db, story);
                });
            }
            */
        });
    } else if (event.table === 'reaction') {
        // add comments to issue tracker
        Reaction.findOne(db, schema, { id: event.id }, '*').then((reaction) => {
            if (!reaction || !reaction.ptime || reaction.type !== 'comment') {
                return;
            }
            return Story.findOne(db, schema, { id: reaction.story_id }, '*').then((story) => {
                /*
                if (story.details.issue_tracking && story.repo_id) {
                    return taskQueue.schedule(`export_reaction:${reaction.id}`() => {
                        return CommentExporter.exportComment(db, reaction, story);
                    });
                }
                */
            });
        });
    }
}

function handleDatabaseSyncRequest(event) {
    var db = database;
    var table = event.table;
    var criteria = event.criteria;
    if (table === 'project') {
        return Project.find(db, 'global', criteria, '*').each((project) => {
            return taskQueue.schedule(`import_project_member:${project.id}`, () => {
                return UserImporter.importProjectMembers(db, project);
            });
        });
    } else if(table === 'repo') {
        if (!criteria.hasOwnProperty('id')) {
            // an open-ended search was performed--see if there're new ones
            var serverCriteria = {
                type: 'gitlab',
                deleted: false,
            };
            return Server.find(db, 'global', serverCriteria, '*').each((server) => {
                return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server);
                });
            });
        } else {
            return Repo.find(db, 'global', criteria, '*').each((repo) => {
                var serverCriteria = {
                    id: repo.server_id,
                    type: 'gitlab'
                };
                return Server.find(db, 'global', serverCriteria, '*').each((server) => {
                    return taskQueue.schedule(`update_repo:${repo.id}`, () => {
                        return RepoImporter.updateRepository(db, server, repo);
                    });
                });
            });
        }
    } else if (table === 'user') {
        if (!criteria.hasOwnProperty('id')) {
            // an open-ended search was performed--see if there're new project members
            return Project.find(db, 'global', { deleted: false }, '*').each((project) => {
                return taskQueue.schedule(`import_project_member:$(project.id)`, () => {
                    return UserImporter.importProjectMembers(db, project);
                });
            });
        } else {
            return User.find(db, 'global', criteria, '*').each((user) => {
                return Server.find(db, 'global', { id: user.server_id, type: 'gitlab' }, '*').each((server) => {
                    return taskQueue.schedule(`update_user:${user.id}`, () => {
                        return UserImporter.updateUser(db, server, user);
                    });
                });
            });
        }
    }
}

function handleHookCallback(req, res) {
    var repoId = req.params.repoId;
    var projectId = req.params.projectId;
    var event = req.body;
    //console.log('Incoming: ', event);
    var db = database;
    return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
        return Project.findOne(db, 'global', { id: projectId }, '*').then((project) => {
            if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                return;
            }
            return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                if (event.object_kind === 'note') {
                    return taskQueue.schedule(null, () => {
                        return CommentImporter.importComments(db, server, repo, event, project)
                    });
                } else if (event.object_kind === 'wiki_page') {
                    return taskQueue.schedule(null, () => {
                        return EventImporter.importWikiEvent(db, server, repo, event, project);
                    });
                } else {
                    return taskQueue.schedule(`import_repo_events:${repo.id}`, () => {
                        return EventImporter.importEvents(db, server, repo, project);
                    });
                }
            });
        });
    }).finally(() => {
        res.end();
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
