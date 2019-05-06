import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import Database from '../database.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';
import { BasicTask, PeriodicTask } from '../task-queue.mjs';

import * as HookManager from './hook-manager.mjs';
import * as EventImporter from './event-importer.mjs';
import * as RepoImporter from './repo-importer.mjs';
import * as UserImporter from './user-importer.mjs';
import * as MilestoneImporter from './milestone-importer.mjs';
import * as IssueExporter from './issue-exporter.mjs';

// accessors
import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Story from '../accessors/story.mjs';
import System from '../accessors/system.mjs';
import Task from '../accessors/task.mjs';

const MIN = 60 * 1000;

class TaskImportRepos extends BasicTask {
    constructor(serverID) {
        super();
        this.serverID = serverID;
    }

    async run() {
        let db = await Database.open();
        let server = await getServer(db, this.serverID);
        if (server) {
            await RepoImporter.importRepositories(db, server);
        }
    }
}

class TaskImportRepoEvents extends BasicTask {
    constructor(repoID, projectID, glHookEvent) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
        this.glHookEvent = glHookEvent;
    }

    async run() {
        let db = await Database.open();
        let system = await getSystem(db);
        let repo = await getRepo(db, this.repoID);
        let project = await getProject(db, this.projectID);
        let server = await getRepoServer(db, repo);
        if (system, repo, project, server) {
            // make sure the project-specific schema exists
            await db.need(project.name);
            await EventImporter.importEvents(db, system, server, repo, project);
        }
    }
}

class TaskImportUsers extends BasicTask {
    constructor(serverID) {
        super();
        this.serverID = serverID;
    }

    async run() {
        let db = await Database.open();
        let server = await getServer(db, this.serverID);
        if (server) {
            await UserImporter.importUsers(db, server);
        }
    }
}

class TaskInstallHooks extends BasicTask {
    constructor(host) {
        super();
        this.host = host;
    }

    async run(queue) {
        let db = await Database.open();
        let servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskInstallServerHooks(server.id, this.host));
        }
    }
}

class TaskRemoveHooks extends BasicTask {
    constructor(host) {
        super();
        this.host = host;
    }

    async run(queue) {
        let db = await Database.open();
        let servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskRemoveServerHooks(server.id, this.host));
        }
    }
}

let problematicServerIDs = [];

class TaskInstallServerHooks extends BasicTask {
    constructor(serverID, host) {
        super();
        this.serverID = serverID;
        this.host = host;
    }

    async run() {
        let db = await Database.open();
        let host = this.host;
        if (!host) {
            host = await getSystemAddress(db);
        }
        let server = await getServer(db, this.serverID);
        let repos = await getServerRepos(db, server);
        let projects = await getReposProjects(db, repos);
        if (host && server) {
            try {
                await HookManager.installServerHooks(host, server, repos, projects);
                _.pull(problematicServerIDs, server.id);
            } catch (err) {
                _.union(problematicServerIDs, [ server.id ]);
            }
        }
    }
}

class TaskRemoveServerHooks extends BasicTask {
    constructor(serverID, host) {
        super();
        this.serverID = serverID;
        this.host = host;
    }

    async run() {
        let db = await Database.open();
        let host = this.host;
        if (!host) {
            host = await getSystemAddress(db);
        }
        let server = await getServer(db, this.serverID);
        let repos = await getServerRepos(db, server);
        let projects = await getReposProjects(db, repos);
        if (host && server) {
            try {
                await HookManager.removeServerHooks(host, server, repos, projects);
                _.pull(problematicServerIDs, server.id);
            } catch (err) {
            }
        }
    }
}

class TaskInstallProjectHook extends BasicTask {
    constructor(repoID, projectID) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
    }

    async run() {
        let db = await Database.open();
        let host = await getSystemAddress(db);
        let repo = await getRepo(db, this.repoID);
        let project = await getProject(db, this.projectID);
        let server = await getRepoServer(db, repo);
        if (host && repo && project && server) {
            try {
                await HookManager.installProjectHook(host, server, repo, project);
            } catch (err) {
                _.union(problematicServerIDs, [ server.id ]);
            }
        }
    }
}

class TaskRemoveProjectHook extends BasicTask {
    constructor(repoID, projectID) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
    }

    async run() {
        let db = await Database.open();
        let host = await getSystemAddress(db);
        let repo = await getRepo(db, this.repoID);
        let project = await getProject(db, this.projectID);
        let server = await getRepoServer(db, repo);
        if (host && repo && project && server) {
            await HookManager.removeProjectHook(host, server, repo, project);
        }
    }
}

class TaskImportProjectHookEvent extends BasicTask {
    constructor(repoID, projectID, glHookEvent) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
        this.glHookEvent = glHookEvent;
    }

    async run(queue) {
        let db = await Database.open();
        let system = await getSystem(db);
        let repo = await getRepo(db, this.repoID);
        let project = await getProject(db, this.projectID);
        let server = await getRepoServer(db, repo);
        let glHookEvent = this.glHookEvent;
        if (system && server && repo && project) {
            let story = await EventImporter.importHookEvent(db, system, server, repo, project, glHookEvent);
            if (story === false) {
                queue.add(new TaskImportRepoEvents(this.repoID, this.projectID, this.glHookEvent));
            }
        }
    }
}

class TaskUpdateMilestones extends BasicTask {
    constructor(repoID, projectID) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
    }

    async run() {
        let db = await Database.open();
        let system = await getSystem(db);
        let repo = await getRepo(db, this.repoID);
        let project = await getProject(db, this.projectID);
        let server = await getRepoServer(db, repo);
        if (system && server && repo && project) {
            await MilestoneImporter.updateMilestones(db, system, server, repo, project);
        }
    }
}


class TaskExportStory extends BasicTask {
    constructor(schema, taskID) {
        super();
        this.schema = schema;
        this.taskID = taskID;
    }

    async run() {
        let db = await Database.open();
        let system = await getSystem(db);
        let project = await getProjectByName(db, this.schema);
        let task = await getTask(db, this.schema, this.taskID);
        if (system && task && project) {
            try {
                let story = await IssueExporter.exportStory(db, system, project, task);
                task.completion = 100;
                task.failed = false;
                task.etime = new String('NOW()');
                delete task.details.error;
                if (story) {
                    let issueLink = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
                    _.assign(task.details, _.pick(issueLink, 'repo', 'issue'));
                }
            } catch (err) {
                task.details.error = _.pick(err, 'message', 'statusCode');
                task.failed = true;
                if (err.statusCode >= 400 && err.statusCode <= 499) {
                    // stop trying
                    task.deleted = true;
                }
            }
            await Task.saveOne(db, this.schema, task);
        }
    }
}

class TaskReexportStory extends BasicTask {
    constructor(schema, storyID) {
        super();
        this.schema = schema;
        this.storyID = storyID;
    }

    async run(queue) {
        // look for the export task and run it again
        let db = await Database.open();
        let story = await getStory(db, this.schema, this.storyID);
        let task = await getExportTask(db, this.schema, story);

         if (task && story) {
             // reexport only if the exporting user is among the author
             if (_.includes(story.user_ids, task.user_id)) {
                 task.completion = 50;
                 task = await Task.saveOne(db, this.schema, task);
                 queue.add(new TaskExportStory(this.schema, task.id));
             }
         }
    }
}

class PeriodicTaskMaintainHooks extends PeriodicTask {
    delay(initial) {
        return 1 * MIN;
    }

    async start(queue) {
        if (process.env.NODE_ENV !== 'production') {
            // reduce the chance that operations will overlap on nodemon restart
            await Bluebird.delay(3000);
        }

        let db = await Database.open();
        let host = await getSystemAddress(db);
        let task = new TaskInstallHooks(host);
        await task.run(queue);
    }

    async run(queue) {
        let db = await Database.open();
        for (let serverID of problematicServerIDs) {
            queue.add(new TaskInstallServerHooks(serverID));
        }
    }

    async stop(queue) {
        let db = await Database.open();
        let host = await getSystemAddress(db);
        let task = new TaskRemoveHooks(host);
        await task.run(queue);
    }
}

class PeriodicTaskImportRepos extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 5 * MIN;
    }

    async run(queue) {
        let db = await Database.open();
        let servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskImportRepos(server.id));
        }
    }
}

class PeriodicTaskImportUsers extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 5 * MIN;
    }

    async run(queue) {
        let db = await Database.open();
        let servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskImportUsers(server.id));
        }
    }
}

class PeriodicTaskImportRepoEvents extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 2 * MIN;
    }

    async run(queue) {
        let db = await Database.open();
        let projects = await getProjects(db);
        for (let project of projects) {
            for (let repoID of project.repo_ids) {
                queue.add(new TaskImportRepoEvents(repoID, project.id));
            }
        }
    }
}

class PeriodicTaskUpdateMilestones extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 5 * MIN;
    }

    async run(queue) {
        let db = await Database.open();
        let projects = await getProjects(db);
        for (let project of projects) {
            for (let repoID of project.repo_ids) {
                queue.add(new TaskUpdateMilestones(repoID, project.id));
            }
        }
    }
}

class PeriodicTaskRetryFailedExports extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 5 * MIN;
    }

    async run(queue) {
        let db = await Database.open();
        let projects = await getProjects(db);
        for (let project of projects) {
            // load export tasks that failed and try them again
            let tasks = await getFailedExportTasks(db, project);
            for (let task of tasks) {
                queue.add(new TaskExportStory(project.name, task.id));
            }
        }
    }
}

async function getSystem(db) {
    let criteria = {
        deleted: false,
    };
    return System.findOne(db, 'global', criteria, '*');
}

async function getSystemAddress(db) {
    let system = await getSystem(db);
    let address = _.get(system, 'settings.address');
    return _.trimEnd(address, ' /');
}

async function getServer(db, serverID) {
    let criteria = {
        id: serverID,
        type: 'gitlab',
        disabled: false,
        deleted: false,
    }
    let server = await Server.findOne(db, 'global', criteria, '*');
    if (hasAccessToken(server)) {
        return server;
    }
}

async function getServers(db) {
    let criteria = {
        type: 'gitlab',
        disabled: false,
        deleted: false,
    }
    let servers = await Server.find(db, 'global', criteria, '*');
    return _.filter(servers, hasAccessToken);
}

async function getRepo(db, repoID) {
    let criteria = {
        id: repoID,
        deleted: false,
    };
    return Repo.findOne(db, 'global', criteria, '*');
}

async function getRepoServer(db, repo) {
    if (!repo) {
        return;
    }
    let repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    if (repoLink) {
        return getServer(db, repoLink.server_id);
    }
}

async function getServerRepos(db, server) {
    if (!server) {
        return [];
    }
    let criteria = {
        external_object: ExternalDataUtils.createLink(server),
        deleted: false,
    };
    return Repo.find(db, 'global', criteria, '*');
}

async function getReposProjects(db, repos) {
    let criteria = {
        repo_ids: _.map(repos, 'id'),
        deleted: false,
        archived: false,
    };
    return Project.find(db, 'global', criteria, '*');
}

async function getProject(db, projectID) {
    let criteria = {
        id : projectID,
        archived: false,
        deleted: false,
    };
    return Project.findOne(db, 'global', criteria, '*');
}

async function getProjectByName(db, name) {
    let criteria = {
        name,
        archived: false,
        deleted: false,
    };
    return Project.findOne(db, 'global', criteria, '*');
}

async function getProjects(db) {
    let criteria = {
        archived: false,
        deleted: false,
    };
    return Project.find(db, 'global', criteria, '*');
}

async function getTask(db, schema, taskID) {
    let criteria = {
        id: taskID,
        deleted: false,
    };
    return Task.findOne(db, schema, criteria, '*');
}

async function getFailedExportTasks(db, project) {
    let criteria = {
        action: 'export-issue',
        complete: false,
        newer_than: Moment().startOf('day').subtract(3, 'day'),
        deleted: false,
    };
    return Task.find(db, project.name, criteria, '*');
}

async function getStory(db, schema, storyID) {
    let criteria = {
        id: storyID,
        deleted: false,
    };
    return Story.find(db, schema, criteria, '*');
}

async function getExportTask(db, schema, story) {
    if (!story) {
        return;
    }
    let criteria = {
         type: 'export-issue',
         completion: 100,
         failed: false,
         options: {
             story_id: story.id,
         },
         deleted: false,
     };
     return Task.findOne(db, schema, criteria, '*');
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

export {
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
};
