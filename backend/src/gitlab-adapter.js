var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Express = require('express');
var BodyParser = require('body-parser');
var DNSCache = require('dnscache');
var Database = require('database');
var Shutdown = require('shutdown');
var TaskQueue = require('utils/task-queue');
var StoryTypes = require('objects/types/story-types');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var RepoAssociation = require('gitlab-adapter/repo-association');
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
var Task = require('accessors/task');
var User = require('accessors/user');

const USER_SCAN_INTERVAL = 10;

module.exports = {
    start,
    stop,
};

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
                app.post('/srv/gitlab/hook/:serverId', handleSystemHookCallback);
                app.post('/srv/gitlab/hook/:serverId/:repoId/:projectId', handleProjectHookCallback);
                server = app.listen(80, () => {
                    resolve();
                });
            });
        }).then(() => {
            // install hooks--after a short delay during development to keep
            // hooks from getting zapped while nodemon restarts
            var delay = (process.env.NODE_ENV === 'production') ? 0 : 2000;
            return getServerAddress(db).delay(delay).then((host) => {
                return HookManager.installHooks(db, host);
            });
        }).then(() => {
            // listen for database change events
            var tables = [
                'project',
                'server',
                'story',
                'system',
                'task',
            ];
            return db.listen(tables, 'change', handleDatabaseChanges, 100);
        }).then(() => {
            // update repo lists, in case they were added while Trambar is down
            var criteria = {
                type: 'gitlab',
                deleted: false
            };
            return Server.find(db, 'global', criteria, '*').each((server) => {
                if (hasAccessToken(server)) {
                    return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                        return RepoImporter.importRepositories(db, server);
                    });
                }
            });
        }).then(() => {
            // try importing events from all projects, as events could have
            // occurred while Trambar is down
            return RepoAssociation.find(db).each((a) => {
                var { server, repo, project } = a;
                return taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, () => {
                    return EventImporter.importEvents(db, server, repo, project);
                });
            });
        }).then(() => {
            startPeriodicUserScan();
            startPeriodicExportRetry();
        });
    });
}

function stop() {
    return Shutdown.close(server).then(() => {
        if (database) {
            stopPeriodicUserScan();
            stopPeriodicExportRetry();
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
            case 'system': return handleSystemChangeEvent(db, event);
            case 'task': return handleTaskChangeEvent(db, event);
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
    var criteria = {
        id: event.id,
        type: 'gitlab',
        deleted: false,
    };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        if (event.diff.settings) {
            if (hasAccessToken(server)) {
                return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server);
                });
            }
        }
        if (event.diff.deleted || event.diff.disabled) {
            if (hasAccessToken(server)) {
                return getServerAddress(db).then((host) => {
                    if (!event.current.deleted && !event.current.disabled) {
                        return HookManager.installServerHooks(db, host, server);
                    } else {
                        return HookManager.removeServerHooks(db, host, server);
                    }
                });
            }
        }
    });
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
    } else if (event.diff.archived || event.diff.deleted) {
        var offlineBefore = event.previous.archived || event.previous.deleted;
        var offlineAfter = event.current.archived || event.current.deleted;
        if (offlineBefore !== offlineAfter) {
            // remove or restore hooks
            return getServerAddress(db).then((host) => {
                return RepoAssociation.find(db, { id: event.id }).each((a) => {
                    var { server, repo, project } = a;
                    if (offlineAfter) {
                        return HookManager.removeProjectHook(host, server, repo, project);
                    } else {
                        return HookManager.installProjectHook(host, server, repo, project);
                    }
                });
            });
        }
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
            var repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
            var criteria = {
                id: repoLink.server_id,
                deleted: false
            };
            return Server.find(db, 'global', criteria, '*').each((server) => {
                // schedule event import
                taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, () => {
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
            var repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
            var criteria = {
                id: repoLink.server_id,
                deleted: false
            };
            return Server.find(db, 'global', criteria, '*').each((server) => {
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
    if (event.current.mtime === event.current.etime) {
        // change is caused by a prior export
        return;
    } else if (event.current.mtime === event.current.itime) {
        // change is caused by an import
        return;
    } else if (event.current.deleted) {
        return;
    } else if (event.current.type !== 'issue') {
        return;
    } else if (!event.diff.details) {
        return;
    }
    // look for the export task and run it again
    var schema = event.schema;
    return Story.findOne(db, schema, { id: event.id }, '*').then((story) => {
        var criteria = {
            type: 'export-issue',
            completion: 100,
            failed: false,
            options: {
                story_id: story.id,
            },
            deleted: false,
        };
        return Task.findOne(db, schema, criteria, 'id, user_id').then((task) => {
            if (task) {
                // reexport only if the exporting user is among the author
                if (_.includes(event.current.user_ids, task.user_id)) {
                    task.completion = 50;
                    return Task.saveOne(db, schema, task)
                }
            }
        });
    }).then((task) => {
        if (task) {
            return exportStory(db, schema, task.id).then((task) => {
                if (task.failed) {
                    queueExportRetry(schema, taskId);
                }
            });
        }
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
function handleTaskChangeEvent(db, event) {
    if (event.current.action !== 'export-issue') {
        return;
    }
    if (!event.diff.options) {
        return;
    }
    var schema = event.schema;
    if (schema === 'global') {
        return;
    }
    var taskId = event.id;
    return exportStory(db, schema, taskId).then((task) => {
        if (task.failed) {
            queueExportRetry(schema, taskId);
        }
    });
}

var exportPromises = [];

/**
 * Export a story to a repo associated with the project
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Number} taskId
 *
 * @return {Promise<Task>}
 */
function exportStory(db, schema, taskId) {
    var promise = Task.findOne(db, schema, { id: taskId }, '*').then((task) => {
        return Project.findOne(db, 'global', { name: schema }, '*').then((project) => {
            return System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
                return IssueExporter.exportStory(db, system, project, task);
            });
        }).then((story) => {
            task.completion = 100;
            task.failed = false;
            task.etime = new String('NOW()');
            delete task.details.error;
            if (story) {
                var issueLink = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
                _.assign(task.details, _.pick(issueLink, 'repo', 'issue'));
            }
            return Task.saveOne(db, schema, task);
        }).catch((err) => {
            console.error(err);
            task.details.error = _.pick(err, 'message', 'statusCode');
            task.failed = true;
            return Task.saveOne(db, schema, task);
        });
    }).finally(() => {
        _.pull(exportPromises, promise);
    });
    exportPromises.push(promise);
    return promise;
}

var exportRetryQueue = [];

/**
 * Add story to retry queue
 *
 * @param  {String} schema
 * @param  {Number} storyId
 * @param  {Number|undefined} delay
 * @param  {Number|undefined} attempts
 */
function queueExportRetry(schema, taskId, delay, attempts) {
    var time = new Date;
    if (!delay) {
        delay = 30 * 1000;
    }
    if (!attempts) {
        attempts = 1;
    }
    var existing = _.find(exportRetryQueue, { schema, taskId });
    if (existing) {
        // obviously, it has just failed again
        existing.time = time;
    } else {
        exportRetryQueue.push({ schema, taskId, delay, attempts, time })
    }
}

var exportRetryInterval;

/**
 * Start retrying failed export exports
 */
function startPeriodicExportRetry() {
    exportRetryInterval = setInterval(retryFailedExports, 10 * 1000);

    // look for story they have failed and put them into the queue
    var db = database;
    return RepoAssociation.find(db).then((list) => {
        return _.uniq(_.map(list, 'project'));
    }).each((project) => {
        // load export tasks that failed and try them again
        var schema = project.name;
        var criteria = {
            action: 'export-issue',
            complete: false,
            newer_than: Moment().startOf('day').subtract(3, 'day'),
        };
        return Task.find(db, schema, criteria, 'id').each((row) => {
            queueExportRetry(schema, row.id, 1 * 1000);
        });
    });
}

/**
 * Stop retrying export exports
 */
function stopPeriodicExportRetry() {
    exportRetryInterval = clearInterval(exportRetryInterval);
}

/**
 * Check export retry queue and schedule stories for export
 */
function retryFailedExports() {
    var db = database;
    var now = new Date;
    var ready = _.remove(exportRetryQueue, (entry) => {
        var elapsed = now - entry.time;
        return (elapsed > entry.delay);
    });
    _.each(ready, (entry) => {
        var { schema, taskId, delay, attempts } = entry;
        taskQueue.schedule(`retry_story_export:${taskId}`, () => {
            return exportStory(db, schema, taskId).catch((err) => {
                if (attempts < 10) {
                    // double the delay when it fails again
                    delay = Math.min(10 * 60 * 1000, delay * 2);
                    attempts++;
                    queueExportRetry(schema, taskId, delay, attempts);
                }
            });
        });
    });
}

/**
 * Wait for any ongoing export operations to complete
 *
 * @return {Promise}
 */
function waitForExports() {
    return Promise.all(exportPromises);
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
 * Called when Gitlab sends a notification about change to system
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSystemHookCallback(req, res) {
    var glHookEvent = req.body;
    var db = database;
    var serverId = parseInt(req.params.serverId);
    return Server.findOne(db, 'global', { id: serverId, deleted: false }, '*').then((server) => {
        switch (glHookEvent.event_name) {
            case 'project_create':
            case 'project_destroy':
            case 'project_rename':
            case 'project_transfer':
            case 'project_update':
            case 'user_add_to_team':
            case 'user_remove_from_team':
                return taskQueue.schedule(`import_system_events:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server);
                });
            case 'user_create':
            case 'user_destroy':
                return taskQueue.schedule(`import_system_events:${server.id}`, () => {
                    return UserImporter.importUsers(db, server);
                });
        }
    }).catch((err) => {
        console.error(err);
    }).finally(() => {
        res.end();
    });
}

/**
 * Called when Gitlab sends a notification about change to repo
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleProjectHookCallback(req, res) {
    var glHookEvent = req.body;
    var db = database;
    var criteria = {
        server_id: parseInt(req.params.serverId),
        repo_id: parseInt(req.params.repoId),
        project_id: parseInt(req.params.projectId),
    };
    return RepoAssociation.findOne(db, criteria).then((a) => {
        var { server, repo, project } = a;
        return waitForExports().then(() => {
            return EventImporter.importHookEvent(db, server, repo, project, glHookEvent).then((story) => {
                if (story === false) {
                    // hook event wasn't handled--scan activity log
                    return taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, () => {
                        return EventImporter.importEvents(db, server, repo, project, glHookEvent);
                    });
                }
            });
        });
    }).catch((err) => {
        console.error(err);
    }).finally(() => {
        res.end();
    });
}

var userScanInterval;

/**
 * Start reimporting users periodically
 */
function startPeriodicUserScan() {
    userScanInterval = setInterval(reimportUsers, USER_SCAN_INTERVAL * 60 * 1000);
}

/**
 * Stop reimporting users periodically
 */
function stopPeriodicUserScan() {
    userScanInterval = clearInterval(userScanInterval);
}

/**
 * Reimport users from all GitLab servers
 */
function reimportUsers() {
    var db = database;
    var criteria = {
        type: 'gitlab',
        deleted: false,
        disabled: false,
    };
    return Server.find(db, 'global', criteria, '*').each((server) => {
        return taskQueue.schedule(`reimport_user:${server.id}`, () => {
            return UserImporter.importUsers(db, server);
        });
    });
}

/**
 * Return true if the server object contains an access token
 *
 * @param  {Server}  server
 *
 * @return {Boolean}
 */
function hasAccessToken(server) {
    var accessToken = _.get(server, 'settings.api.access_token');
    var oauthBaseURL = _.get(server, 'settings.oauth.base_url');
    return (accessToken && oauthBaseURL);
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

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
