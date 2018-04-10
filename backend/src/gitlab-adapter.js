var _ = require('lodash');
var Promise = require('bluebird');
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
                app.post('/srv/gitlab/hook/:serverId/:repoId/:projectId', handleHookCallback);
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
                'reaction',
                'server',
                'story',
                'system',
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
            if (hasAccessToken(server)) {
                return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                    return RepoImporter.importRepositories(db, server);
                });
            }
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
    }
    if (event.current.mtime === event.current.itime) {
        // change is caused by an import
        return;
    }
    if (event.current.deleted) {
        return;
    }
    var exporting = false;
    if (event.current.type === 'issue') {
        if (event.diff.details) {
            // title or labels might have changed
            exporting = true;
        } else if (event.diff.external) {
            // issue might have been moved or deleted
            exporting = true;
        }
    } else if (_.includes(StoryTypes.trackable, event.current.type)) {
        if (event.current.published && event.current.ready) {
            var issueLink = ExternalDataUtils.findLinkByServerType(event.current, 'gitlab');
            if (issueLink) {
                // a story that with a unrealized issue link (id = 0)
                exporting = true;
            }
        }
    }
    if (!exporting) {
        return;
    }
    var promise = Story.findOne(db, event.schema, { id: event.id }, '*').then((story) => {
        return Project.findOne(db, 'global', { name: event.schema }, '*').then((project) => {
            return System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
                console.log(`Exporting story ${story.id}`);
                return IssueExporter.exportStory(db, system, project, story);
            });
        });
    }).catch((err) => {
        console.error(err);
        return null;
    }).finally(() => {
        _.pull(exportPromises, promise);
    });
    exportPromises.push(promise);
    return promise;
}

var exportPromises = [];

/**
 * Wait for any ongoing export operations to complete
 *
 * @return {Promise}
 */
function waitForExports() {
    return Promise.all(exportPromises);
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
 * Called when Gitlab sends a notification
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleHookCallback(req, res) {
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
