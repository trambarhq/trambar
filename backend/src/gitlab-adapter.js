var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Express = require('express');
var BodyParser = require('body-parser');
var DNSCache = require('dnscache');
var Database = require('database');
var Shutdown = require('shutdown');
var TaskQueue = require('utils/task-queue').default;
var StoryTypes = require('objects/types/story-types');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var RepoAssociation = require('gitlab-adapter/repo-association');
var HookManager = require('gitlab-adapter/hook-manager');
var EventImporter = require('gitlab-adapter/event-importer');
var RepoImporter = require('gitlab-adapter/repo-importer');
var UserImporter = require('gitlab-adapter/user-importer');
var MilestoneImporter = require('gitlab-adapter/milestone-importer');
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
            if (process.env.NODE_ENV !== 'production') {
                // reduce the chance that operations will overlap on nodemon restart
                return Promise.delay(3000);
            }
        }).then(() => {
            return startPeriodicTasks();
        });
    });
}

function stop() {
    return Shutdown.close(server).then(() => {
        if (database) {
            return stopPeriodicTasks().finally(() => {
                database.close();
                database = null;
            });
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
    };
    return Server.findOne(db, 'global', criteria, '*').then((server) => {
        if (event.diff.settings) {
            if (hasAccessToken(server)) {
                return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server).catch((err) => {
                        console.error(err.message);
                    });
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
                        return System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
                            return EventImporter.importEvents(db, system, server, repo, project);
                        });
                    });
                });
                // install hook on repo
                return HookManager.installProjectHook(host, server, repo, project);
            });
        });
    }).catch((err) => {
        console.error(err.message);
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
                    return Task.saveOne(db, schema, task).then((task) => {
                        return exportStory(db, schema, task);
                    });
                }
            }
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
    if (event.current.deleted) {
        return;
    }
    return Task.findOne(db, schema, { id: event.id, deleted: false }, '*').then((task) => {
        if (task) {
            return exportStory(db, schema, task);
        }
    });
}

/**
 * Export a story to a repo associated with the project
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Task} task
 *
 * @return {Promise<Task>}
 */
function exportStory(db, schema, task) {
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
        task.details.error = _.pick(err, 'message', 'statusCode');
        task.failed = true;
        if (err.statusCode >= 400 && err.statusCode <= 499) {
            // stop trying
            task.deleted = true;
        }
        return Task.saveOne(db, schema, task).throw(err);
    }).catch((err) => {
        console.error(err.message);
    });
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
        }).catch((err) => {
            console.error(err.message);
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
        HookManager.verifyHookRequest(req);

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
        console.error(err.message);
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
        HookManager.verifyHookRequest(req);

        var ts = Moment().valueOf();
        var { server, repo, project } = a;
        return taskQueue.schedule(`import_hook_event:${repo.id}-${project.id}-${ts}`, () => {
            return System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
                return EventImporter.importHookEvent(db, system, server, repo, project, glHookEvent).then((story) => {
                    if (story === false) {
                        // hook event wasn't handled--scan activity log
                        return taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, () => {
                            return EventImporter.importEvents(db, system, server, repo, project, glHookEvent).catch((err) => {
                                console.error(err.message);
                            });
                        });
                    }
                });
            });
        });
    }).catch((err) => {
        console.error(err.message);
    }).finally(() => {
        res.end();
    });
}

/**
 * Install web hooks
 *
 * @return {Promise}
 */
function startHookMaintenance() {
    var db = database;
    return getServerAddress(db).then((host) => {
        return HookManager.installHooks(db, host);
    }).catch((err) => {
        console.error(err.message);
    });
}

/**
 * Attempt to install hooks that fail previous
 *
 * @return {null}
 */
function performPeriodicHookMaintenance() {
    var db = database;
    return getServerAddress(db).then((host) => {
        return HookManager.installFailedHooks(db, host);
    }).catch((err) => {
        console.error(err.message);
    });
}

/**
 * Remove web hooks
 *
 * @return {Promise}
 */
function stopHookMaintenance() {
    return getServerAddress(database).then((host) => {
        return HookManager.removeHooks(database, host);
    }).catch((err) => {
        console.error(err.message);
    });
}

/**
 * Reimport repos from all servers
 *
 * @return {null}
 */
function performPeriodicRepoImport() {
    var db = database;
    var criteria = {
        type: 'gitlab',
        disabled: false,
        deleted: false
    };
    Server.find(db, 'global', criteria, '*').each((server) => {
        if (hasAccessToken(server)) {
            return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                return RepoImporter.importRepositories(db, server).catch((err) => {
                    console.error(err.message);
                });
            });
        }
    });
    return null;
}

/**
 * Import events from all repos
 *
 * @return {null}
 */
function performPeriodicEventImport() {
    var db = database;
    System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
        RepoAssociation.find(db).each((a) => {
            var { server, repo, project } = a;
            return taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, () => {
                return EventImporter.importEvents(db, system, server, repo, project).catch((err) => {
                    console.error(err.message);
                });
            });
        });
    });
    return null;
}

/**
 * Reimport users from all GitLab servers
 *
 * @return {null}
 */
function performPeriodicUserImport() {
    var db = database;
    var criteria = {
        type: 'gitlab',
        deleted: false,
        disabled: false,
    };
    Server.find(db, 'global', criteria, '*').each((server) => {
        if (hasAccessToken(server)) {
            return taskQueue.schedule(`import_users:${server.id}`, () => {
                return UserImporter.importUsers(db, server).catch((err) => {
                    console.error(err.message);
                });
            });
        }
    });
    return null;
}

/**
 * Scan milestones for change
 *
 * @return {null}
 */
function performPeriodicMilestoneUpdate() {
    var db = database;
    System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
        if (!system) {
            return;
        }
        return RepoAssociation.find(db).each((a) => {
            var { server, repo, project } = a;
            return taskQueue.schedule(`update_milestones:${server.id}-${project.id}-${repo.id}`, () => {
                return MilestoneImporter.updateMilestones(db, system, server, repo, project).catch((err) => {
                    console.error(err.message);
                });
            });
        });
    });
    return null;
}

/**
 * Start retrying failed export exports
 *
 * @return {null}
 */
function performPeriodicExportRetry() {
    // look for story they have failed and put them into the queue
    var db = database;
    RepoAssociation.find(db).then((list) => {
        return _.uniq(_.map(list, 'project'));
    }).each((project) => {
        // load export tasks that failed and try them again
        var schema = project.name;
        var criteria = {
            action: 'export-issue',
            complete: false,
            newer_than: Moment().startOf('day').subtract(3, 'day'),
            deleted: false,
        };
        return Task.find(db, schema, criteria, '*').each((task) => {
            taskQueue.schedule(`export_story:${task.id}`, () => {
                return exportStory(db, schema, task);
            });
        });
    });
    return null;
}

const SEC = 1000;
const MIN = 60 * SEC;

var periodicTasks = [
    {
        name: 'import-users',
        every: 5 * MIN,
        delay: 1 * MIN,
        start: performPeriodicUserImport,
        run: performPeriodicUserImport,
    },
    {
        name: 'import-repos',
        every: 5 * MIN,
        delay: 2 * MIN,
        start: performPeriodicRepoImport,
        run: performPeriodicRepoImport,
    },
    {
        name: 'import-events',
        every: 1 * MIN,
        delay: 0,
        start: performPeriodicEventImport,
        run: performPeriodicEventImport,
    },
    {
        name: 'install-hooks',
        every: 1 * MIN,
        delay: 0,
        start: startHookMaintenance,
        run: performPeriodicHookMaintenance,
        stop: stopHookMaintenance,
    },
    {
        name: 'update-milestones',
        every: 5 * MIN,
        delay: 3 * MIN,
        start: performPeriodicMilestoneUpdate,
        run: performPeriodicMilestoneUpdate,
    },
    {
        name: 'retry-failed-issue-export',
        every: 5 * MIN,
        delay: 0,
        start: performPeriodicExportRetry,
        run: performPeriodicExportRetry,
    }
];
var periodicTasksInterval;
var periodicTasksLastRun;

/**
 * Start periodic tasks
 */
function startPeriodicTasks() {
    return Promise.each(periodicTasks, (task) => {
        task.delay += task.every;
        return Promise.try(() => {
            if (task.start) {
                return task.start();
            }
        }).catch((err) => {
            console.error(err.message);
        });
    }).finally(() => {
        periodicTasksLastRun = Moment();
        periodicTasksInterval = setInterval(runPeriodicTasks, 5 * 1000);
    });
}

/**
 * Decrement delay counters and run tasks on reaching zero
 *
 * @return {null}
 */
function runPeriodicTasks() {
    var now = Moment();
    var elapsed = now - periodicTasksLastRun;
    periodicTasksLastRun = now;
    var readyTasks = _.filter(periodicTasks, (task) => {
        task.delay -= elapsed;
        if (task.delay <= 0) {
            task.delay = task.every;
            return true;
        }
    });
    Promise.each(readyTasks, (task) => {
        return Promise.try(() => {
            if (task.run) {
                return task.run();
            }
        }).catch((err) => {
            console.error(err.message);
        });
    });
    return null;
}

/**
 * Stop periodic tasks
 */
function stopPeriodicTasks() {
    periodicTasksInterval = clearInterval(periodicTasksInterval);

    return Promise.each(periodicTasks, (task) => {
        return Promise.try(() => {
            if (task.stop) {
                return task.stop();
            }
        }).catch((err) => {
            console.error(err.message);
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
    return !!(accessToken && oauthBaseURL);
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
    Shutdown.on(stop);
}
