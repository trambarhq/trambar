import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import BodyParser from 'body-parser';
import DNSCache from 'dnscache';
import Database from 'database';
import * as Shutdown from 'shutdown';

import * as HookManager from 'gitlab-adapter/hook-manager';

import TaskQueue from 'task-queue';
import {
    TaskImportRepos,
    TaskImportRepoEvents,
    TaskImportUsers,
    TaskInstallHooks,
    TaskRemoveHooks,
    TaskInstallServerHooks,
    TaskRemoveServerHooks,
    TaskInstallProjectHook,
    TaskRemoveProjectHook,
    TaskImportProjectHookEvent,
    TaskUpdateMilestones,
    TaskExportStory,
    TaskReexportStory,

    PeriodicTaskMaintainHooks,
    PeriodicTaskImportRepos,
    PeriodicTaskImportUsers,
    PeriodicTaskImportRepoEvents,
    PeriodicTaskUpdateMilestones,
    PeriodicTaskRetryFailedExports,
} from 'gitlab-adapter/tasks';

let server;
let database;
let taskQueue;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
    let db = database = await Database.open(true);
    await db.need('global');

    // listen for Webhook invocation
    let app = Express();
    app.use(BodyParser.json());
    app.set('json spaces', 2);
    app.post('/srv/gitlab/hook/:serverID', handleSystemHookCallback);
    app.post('/srv/gitlab/hook/:serverID/:repoID/:projectID', handleProjectHookCallback);
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

    taskQueue = new TaskQueue;
    taskQueue.schedule(new PeriodicTaskMaintainHooks());
    taskQueue.schedule(new PeriodicTaskImportRepos());
    taskQueue.schedule(new PeriodicTaskImportUsers());
    taskQueue.schedule(new PeriodicTaskImportRepoEvents());
    taskQueue.schedule(new PeriodicTaskUpdateMilestones());
    taskQueue.schedule(new PeriodicTaskRetryFailedExports());
    await taskQueue.start();
}

async function stop() {
    await Shutdown.close(server);

    if (taskQueue) {
        await taskQueue.stop();
        taskQueue = undefined;
    }

    if (database) {
        database.close();
        database = undefined;
    }
}

/**
 * Called when changes occurs in the database
 *
 * @param  {Array<Object>} events
 */
function handleDatabaseChanges(events) {
    for (let event of events) {
        if (event.action === 'DELETE') {
            continue;
        }
        try {
            switch (event.table) {
                case 'server':
                    handleServerChangeEvent(event);
                    break;
                case 'project':
                    handleProjectChangeEvent(event);
                    break;
                case 'story':
                    handleStoryChangeEvent(event);
                    break;
                case 'system':
                    handleSystemChangeEvent(event);
                    break;
                case 'task':
                    handleTaskChangeEvent(event);
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
 * @param  {Object} event
 */
function handleServerChangeEvent(event) {
    let serverID = event.id;
    let disabled = event.current.deleted || event.current.disabled;
    if (event.diff.settings) {
        if (!disabled) {
            taskQueue.add(new TaskImportRepos(serverID));
            taskQueue.add(new TaskImportUsers(serverID));
        }
    }
    if (event.diff.deleted || event.diff.disabled) {
        if (!disabled) {
            taskQueue.add(new TaskInstallServerHooks(serverID));
        } else {
            taskQueue.add(new TaskRemoveServerHooks(serverID));
        }
    }
}

/**
 * Import events from repository when it's added to project and install
 * web hooks on Gitlab server
 *
 * @param  {Object} event
 */
function handleProjectChangeEvent(event) {
    if (event.diff.archived || event.diff.deleted || event.diff.repo_ids) {
        let projectID = event.id;
        let archivedAfter = event.current.archived;
        let archivedBefore = (event.diff.archived) ? event.previous.archived : archivedAfter;
        let deletedAfter = event.current.deleted;
        let deletedBefore = (event.diff.deleted) ? event.previous.deleted : deletedAfter;
        let repoIDsAfter = event.current.repo_ids;
        let repoIDsBefore = (event.diff.repo_ids) ? event.previous.repo_ids : repoIDsAfter;
        for (let repoID of repoIDsAfter) {
            let connectedBefore = !archivedBefore && !deletedBefore && _.includes(repoIDsBefore, repoID);
            let connectedAfter = !archivedAfter && !deletedAfter;
            // remove or restore hooks
            if (connectedBefore && !connectedAfter) {
                taskQueue.add(new TaskRemoveProjectHook(repoID, projectID));
            } else if (!connectedBefore && connectedAfter) {
                taskQueue.add(new TaskImportRepoEvents(repoID, projectID));
                taskQueue.add(new TaskInstallProjectHook(repoID, projectID));
            }
        }
    }
}

/**
 * copy contents from story to issue tracker
 *
 * @param  {Object} event
 */
function handleStoryChangeEvent(event) {
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
    let storyID = event.id;
    taskQueue.add(new TaskReexportStory(storyID));
}

/**
 * copy contents from story to issue tracker
 *
 * @param  {Object} event
 */
function handleTaskChangeEvent(event) {
    if (event.current.action !== 'export-issue') {
        return;
    }
    if (!event.diff.options) {
        return;
    }
    if (event.schema === 'global') {
        return;
    }
    if (event.current.deleted) {
        return;
    }
    let schema = event.schema;
    let taskID = event.id;
    taskQueue.add(new TaskExportStory(schema, taskID));
}

/**
 * Adjust web-hooks when server address changes
 *
 * @param  {Object} event
 */
function handleSystemChangeEvent(event) {
    if (event.diff.settings) {
        let hostBefore = (event.previous.settings) ? event.previous.settings.address : '';
        let hostAfter = event.current.settings.address;
        if (hostBefore !== hostAfter) {
            if (hostBefore) {
                taskQueue.add(new TaskRemoveHooks);
            }
            if (hostAfter) {
                taskQueue.add(new TaskInstallHooks);
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
        let serverID = parseInt(req.params.serverID);
        switch (glHookEvent.event_name) {
            case 'project_create':
            case 'project_destroy':
            case 'project_rename':
            case 'project_transfer':
            case 'project_update':
            case 'user_add_to_team':
            case 'user_remove_from_team':
                taskQueue.add(new TaskImportRepos(serverID));
                break;
            case 'user_create':
            case 'user_destroy':
                taskQueue.add(new TaskImportUsers(serverID));
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
        let serverID = parseInt(req.params.serverID);
        let repoID = parseInt(req.params.repoID);
        let projectID = parseInt(req.params.projectID);
        taskQueue.add(new TaskImportProjectHookEvent(repoID, projectID, glHookEvent));
    } catch (err) {
        console.error(err);
    } finally {
        res.end();
    }
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
