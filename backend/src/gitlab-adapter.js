var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var DNSCache = require('dnscache');
var Database = require('database');
var Shutdown = require('shutdown');
var TaskQueue = require('utils/task-queue');
var StoryTypes = require('objects/types/story-types');

var Import = require('external-services/import');
var HookManager = require('gitlab-adapter/hook-manager');
var EventImporter = require('gitlab-adapter/event-importer');
var RepoImporter = require('gitlab-adapter/repo-importer');
var UserImporter = require('gitlab-adapter/user-importer');
var IssueExporter = require('gitlab-adapter/issue-exporter');

// accessors
var Project = require('accessors/project');
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var System = require('accessors/system');
var User = require('accessors/user');

var server;
var database;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return db.need('global').then(() => {
            return new Promise((resolve, reject) => {
                // listen for Webhook invocation
                var app = Express();
                app.use(BodyParser.json());
                app.set('json spaces', 2);
                app.post('/gitlab/hook/:serverId/:repoId/:projectId', handleHookCallback);
                server = app.listen(80, () => {
                    resolve();
                });
            });
        }).then(() => {
            // install hooks
            // TODO: remove delay put in to keep hooks from getting zap during
            //       nodemon restart
            return getServerAddress(db).delay(1000).then((host) => {
                return HookManager.installHooks(db, host);
            });
        }).then(() => {
            // listen for database change events
            var tables = [
                'project',
                'reaction',
                'server',
                'story',
                'system',
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
                    var repoLinks = _.filter(repo.external, { type: 'gitlab' });
                    var criteria = {
                        id: _.map(repoLinks, 'server_id'),
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
    return Shutdown.close(server).then(() => {
        if (database) {
            return getServerAddress(database).then((host) => {
                return HookManager.removeHooks(database, host);
            }).finally(() => {
                database.close();
                database = null;
            })
        }
    });
}

var taskQueue = new TaskQueue;

/**
 * Called when changes occurs in the database
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseChanges(events) {
    var db = database;
    Promise.each(events, (event) => {
        if (event.action === 'DELETE') {
            return;
        }
        switch (event.table) {
            case 'server': return handleServerChangeEvent(db, event);
            case 'project': return handleProjectChangeEvent(db, event);
            case 'story': return handleStoryChangeEvent(db, event);
            case 'reaction': return handleReactionChangeEvent(db, event);
            case 'system': return handleSystemChangeEvent(db, event);
        }
    });
}

/**
 * Import repos from server when API access is gained
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
function handleServerChangeEvent(db, event) {
    if (event.diff.settings) {
        var criteria = {
            id: event.id,
            type: 'gitlab',
            deleted: false,
        };
        return Server.findOne(db, 'global', criteria, '*').then((server) => {
            var accessToken = _.get(server, 'settings.api.access_token');
            var oauthBaseUrl = _.get(server, 'settings.oauth.base_url');
            if (!accessToken|| !oauthBaseUrl) {
                return;
            }
            return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                return RepoImporter.importRepositories(db, server);
            });
        });
    }
}

/**
 * Import events from repository when it's added to project and install
 * web hooks on Gitlab server
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
function handleProjectChangeEvent(db, event) {
    if (event.diff.repo_ids) {
        var repoIdsBefore = event.previous.repo_ids;
        var repoIdsAfter = event.current.repo_ids;
        var newRepoIds = _.difference(repoIdsAfter, repoIdsBefore);
        var missingRepoIds = _.difference(repoIdsBefore, repoIdsAfter);
        return Project.findOne(db, 'global', { id: event.id }, '*').then((project) => {
            return connectRepositories(db, project, newRepoIds).then(() => {
                return disconnectRepositories(db, project, missingRepoIds);
            });
        });
    }
}

/**
 * Establish connectio between project and repo, start importing events from
 * the latter
 *
 * @param {Database} db
 * @param {Project} project
 * @param {Array<Number} repoIds
 *
 * @return {Promise}
 */
function connectRepositories(db, project, repoIds) {
    if (!project || _.isEmpty(repoIds)) {
        return Promise.resolve();
    }
    return getServerAddress(db).then((host) => {
        // load the repos in question
        var criteria = {
            id: repoIds,
            type: 'gitlab',
            deleted: false
        };
        return Repo.find(db, 'global', criteria, '*').each((repo) => {
            var repoLinks = _.filter(repo.external, { type: 'gitlab' });
            var criteria = {
                id: _.map(repoLinks, 'server_id'),
                deleted: false
            };
            return Server.find(db, 'global', criteria, '*').each((server) => {
                // schedule event import
                taskQueue.schedule(`import_repo_events:${repo.id}`, () => {
                    // make sure the project-specific schema exists
                    return db.need(project.name).then(() => {
                        return EventImporter.importEvents(db, server, repo, project);
                    });
                });
                // install hook on repo
                return HookManager.installProjectHook(host, server, repo, project);
            });
        });
    });
}

/**
 * Remove connection between project and repo
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Array<Number>} repoIds
 *
 * @return {Promise}
 */
function disconnectRepositories(db, project, repoIds) {
    if (!project || _.isEmpty(repoIds)) {
        return Promise.resolve();
    }
    return getServerAddress(db).then((host) => {
        // load the repos in question
        var criteria = {
            id: repoIds,
            type: 'gitlab',
            deleted: false
        };
        return Repo.find(db, 'global', criteria, '*').each((repo) => {
            var repoLinks = _.filter(repo.external, { type: 'gitlab' });
            var criteria = {
                id: _.map(repoLinks, 'server_id'),
                deleted: false
            };
            return Server.findONe(db, 'global', criteria, '*').each((server) => {
                // remove hook on repo
                return HookManager.removeProjectHook(host, server, repo, project);
            });
        });
    });
}

/**
 * copy contents from story to issue tracker
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
function handleStoryChangeEvent(db, event) {
    var exporting = false;
    if (_.includes(StoryTypes.trackable, event.current.type)) {
        var storyLink = Import.Link.find(event.current);
        var issueLink = Import.Link.pick(storyLink, 'issue');
        if (event.current.published && event.current.ready) {
            if (issueLink) {
                if (!issueLink.id) {
                    exporting = true;
                } else {
                    if (event.diff.details) {
                        exporting = true;
                    }
                }
            }
        }
    }
    if (exporting) {
        return Story.findOne(db, event.schema, { id: event.id }, '*').then((story) => {
            return Project.findOne(db, 'global', { name: event.schema }, '*').then((project) => {
                return IssueExporter.exportStory(db, project, story);
            });
        });
    }
}

/**
 * Import comment to issue tracker
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
function handleReactionChangeEvent(db, event) {
}

/**
 * Adjust web-hooks when server address changes
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
function handleSystemChangeEvent(db, event) {
    if (event.diff.settings) {
        var hostBefore = (event.previous.settings) ? event.previous.settings.address : '';
        var hostAfter = event.current.settings.address;
        return HookManager.removeHooks(db, hostBefore).then(() => {
            return HookManager.installHooks(db, hostAfter);
        });
    }
}

/**
 * Called when another process posts synchronization requests
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseSyncRequests(events) {
    // TODO
    return;
    var db = database;
    Promise.each(events, (event) => {
        switch (event.table) {
            case 'project': return handleProjectSyncEvent(db, event);
            case 'repo': return handleRepoSyncEvent(db, event);
            case 'user': return handleUserSyncEvent(db, event);
        }
    });
}

/**
 * Make sure member lists are in sync
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
function handleProjectSyncEvent(db, event) {
    var criteria = event.criteria;
    return Project.find(db, 'global', criteria, '*').each((project) => {
        return taskQueue.schedule(`import_project_member:${project.id}`, () => {
            return UserImporter.importProjectMembers(db, project);
        });
    });
}

/**
 * Make sure information about repos is in sync
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
function handleRepoSyncEvent(db, event) {
    if (!event.criteria.hasOwnProperty('id')) {
        // an open-ended search was performed--see if there're new repos on Gitlab
        var criteria = { type: 'gitlab', deleted: false };
        return Server.find(db, 'global', criteria, '*').each((server) => {
            return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                return RepoImporter.importRepositories(db, server);
            });
        });
    } else {
        return Repo.find(db, 'global', event.criteria, '*').each((repo) => {
            var criteria = { id: repo.server_id, type: 'gitlab' };
            return Server.find(db, 'global', criteria, '*').each((server) => {
                return taskQueue.schedule(`update_repo:${repo.id}`, () => {
                    return RepoImporter.updateRepository(db, server, repo);
                });
            });
        });
    }
}

/**
 * Make sure information about imported users are in sync
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
function handleUserSyncEvent(db, event) {
    if (!event.criteria.hasOwnProperty('id')) {
        // an open-ended search was performed--see if there're new project members
        var criteria = { deleted: false };
        return Project.find(db, 'global', criteria, '*').each((project) => {
            return taskQueue.schedule(`import_project_member:$(project.id)`, () => {
                return UserImporter.importProjectMembers(db, project);
            });
        });
    } else {
        return User.find(db, 'global', event.criteria, '*').each((user) => {
            var criteria = { id: user.server_id, type: 'gitlab' };
            return Server.find(db, 'global', criteria, '*').each((server) => {
                return taskQueue.schedule(`update_user:${user.id}`, () => {
                    return UserImporter.updateUser(db, server, user);
                });
            });
        });
    }
}

/**
 * Called when Gitlab sends a notification
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleHookCallback(req, res) {
    var glHookEvent = req.body;
    var db = database;
    var serverP = Server.findOne(db, 'global', {
        id: parseInt(req.params.serverId),
        deleted: false
    }, '*');
    var repoP = Repo.findOne(db, 'global', {
        id: parseInt(req.params.repoId),
        deleted: false
    }, '*');
    var projectP = Project.findOne(db, 'global', {
        id: parseInt(req.params.projectId),
        deleted: false
    }, '*');
    return Promise.join(serverP, repoP, projectP, (server, repo, project) => {
        // make sure everything is in order first
        if (!repo || !project || !server) {
            return;
        }
        if (!_.includes(project.repo_ids, repo.id)) {
            return;
        }
        if (!Import.Link.find(repo, server)) {
            return;
        }
        return EventImporter.importHookEvent(db, server, repo, project, glHookEvent).then((story) => {
            if (story === false) {
                // hook event wasn't handled--scan activity log
                return taskQueue.schedule(`import_repo_events:${repo.id}`, () => {
                    return EventImporter.importEvents(db, server, repo, project, glHookEvent);
                });
            }
        });
    }).finally(() => {
        res.end();
    });
}

/**
 * Return the server location
 *
 * @param  {Database}
 *
 * @return {Promise<String>}
 */
function getServerAddress(db) {
    var criteria = { deleted: false };
    return System.findOne(db, 'global', criteria, 'settings').then((system) => {
        var address = _.get(system, 'settings.address');
        return _.trimEnd(address, ' /');
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
