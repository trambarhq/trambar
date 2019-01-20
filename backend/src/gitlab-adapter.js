import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import Express from 'express';
import BodyParser from 'body-parser';
import DNSCache from 'dnscache';
import Database from 'database';
import * as Shutdown from 'shutdown';
import TaskQueue from 'utils/task-queue';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as RepoAssociation from 'gitlab-adapter/repo-association';
import * as HookManager from 'gitlab-adapter/hook-manager';
import * as EventImporter from 'gitlab-adapter/event-importer';
import * as RepoImporter from 'gitlab-adapter/repo-importer';
import * as UserImporter from 'gitlab-adapter/user-importer';
import * as MilestoneImporter from 'gitlab-adapter/milestone-importer';
import * as IssueExporter from 'gitlab-adapter/issue-exporter';

// accessors
import Project from 'accessors/project';
import Reaction from 'accessors/reaction';
import Repo from 'accessors/repo';
import Server from 'accessors/server';
import Story from 'accessors/story';
import System from 'accessors/system';
import Task from 'accessors/task';
import User from 'accessors/user';

let server;
let database;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
    let db = database = await Database.open(true);
    await db.need('global');

    // listen for Webhook invocation
    let app = Express();
    app.use(BodyParser.json());
    app.set('json spaces', 2);
    app.post('/srv/gitlab/hook/:serverId', handleSystemHookCallback);
    app.post('/srv/gitlab/hook/:serverId/:repoId/:projectId', handleProjectHookCallback);
    server = app.listen(80);

    // listen for database change events
    let tables = [
        'project',
        'server',
        'story',
        'system',
        'task',
    ];
    await db.listen(tables, 'change', handleDatabaseChanges, 100);
    if (process.env.NODE_ENV !== 'production') {
        // reduce the chance that operations will overlap on nodemon restart
        await Promise.delay(3000);
    }
    startPeriodicTasks();
}

async function stop() {
    await Shutdown.close(server);
    if (database) {
        await stopPeriodicTasks();
        database.close();
        database = null;
    }
}

let taskQueue = new TaskQueue;

/**
 * Called when changes occurs in the database
 *
 * @param  {Array<Object>} events
 */
async function handleDatabaseChanges(events) {
    let db = database;
    for (let event of events) {
        if (event.action === 'DELETE') {
            continue;
        }
        try {
            switch (event.table) {
                case 'server':
                    await handleServerChangeEvent(db, event);
                    break;
                case 'project':
                    await handleProjectChangeEvent(db, event);
                    break;
                case 'story':
                    await handleStoryChangeEvent(db, event);
                    break;
                case 'system':
                    await handleSystemChangeEvent(db, event);
                    break;
                case 'task':
                    await handleTaskChangeEvent(db, event);
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    }
}

/**
 * Import repos from server when API access is gained
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
async function handleServerChangeEvent(db, event) {
    let criteria = {
        id: event.id,
        type: 'gitlab',
    };
    let server = Server.findOne(db, 'global', criteria, '*');
    if (event.diff.settings) {
        if (hasAccessToken(server)) {
            return taskQueue.schedule(`import_server_repos:${server.id}`, () => {
                return RepoImporter.importRepositories(db, server);
            });
        }
    }
    if (event.diff.deleted || event.diff.disabled) {
        if (hasAccessToken(server)) {
            let host = await getServerAddress(db);
            if (!event.current.deleted && !event.current.disabled) {
                await HookManager.installServerHooks(db, host, server);
            } else {
                await HookManager.removeServerHooks(db, host, server);
            }
        }
    }
}

/**
 * Import events from repository when it's added to project and install
 * web hooks on Gitlab server
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
async function handleProjectChangeEvent(db, event) {
    if (event.diff.repo_ids) {
        let repoIdsBefore = event.previous.repo_ids;
        let repoIdsAfter = event.current.repo_ids;
        let newRepoIds = _.difference(repoIdsAfter, repoIdsBefore);
        let missingRepoIds = _.difference(repoIdsBefore, repoIdsAfter);
        let project = await Project.findOne(db, 'global', { id: event.id }, '*');
        if (project) {
            if (!_.isEmpty(newRepoIds)) {
                await connectRepositories(db, project, newRepoIds);
            }
            if (!_.isEmpty(missingRepoIds)) {
                await disconnectRepositories(db, project, missingRepoIds)
            }
        }
    } else if (event.diff.archived || event.diff.deleted) {
        let offlineBefore = event.previous.archived || event.previous.deleted;
        let offlineAfter = event.current.archived || event.current.deleted;
        if (offlineBefore !== offlineAfter) {
            // remove or restore hooks
            let host = await getServerAddress(db);
            let criteria = { server: { id: event.id } };
            let list = await RepoAssociation.find(db, criteria);
            for (let { server, repo, project } of list) {
                if (offlineAfter) {
                    await HookManager.removeProjectHook(host, server, repo, project);
                } else {
                    await HookManager.installProjectHook(host, server, repo, project);
                }
            }
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
async function connectRepositories(db, project, repoIds) {
    let host = await getServerAddress(db);
    // load the repos in question
    let criteria = {
        id: repoIds,
        type: 'gitlab',
        deleted: false
    };
    let repos = await Repo.find(db, 'global', criteria, '*');
    for (let repo of repos) {
        let repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
        let criteria = {
            id: repoLink.server_id,
            deleted: false
        };
        let server = await Server.find(db, 'global', criteria, '*');
        // schedule event import
        taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, async () => {
            // make sure the project-specific schema exists
            await db.need(project.name);
            let system = await System.findOne(db, 'global', { deleted: false }, '*');
            return EventImporter.importEvents(db, system, server, repo, project);
        });
        // install hook on repo
        await HookManager.installProjectHook(host, server, repo, project);
    }
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
async function disconnectRepositories(db, project, repoIds) {
    let host = await getServerAddress(db);
    // load the repos in question
    let criteria = {
        id: repoIds,
        type: 'gitlab',
        deleted: false
    };
    let repo = await Repo.find(db, 'global', criteria, '*');
    let repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    let criteria = {
        id: repoLink.server_id,
        deleted: false
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    for (let server of servers) {
        // remove hook on repo
        await HookManager.removeProjectHook(host, server, repo, project);
    }
}

/**
 * copy contents from story to issue tracker
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
async function handleStoryChangeEvent(db, event) {
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
    let schema = event.schema;
    let story = await Story.findOne(db, schema, { id: event.id }, '*');
    let taskCriteria = {
        type: 'export-issue',
        completion: 100,
        failed: false,
        options: {
            story_id: story.id,
        },
        deleted: false,
    };
    let task = await Task.findOne(db, schema, taskCriteria, 'id, user_id');
    if (task) {
        // reexport only if the exporting user is among the author
        if (_.includes(event.current.user_ids, task.user_id)) {
            task.completion = 50;
            task = await Task.saveOne(db, schema, task);
            await exportStory(db, schema, task);
        }
    }
}

/**
 * copy contents from story to issue tracker
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise|undefined}
 */
async function handleTaskChangeEvent(db, event) {
    if (event.current.action !== 'export-issue') {
        return;
    }
    if (!event.diff.options) {
        return;
    }
    let schema = event.schema;
    if (schema === 'global') {
        return;
    }
    if (event.current.deleted) {
        return;
    }
    let task = await Task.findOne(db, schema, { id: event.id, deleted: false }, '*');
    if (task) {
        await exportStory(db, schema, task);
    }
}

/**
 * Export a story to a repo associated with the project
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Task} task
 *
 * @return {Promise}
 */
async function exportStory(db, schema, task) {
    try {
        let project = await Project.findOne(db, 'global', { name: schema }, '*');
        let system = await System.findOne(db, 'global', { deleted: false }, '*');
        let story = await IssueExporter.exportStory(db, system, project, task);
        task.completion = 100;
        task.failed = false;
        task.etime = new String('NOW()');
        delete task.details.error;
        if (story) {
            let issueLink = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
            _.assign(task.details, _.pick(issueLink, 'repo', 'issue'));
        }
        await Task.saveOne(db, schema, task);
    } catch (err) {
        task.details.error = _.pick(err, 'message', 'statusCode');
        task.failed = true;
        if (err.statusCode >= 400 && err.statusCode <= 499) {
            // stop trying
            task.deleted = true;
        }
        await Task.saveOne(db, schema, task)
        throw err;
    }
}

/**
 * Adjust web-hooks when server address changes
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise}
 */
async function handleSystemChangeEvent(db, event) {
    if (event.diff.settings) {
        let hostBefore = (event.previous.settings) ? event.previous.settings.address : '';
        let hostAfter = event.current.settings.address;
        if (hostBefore !== hostAfter) {
            if (hostBefore) {
                await HookManager.removeHooks(db, hostBefore);
            }
            if (hostAfter) {
                await HookManager.installHooks(db, hostAfter);
            }
        }
    }
}

/**
 * Called when Gitlab sends a notification about change to system
 *
 * @param  {Request} req
 * @param  {Response} res
 *
 * @return {Promise}
 */
async function handleSystemHookCallback(req, res) {
    try {
        HookManager.verifyHookRequest(req);

        let glHookEvent = req.body;
        let db = database;
        let serverId = parseInt(req.params.serverId);
        let server = await Server.findOne(db, 'global', { id: serverId, deleted: false }, '*');
        switch (glHookEvent.event_name) {
            case 'project_create':
            case 'project_destroy':
            case 'project_rename':
            case 'project_transfer':
            case 'project_update':
            case 'user_add_to_team':
            case 'user_remove_from_team':
                taskQueue.schedule(`import_system_events:${server.id}`, async () => {
                    return RepoImporter.importRepositories(db, server);
                });
                break;
            case 'user_create':
            case 'user_destroy':
                taskQueue.schedule(`import_system_events:${server.id}`, async () => {
                    return UserImporter.importUsers(db, server);
                });
                break;
        }
    } catch (err) {
        console.error(err);
    } finally {
        res.end();
    }
}

/**
 * Called when Gitlab sends a notification about change to repo
 *
 * @param  {Request} req
 * @param  {Response} res
 *
 * @return {Promise}
 */
async function handleProjectHookCallback(req, res) {
    try {
        HookManager.verifyHookRequest(req);

        let glHookEvent = req.body;
        let db = database;
        let criteria = {
            server: {
                id: parseInt(req.params.serverId),
                deleted: false,
                disabled: false,
            },
            repo: {
                id: parseInt(req.params.repoId),
                deleted: false
            },
            project: {
                id: parseInt(req.params.projectId),
                deleted: false,
                disabled: false,
            },
        };
        let { server, repo, project } = await RepoAssociation.findOne(db, criteria);
        let ts = Moment().valueOf();
        taskQueue.schedule(`import_hook_event:${repo.id}-${project.id}-${ts}`, async () => {
            let system = await System.findOne(db, 'global', { deleted: false }, '*');
            let story = await EventImporter.importHookEvent(db, system, server, repo, project, glHookEvent);
            if (story === false) {
                // hook event wasn't handled--scan activity log
                return taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, async () => {
                    return EventImporter.importEvents(db, system, server, repo, project, glHookEvent);
                });
            }
        });
    } catch (err) {
        console.error(err);
    } finally {
        res.end();
    }
}

/**
 * Install web hooks
 *
 * @return {Promise}
 */
async function startHookMaintenance() {
    let db = database;
    let host = await getServerAddress(db);
    await HookManager.installHooks(db, host);
}

/**
 * Attempt to install hooks that fail previous
 *
 * @return {Promise}
 */
async function performPeriodicHookMaintenance() {
    let db = database;
    let host = await getServerAddress(db);
    await HookManager.installFailedHooks(db, host);
}

/**
 * Remove web hooks
 *
 * @return {Promise}
 */
async function stopHookMaintenance() {
    let db = database;
    let host = await getServerAddress(db);
    await HookManager.removeHooks(db, host);
}

/**
 * Reimport repos from all servers
 *
 * @return {Promise}
 */
async function performPeriodicRepoImport() {
    let db = database;
    let criteria = {
        type: 'gitlab',
        disabled: false,
        deleted: false
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    for (let server of servers) {
        if (hasAccessToken(server)) {
            taskQueue.schedule(`import_server_repos:${server.id}`, async () => {
                return RepoImporter.importRepositories(db, server);
            });
        }
    }
}

/**
 * Import events from all repos
 *
 * @return {null}
 */
async function performPeriodicEventImport() {
    let db = database;
    let system = await System.findOne(db, 'global', { deleted: false }, '*');
    let list = await RepoAssociation.find(db);
    for (let { server, repo, project } of list) {
        taskQueue.schedule(`import_repo_events:${repo.id}-${project.id}`, async () => {
            return EventImporter.importEvents(db, system, server, repo, project);
        });
    }
}

/**
 * Reimport users from all GitLab servers
 *
 * @return {null}
 */
async function performPeriodicUserImport() {
    let db = database;
    let criteria = {
        type: 'gitlab',
        deleted: false,
        disabled: false,
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    for (let server of servers) {
        if (hasAccessToken(server)) {
            taskQueue.schedule(`import_users:${server.id}`, () => {
                return UserImporter.importUsers(db, server);
            });
        }
    }
}

/**
 * Scan milestones for change
 */
async function performPeriodicMilestoneUpdate() {
    let db = database;
    let system = await System.findOne(db, 'global', { deleted: false }, '*');
    if (!system) {
        return;
    }
    let list = await RepoAssociation.find(db);
    for (let { server, repo, project } of list) {
        taskQueue.schedule(`update_milestones:${server.id}-${project.id}-${repo.id}`, async () => {
            return MilestoneImporter.updateMilestones(db, system, server, repo, project);
        });
    }
}

/**
 * Start retrying failed export exports
 *
 * @return {null}
 */
async function performPeriodicExportRetry() {
    // look for story they have failed and put them into the queue
    let db = database;
    let list = await RepoAssociation.find(db);
    let projects = _.uniq(_.map(list, 'project'));
    for (let project of projects) {
        // load export tasks that failed and try them again
        let schema = project.name;
        let criteria = {
            action: 'export-issue',
            complete: false,
            newer_than: Moment().startOf('day').subtract(3, 'day'),
            deleted: false,
        };
        let tasks = await Task.find(db, schema, criteria, '*');
        for (let task of tasks) {
            taskQueue.schedule(`export_story:${task.id}`, async () => {
                return exportStory(db, schema, task);
            });
        }
    }
}

const SEC = 1000;
const MIN = 60 * SEC;

let periodicTasks = [
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
let periodicTasksInterval;
let periodicTasksLastRun;

/**
 * Start periodic tasks
 */
async function startPeriodicTasks() {
    for (let task of periodicTasks) {
        task.delay += task.every;
        try {
            if (task.start) {
                await task.start();
            }
        } catch (err) {
            console.error(err);
        }
    }
    periodicTasksLastRun = Moment();
    periodicTasksInterval = setInterval(runPeriodicTasks, 5 * 1000);
}

/**
 * Decrement delay counters and run tasks on reaching zero
 *
 * @return {null}
 */
async function runPeriodicTasks() {
    let now = Moment();
    let elapsed = now - periodicTasksLastRun;
    periodicTasksLastRun = now;
    let readyTasks = _.filter(periodicTasks, (task) => {
        task.delay -= elapsed;
        if (task.delay <= 0) {
            task.delay = task.every;
            return true;
        }
    });
    for (let task of readyTasks) {
        try {
            if (task.run) {
                await task.run();
            }
        } catch (err) {
            console.error(err);
        }
    }
}

/**
 * Stop periodic tasks
 */
async function stopPeriodicTasks() {
    periodicTasksInterval = clearInterval(periodicTasksInterval);
    for (let task of periodicTasks) {
        try {
            if (task.stop) {
                await task.stop();
            }
        } catch (err) {
            console.error(err);
        }
    }
}

/**
 * Return true if the server object contains an access token
 *
 * @param  {Server}  server
 *
 * @return {Boolean}
 */
function hasAccessToken(server) {
    let accessToken = _.get(server, 'settings.api.access_token');
    let oauthBaseURL = _.get(server, 'settings.oauth.base_url');
    return !!(accessToken && oauthBaseURL);
}

/**
 * Return the server location
 *
 * @param  {Database}
 *
 * @return {Promise<String>}
 */
async function getServerAddress(db) {
    let criteria = { deleted: false };
    let system = await System.findOne(db, 'global', criteria, 'settings');
    let address = _.get(system, 'settings.address');
    return _.trimEnd(address, ' /');
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
