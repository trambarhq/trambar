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
import * as WikiImporter from './wiki-importer.mjs';

// accessors
import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Story from '../accessors/story.mjs';
import System from '../accessors/system.mjs';
import Task from '../accessors/task.mjs';
import Wiki from '../accessors/wiki.mjs';

const MIN = 60 * 1000;

class TaskImportRepos extends BasicTask {
    constructor(serverID) {
        super();
        this.serverID = serverID;
    }

    async run() {
        const db = await Database.open();
        const server = await getServer(db, this.serverID);
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
        const db = await Database.open();
        const system = await getSystem(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
        if (system, repo, project, server) {
            // make sure the project-specific schema exists
            await db.need(project.name);
            await EventImporter.processNewEvents(db, system, server, repo, project, this.glHookEvent);
        }
    }
}

class TaskImportUsers extends BasicTask {
    constructor(serverID) {
        super();
        this.serverID = serverID;
    }

    async run() {
        const db = await Database.open();
        const server = await getServer(db, this.serverID);
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
        const db = await Database.open();
        const servers = await getServers(db);
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
        const db = await Database.open();
        const servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskRemoveServerHooks(server.id, this.host));
        }
    }
}

const problematicServerIDs = [];

class TaskInstallServerHooks extends BasicTask {
    constructor(serverID, host) {
        super();
        this.serverID = serverID;
        this.host = host;
    }

    async run() {
        const db = await Database.open();
        const host = this.host || await getSystemAddress(db);
        const server = await getServer(db, this.serverID);
        const repos = await getServerRepos(db, server);
        const projects = await getReposProjects(db, repos);
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
        const db = await Database.open();
        const host = this.host || await getSystemAddress(db);
        const server = await getServer(db, this.serverID);
        const repos = await getServerRepos(db, server);
        const projects = await getReposProjects(db, repos);
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
        const db = await Database.open();
        const host = await getSystemAddress(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
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
        const db = await Database.open();
        const host = await getSystemAddress(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
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
        const db = await Database.open();
        const system = await getSystem(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
        const glHookEvent = this.glHookEvent;
        if (system && server && repo && project) {
            if (glHookEvent.object_kind === 'wiki_page') {
                // update wikis
                queue.add(new TaskImportWikis(this.repoID, this.projectID));
            }

            await EventImporter.processHookEvent(db, system, server, repo, project, glHookEvent);
        }
    }
}

class TaskImportWikis extends BasicTask {
    constructor(repoID, projectID) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
    }

    async run() {
        const db = await Database.open();
        const system = await getSystem(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
        if (system && server && repo && project) {
            await WikiImporter.importWikis(db, system, server, repo, project);
        }
    }
}

class TaskReimportWiki extends BasicTask {
    constructor(schema, wikiID) {
        super();
        this.schema = schema;
        this.wikiID = wikiID;
    }

    async run() {
        const db = await Database.open();
        const system = await getSystem(db);
        const project = await getProjectByName(db, this.schema);
        const wiki = await getWiki(db, this.schema, this.wikiID);
        const repo = await getWikiRepo(db, wiki);
        const server = await getRepoServer(db, repo);
        if (system && server && repo && project) {
            await WikiImporter.importWikis(db, system, server, repo, project);
        }
    }
}

class TaskRemoveWikis extends BasicTask {
    constructor(repoID, projectID) {
        super();
        this.repoID = repoID;
        this.projectID = projectID;
    }

    async run() {
        const db = await Database.open();
        const system = await getSystem(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
        if (system && server && repo && project) {
            await WikiImporter.removeWikis(db, system, server, repo, project);
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
        const db = await Database.open();
        const system = await getSystem(db);
        const repo = await getRepo(db, this.repoID);
        const project = await getProject(db, this.projectID);
        const server = await getRepoServer(db, repo);
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
        const db = await Database.open();
        const system = await getSystem(db);
        const project = await getProjectByName(db, this.schema);
        const task = await getTask(db, this.schema, this.taskID);
        if (system && task && project) {
            try {
                const story = await IssueExporter.exportStory(db, system, project, task);
                task.completion = 100;
                task.failed = false;
                task.etime = new String('NOW()');
                delete task.details.error;
                if (story) {
                    const issueLink = ExternalDataUtils.findLinkByServerType(story, 'gitlab');
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
        const db = await Database.open();
        const story = await getStory(db, this.schema, this.storyID);
        const task = await getExportTask(db, this.schema, story);

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

        const db = await Database.open();
        const host = await getSystemAddress(db);
        const task = new TaskInstallHooks(host);
        await task.run(queue);
    }

    async run(queue) {
        const db = await Database.open();
        for (let serverID of problematicServerIDs) {
            queue.add(new TaskInstallServerHooks(serverID));
        }
    }

    async stop(queue) {
        const db = await Database.open();
        const host = await getSystemAddress(db);
        const task = new TaskRemoveHooks(host);
        await task.run(queue);
    }
}

class PeriodicTaskImportRepos extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 5 * MIN;
    }

    async run(queue) {
        const db = await Database.open();
        const servers = await getServers(db);
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
        const db = await Database.open();
        const servers = await getServers(db);
        for (let server of servers) {
            queue.add(new TaskImportUsers(server.id));
        }
    }
}

class PeriodicTaskImportWikis extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 60 * MIN;
    }

    async run(queue) {
        const db = await Database.open();
        const projects = await getProjects(db);
        for (let project of projects) {
            for (let repoID of project.repo_ids) {
                queue.add(new TaskImportWikis(repoID, project.id));
            }
        }
    }
}

class PeriodicTaskImportRepoEvents extends PeriodicTask {
    delay(initial) {
        return (initial) ? 0 : 2 * MIN;
    }

    async run(queue) {
        const db = await Database.open();
        const projects = await getProjects(db);
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
        const db = await Database.open();
        const projects = await getProjects(db);
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
        const db = await Database.open();
        const projects = await getProjects(db);
        for (let project of projects) {
            // load export tasks that failed and try them again
            const tasks = await getFailedExportTasks(db, project);
            for (let task of tasks) {
                queue.add(new TaskExportStory(project.name, task.id));
            }
        }
    }
}

async function getSystem(db) {
    const criteria = {
        deleted: false,
    };
    return System.findOne(db, 'global', criteria, '*');
}

async function getSystemAddress(db) {
    const system = await getSystem(db);
    const address = _.get(system, 'settings.address');
    return _.trimEnd(address, ' /');
}

async function getServer(db, serverID) {
    const criteria = {
        id: serverID,
        type: 'gitlab',
        disabled: false,
        deleted: false,
    }
    const server = await Server.findOne(db, 'global', criteria, '*');
    if (hasAccessToken(server)) {
        return server;
    }
}

async function getServers(db) {
    const criteria = {
        type: 'gitlab',
        disabled: false,
        deleted: false,
    }
    const servers = await Server.find(db, 'global', criteria, '*');
    return _.filter(servers, hasAccessToken);
}

async function getRepo(db, repoID) {
    const criteria = {
        id: repoID,
        deleted: false,
    };
    return Repo.findOne(db, 'global', criteria, '*');
}

async function getRepoServer(db, repo) {
    if (!repo) {
        return;
    }
    const repoLink = ExternalDataUtils.findLinkByServerType(repo, 'gitlab');
    if (repoLink) {
        return getServer(db, repoLink.server_id);
    }
}

async function getServerRepos(db, server) {
    if (!server) {
        return [];
    }
    const criteria = {
        external_object: ExternalDataUtils.createLink(server),
        deleted: false,
    };
    return Repo.find(db, 'global', criteria, '*');
}

async function getReposProjects(db, repos) {
    const criteria = {
        repo_ids: _.map(repos, 'id'),
        deleted: false,
        archived: false,
    };
    return Project.find(db, 'global', criteria, '*');
}

async function getProject(db, projectID) {
    const criteria = {
        id : projectID,
        archived: false,
        deleted: false,
    };
    return Project.findOne(db, 'global', criteria, '*');
}

async function getProjectByName(db, name) {
    const criteria = {
        name,
        archived: false,
        deleted: false,
    };
    return Project.findOne(db, 'global', criteria, '*');
}

async function getProjects(db) {
    const criteria = {
        archived: false,
        deleted: false,
    };
    return Project.find(db, 'global', criteria, '*');
}

async function getTask(db, schema, taskID) {
    const criteria = {
        id: taskID,
        deleted: false,
    };
    return Task.findOne(db, schema, criteria, '*');
}

async function getFailedExportTasks(db, project) {
    const criteria = {
        action: 'export-issue',
        complete: false,
        newer_than: Moment().startOf('day').subtract(3, 'day'),
        deleted: false,
    };
    return Task.find(db, project.name, criteria, '*');
}

async function getStory(db, schema, storyID) {
    const criteria = {
        id: storyID,
        deleted: false,
    };
    return Story.findOne(db, schema, criteria, '*');
}

async function getWiki(db, schema, wikiID) {
    const criteria = {
        id: wikiID,
        deleted: false,
    };
    return Wiki.findOne(db, schema, criteria, '*');
}

async function getWikiRepo(db, wiki) {
    if (wiki) {
        const wikiLink = ExternalDataUtils.findLinkByRelations(wiki, 'wiki');
        if (wikiLink) {
            const repoLink = _.omit(wikiLink, 'wiki');
            const criteria = {
                external_object: repoLink,
                deleted: false,
            };
            return Repo.findOne(db, 'global', criteria, '*');
        }
    }
    return null;
}

async function getExportTask(db, schema, story) {
    if (!story) {
        return;
    }
    const criteria = {
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
    const accessToken = _.get(server, 'settings.api.access_token');
    const oauthBaseURL = _.get(server, 'settings.oauth.base_url');
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
    PeriodicTaskUpdateMilestones,
    PeriodicTaskRetryFailedExports,
};
