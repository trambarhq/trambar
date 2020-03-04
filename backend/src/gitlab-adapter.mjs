import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import BodyParser from 'body-parser';
import DNSCache from 'dnscache';
import { Database } from './lib/database.mjs';
import { TaskLog } from './lib/task-log.mjs';
import * as Shutdown from './lib/shutdown.mjs';

// accessors
import { Project } from './lib/accessors/project.mjs';
import { Repo } from './lib/accessors/repo.mjs';
import { Server } from './lib/accessors/server.mjs';

import * as HookManager from './lib/gitlab-adapter/hook-manager.mjs';
import * as SnapshotManager from './lib/gitlab-adapter/snapshot-manager.mjs';

import { TaskQueue } from './lib/task-queue.mjs';
import {
  TaskImportRepos,
  TaskImportRepoEvents,
  TaskImportSnapshots,
  TaskDetectTemplate,
  TaskImportUsers,
  TaskInstallHooks,
  TaskRemoveHooks,
  TaskInstallServerHooks,
  TaskRemoveServerHooks,
  TaskInstallProjectHook,
  TaskRemoveProjectHook,
  TaskProcessProjectHookEvent,
  TaskProcessSystemHookEvent,
  TaskImportWikis,
  TaskReimportWiki,
  TaskRemoveWikis,
  TaskUpdateMilestones,
  TaskExportStory,
  TaskReexportStory,

  PeriodicTaskMaintainHooks,
  PeriodicTaskImportRepos,
  PeriodicTaskImportUsers,
  PeriodicTaskImportWikis,
  PeriodicTaskImportRepoEvents,
  PeriodicTaskImportSnapshots,
  PeriodicTaskDetectTemplate,
  PeriodicTaskUpdateMilestones,
  PeriodicTaskRetryFailedExports,
} from './lib/gitlab-adapter/tasks.mjs';

let server;
let database;
let taskQueue;

DNSCache({ enable: true, ttl: 300, cachesize: 100 });

async function start() {
  const db = database = await Database.open(true);
  await db.need('global');

  // listen for Webhook invocation
  const app = Express();
  app.use(BodyParser.json());
  app.set('json spaces', 2);
  app.post('/srv/gitlab/hook/:serverID', handleSystemHookCallback);
  app.post('/srv/gitlab/hook/:serverID/:repoID/:projectID', handleProjectHookCallback);
  app.get('/internal/retrieve/:schema/:commit/:type/*', handleFileRequest);
  app.use(handleError);

  server = app.listen(80);

  // listen for database change events
  const tables = [
    'project',
    'repo',
    'server',
    'story',
    'system',
    'task',
    'wiki',
  ];
  await db.listen(tables, 'change', handleDatabaseChanges, 100);

  taskQueue = new TaskQueue;
  taskQueue.schedule(new PeriodicTaskMaintainHooks);
  taskQueue.schedule(new PeriodicTaskImportRepos);
  taskQueue.schedule(new PeriodicTaskImportUsers);
  taskQueue.schedule(new PeriodicTaskImportWikis);
  taskQueue.schedule(new PeriodicTaskImportRepoEvents);
  taskQueue.schedule(new PeriodicTaskImportSnapshots);
  taskQueue.schedule(new PeriodicTaskDetectTemplate);
  taskQueue.schedule(new PeriodicTaskUpdateMilestones);
  taskQueue.schedule(new PeriodicTaskRetryFailedExports);
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
    if (event.op === 'DELETE') {
      continue;
    }
    switch (event.table) {
      case 'server':
        handleServerChangeEvent(event);
        break;
      case 'project':
        handleProjectChangeEvent(event);
        break;
      case 'repo':
        handleRepoChangeEvent(event);
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
      case 'wiki':
        handleWikiChangeEvent(event);
        break;
    }
  }
}

/**
 * Import repos from server when API access is gained
 *
 * @param  {Object} event
 */
function handleServerChangeEvent(event) {
  const serverID = event.id;
  const disabled = event.current.deleted || event.current.disabled;
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
    const projectID = event.id;
    const archivedAfter = event.current.archived;
    const archivedBefore = (event.diff.archived) ? event.previous.archived : archivedAfter;
    const deletedAfter = event.current.deleted;
    const deletedBefore = (event.diff.deleted) ? event.previous.deleted : deletedAfter;
    const repoIDsAfter = event.current.repo_ids;
    const repoIDsBefore = (event.diff.repo_ids) ? event.previous.repo_ids : repoIDsAfter;
    for (let repoID of _.union(repoIDsAfter, repoIDsBefore)) {
      const connectedBefore = !archivedBefore && !deletedBefore && _.includes(repoIDsBefore, repoID);
      const connectedAfter = !archivedAfter && !deletedAfter && _.includes(repoIDsAfter, repoID);
      // remove or restore hooks
      if (connectedBefore && !connectedAfter) {
        taskQueue.add(new TaskRemoveProjectHook(repoID, projectID));
        taskQueue.add(new TaskRemoveWikis(repoID, projectID));
      } else if (!connectedBefore && connectedAfter) {
        taskQueue.add(new TaskImportRepoEvents(repoID, projectID));
        taskQueue.add(new TaskImportWikis(repoID, projectID));
        taskQueue.add(new TaskInstallProjectHook(repoID, projectID));
      }
    }
  }
}

/**
 * Import snapshots from repository when we discover that it contains a
 * website template
 *
 * @param  {Object} event
 */
function handleRepoChangeEvent(event) {
  if (event.diff.template) {
    const repoID = event.id;
    if (event.current.template) {
      taskQueue.add(new TaskImportSnapshots(repoID));
    } else if (event.current.template === null) {
      taskQueue.add(new TaskDetectTemplate(repoID));
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
  const storyID = event.id;
  taskQueue.add(new TaskReexportStory(storyID));
}

/**
 * Copy contents from story to issue tracker
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
  const schema = event.schema;
  const taskID = event.id;
  taskQueue.add(new TaskExportStory(schema, taskID));
}

/**
 * Reimport wikis when page selection changes
 *
 * @param  {Object} event
 */
function handleWikiChangeEvent(event) {
  if (event.op !== 'UPDATE' || !event.diff.chosen) {
    return;
  }
  const schema = event.schema;
  const wikiID = event.id;
  taskQueue.add(new TaskReimportWiki(schema, wikiID));
}

/**
 * Adjust web-hooks when server address changes
 *
 * @param  {Object} event
 */
function handleSystemChangeEvent(event) {
  if (event.diff.settings) {
    const hostBefore = _.trimEnd((event.previous.settings) ? event.previous.settings.address : '', ' /');
    const hostAfter = _.trimEnd(event.current.settings.address, ' /');
    if (hostBefore !== hostAfter) {
      if (hostBefore) {
        taskQueue.add(new TaskRemoveHooks(hostBefore));
      }
      if (hostAfter) {
        taskQueue.add(new TaskInstallHooks(hostAfter));
      }
    }
  }
}

/**
 * Called when Gitlab sends a notification about change to system
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 *
 * @return {Promise}
 */
async function handleSystemHookCallback(req, res, next) {
  try {
    const glHookEvent = req.body;
    const serverID = parseInt(req.params.serverID);
    HookManager.verifyHookRequest(req);
    taskQueue.add(new TaskProcessSystemHookEvent(serverID, glHookEvent));
    res.end();
  } catch (err) {
    next(err);
  }
}

/**
 * Called when Gitlab sends a notification about change to repo
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 *
 * @return {Promise}
 */
async function handleProjectHookCallback(req, res, next) {
  try {
    const glHookEvent = req.body;
    const serverID = parseInt(req.params.serverID);
    const repoID = parseInt(req.params.repoID);
    const projectID = parseInt(req.params.projectID);
    HookManager.verifyHookRequest(req);
    taskQueue.add(new TaskProcessProjectHookEvent(repoID, projectID, glHookEvent));
    res.end();
  } catch (err) {
    next(err);
  }
}

async function handleFileRequest(req, res, next) {
  try {
    const { schema, commit, type } = req.params;
    const path = req.params[0];
    const buffer = await SnapshotManager.retrieveFile(schema, commit, type, path);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

function handleError(err, req, res, next) {
  if (!res.headersSent) {
    const status = err.status || err.statusCode || 400;
    res.type('text').status(status).send(err.message);
  }
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  Shutdown.addListener(stop);
}

export {
  start,
  stop,
};
