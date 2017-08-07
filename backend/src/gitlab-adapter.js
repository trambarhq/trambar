var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Request = require('request');
var Moment = require('moment');
var Database = require('database');
var TaskQueue = require('utils/task-queue');
var Async = require('utils/async-do-while');
var HttpError = require('errors/http-error');

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
        var tables = [
            'project',
            'reaction',
            'server',
            'story',
        ];
        return db.listen(tables, 'change', handleDatabaseChanges, 100).then(() => {
            var app = Express();
            app.use(BodyParser.json());
            app.set('json spaces', 2);
            app.get('/gitlab/hook/:repoId/:projectId', handleHookCallback);
            server = app.listen(80);
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
    var db = database;
    _.each(events, (event) => {
        if (event.table === 'server') {
            // import users, roles, and repos from server
            if (event.diff.details) {
                taskQueue.schedule(() => {
                    var serverId = event.id;
                    return Server.findOne(db, 'global', { id: serverId }, '*').then((server) => {
                        if (server.type === 'gitlab') {
                            if (!server.details.url || !server.details.credentials) {
                                return;
                            }
                            return importRepositories(db, server).then(() => {
                                return importUsers(db, server);
                            });
                        }
                    });
                });
            }
        } else if (event.table === 'project') {
            // import events from repository when it's added to project
            if (event.diff.repo_ids) {
                var projectId = event.id;
                var repoIdsBefore = event.diff.repo_ids[0];
                var repoIdsAfter = event.diff.repo_ids[1];
                var newRepoIds = _.difference(repoIdsBefore, repoIdsAfter);
                _.each(newRepoIds, (repoId) => {
                    taskQueue.schedule(() => {
                        var db = database;
                        return Repo.find(db, 'global', { id: repoId }, '*').then((repo) => {
                            return Project.find(db, 'global', { id: projectId }, '*').then((project) => {
                                if (!repo || !project) {
                                    return;
                                }
                                return Server.find(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                    return importEvents(db, server, repo, project);
                                });
                            });
                        });
                    });
                });
            }
        } else if (event.table === 'story') {
            // copy contents from story to issue tracker
            var storyId = event.id;
            Story.find(db, event.schema, { id: storyId }, '*').then((story) => {
                var issueTracking = story.details.issue_tracking;
                var repoId = story.repo_id;
                var issueId = story.issue_id;
                if (issueTracking && repoId) {
                    taskQueue.schedule(() => {
                        return Repo.find(db, 'global', { id: repoId }, '*').then((repo) => {
                            return Project.find(db, 'global', { name: schema }, '*').then((project) => {
                                if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                                    return;
                                }
                                return Server.find(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                    exportStory(project, reaction, server, repo, issueId);
                                });
                            });
                        });
                    });
                }
            });
        } else if (event.table === 'reaction') {
            // add comments to issue tracker
            var schema = event.schema;
            var reactionId = event.id;
            Reaction.find(db, schema, { id: reactionId }, '*').then((reaction) => {
                if (!reaction || !reaction.ptime || reaction.type !== 'comment') {
                    return;
                }
                return Story.find(db, event.schema, { id: story_id }, '*').then((story) => {
                    var repoId = story.repo_id;
                    var issueId = story.issue_id;
                    if (repoId && issueId) {
                        taskQueue.schedule(() => {
                            return Repo.find(db, 'global', { id: repoId }, '*').then((repo) => {
                                return Project.find(db, 'global', { name: schema }, '*').then((project) => {
                                    if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                                        return;
                                    }
                                    return Server.find(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                        exportComment(project, reaction, server, repo, issueId);
                                    });
                                });
                            });
                        });
                    }
                });
            });
        }
    });
}

function handleHookCallback(req, res) {
    var repoId = req.params.repoId;
    var projectId = req.params.projectId;
    var message = req.body;
    taskQueue.schedule(() => {
        var db = database;
        return Repo.find(db, 'global', { id: repoId }, '*').then((repo) => {
            return Project.find(db, 'global', { id: projectId }, '*').then((project) => {
                if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                    return;
                }
                return Server.find(db, 'global', { id: repo.server_id }, '*').then((server) => {
                    if (msg.body.object_kind === 'note') {
                        return importComments(db, server, repo, message, project);
                    } else {
                        return importEvents(db, server, repo, project);
                    }
                });
            });
        });
    });
    res.end();
}

/**
 * Import repositories from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Repo>>}
 */
function importRepositories(db, server) {
    var url = `/projects`;
    return fetch(server, url).then((projects) => {
        return Repo.find(db, 'global', { server_id: server.id }, '*').then((repos) => {
            var fields = [
                'name',
                'ssh_url',
                'http_url',
                'web_url',
                'issues_enabled',
                'archived',
            ];
            var changes = [];
            var imported = {};
            _.each(repos, (repo) => {
                var project = _.find(projects, { id: repo.external_id });
                if (project) {
                    var detailsBefore = repo.details;
                    repo.details = _.pick(project, fields);
                    if (repo.deleted !== false || !_.isEqual(repo.details, detailsBefore)) {
                        repo.deleted = false;
                        changes.push(repo);
                    }
                    imported[project.id] = true;
                } else {
                    if (repo.deleted !== true) {
                        repo.deleted = true;
                        changes.push(repo);
                    }
                }
            });
            _.each(projects, (project) => {
                if (!imported[project.id]) {
                    var repo = {
                        server_id: server.id,
                        external_id: project.id,
                        type: 'gitlab',
                        details: _.pick(project, fields),
                    };
                    changes.push(repo);
                }
            });
            return Repo.save(db, 'global', changes);
        });
    });
}

/**
 * Import users from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<User>>}
 */
function importUsers(db, server) {
    var url = `/users`;
    return fetch(server, url).then((accounts) => {
        return User.find(db, 'global', { server_id: server.id }, '*').then((users) => {
            var changes = [];
            var imported = {};
            _.each(users, (user) => {
                var account = _.find(accounts, { id: user.external_id });
                if (account) {
                    var detailsBefore = user.details;
                    user.details = _.assign(_.clone(user.details), _.pick(account, 'web_url'));
                    if (user.deleted !== false || !_.isEqual(user.details, detailsBefore)) {
                        user.deleted = false;
                        changes.push(user);
                    }
                    imported[account.id] = true;
                } else {
                    if (user.deleted !== true) {
                        user.deleted = true;
                        changes.push(user);
                    }
                }
            });
            _.each(accounts, (account) => {
                if (!imported[account.id]) {
                    var details = {
                        name: account.name,
                        web_url: account.web_url,
                    };
                    var nameParts = _.split(account.name, /\s+/);
                    if (nameParts.length >= 2) {
                        details.first_name = _.first(nameParts);
                        details.last_name = _.last(nameParts);
                    }
                    if (account.skype) {
                        details.skype_name = account.skype;
                    }
                    if (account.twitter) {
                        details.twiter_name = account.twitter;
                    }
                    if (account.linkedin) {
                        account.linkedin_name = account.linkedin_name;
                    }
                    var user = {
                        server_id: server.id,
                        external_id: account.id,
                        type: 'member',
                        emails: [ account.email ],
                        details,
                    };
                    changes.push(user);
                }
            });
            return User.save(db, 'global', changes);
        });
    });
}

/**
 * Import a users from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Number} gitlabUserId
 *
 * @return {Promise<User>}
 */
function importUser(db, server, gitlabUserId) {
    var url = `/users/${gitlabUserId}`;
    return fetch(server, url).then((account) => {
        console.log(account);
    });
}

/**
 * Find user with user id, importing the user if it's not t
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Number} gitlabUserId
 *
 * @return {Promise<User>}
 */
function findUser(db, server, gitlabUserId) {
    var criteria = {
        server_id: server_id,
        external_id: gitlabUserId,
    };
    return User.findOne(db, 'global', criteria, '*').then((user) => {
        if (user) {
            return user;
        } else {
            return importUser(db, server, gitlabUserId);
        }
    });
}

function findLastEventTime(db, project, repo) {
    var criteria = {
        repo_id: repo.id,
        ready: true,
    };
    return Story.findOne(db, project.name, criteria, 'MAX(ptime) AS time').then((row) => {
        return (row) ? row.time : null;
    })
}

/**
 * Retrieve activity log entries from Gitlab server and turn them into stories
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importEvents(db, server, repo, project) {
    return findLastEventTime(db, project, repo).then((lastEventTime) => {
        var url = `/projects/${repo.details.gitlab_id}/events`;
        var query = {
            sort: 'asc',
            per_page: 50,
            page: 1,
        };
        if (lastEventTime) {
            query.after = lastEventTime.format('YYYY-MM-DD');
        }
        var done = false;
        Async.do(() => {
            return fetch(server, url, query).then((events) => {
                events = _.filter(events, (event) => {
                    return Moment(event.created_at) > lastEventTime;
                });
                return Promise.each(events, (event) => {
                    return importEvent(db, server, repo, event, project);
                }).then(() => {
                    if (events.length === query.per_page) {
                        query.page++;
                    } else {
                        done = true;
                    }
                });
            });
        });
        Async.while(() => {
            return !done;
        });
        return Async.end();
    });
}

/**
 * Import an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importEvent(db, server, repo, event, project) {
    return findUser(db, server, event.author_id).then((author) => {
        if (!author) {
            return;
        }
        switch (event.target_type) {
            case 'Issue':
                return importIssueEvent(db, server, repo, event, author, project);
            case 'Milestone':
                return importMilestoneEvent(db, server, repo, event, author, project);
            case 'MergeRequest':
                return importMergeRequestEvent(db, server, repo, event, author, project);
        }
        switch (event.action) {
            case 'deleted':
            case 'created':
            case 'imported':
                return importRepoEvent(db, server, repo, event, author, project);
            case 'joined':
                return importMembershipEvent(db, server, repo, event, author, project);
            case 'pushed new':
            case 'pushed to':
                return importPushEvent(db, server, repo, event, author, project);
        }
    });
}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importIssueEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMilestoneEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMergeRequestEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importRepoEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importPushEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMembershipEvent(db, server, repo, event, author, project) {

}

/**
 * Import comments
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} msg
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importComments(db, server, repo, msg, project) {
    if (msg.commit) {
        return importCommitComments(db, server, repo, msg.commit, project);
    } else if (msg.issue) {
        return importIssueComments(db, server, repo, msg.issue, project);
    } else if (msg.merge_request) {
        return importMergeRequestComments(db, server, repo, msg.merge_request, project);
    }
}

function installProjectHooks(db, project) {

}

function fetch(server, uri, query) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: server.details.url,
            headers: {
                'PRIVATE-TOKEN': server.details.credentials.token,
            },
            qs: query,
            uri,
        };
        Request.get(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

function post(server, uri, payload) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: server.details.url,
            headers: {
                'PRIVATE-TOKEN': server.details.credentials.token,
            },
            uri,
        };
        Request.post(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
