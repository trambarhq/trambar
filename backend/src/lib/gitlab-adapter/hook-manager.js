import _ from 'lodash';
import Crypto from 'crypto'
import Database from 'database';
import * as TaskLog from 'task-log';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import Server from 'accessors/server';
import HTTPError from 'errors/http-error';

import * as Transport from 'gitlab-adapter/transport';
import * as RepoAssociation from 'gitlab-adapter/repo-association';

let problematicServerIDs = [];

/**
 * Re-install all hooks
 *
 * @param  {Database} db
 * @param  {String} host
 *
 * @return {Promise}
 */
async function installHooks(db, host) {
    let criteria = {
        type: 'gitlab',
        deleted: false,
        disabled: false,
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    for (let server of servers) {
        if (hasAccessToken(server)) {
            try {
                await installServerHooks(db, host, server);
            } catch (err) {
                if (!(err.statusCode >= 400 && err.statusCode <= 499)) {
                    if (!_.includes(problematicServerIDs, server.id)) {
                        problematicServerIDs.push(server.id);
                    }
                }
                throw err;
            }
        }
    }
}

/**
 * Attempt to install hooks on server that failed earlier
 *
 * @param  {Database} db
 * @param  {String} host
 *
 * @return {Promise}
 */
async function installFailedHooks(db, host) {
    for (let serverID of problematicServerIDs) {
        let criteria = {
            id: serverID,
            type: 'gitlab',
            deleted: false,
            disabled: false,
        };
        let server = await Server.find(db, 'global', criteria, '*');
        if (hasAccessToken(server)) {
            try {
                await installServerHooks(db, host, server);
                _.pull(problematicServerIDs, serverID);
            } catch (err) {
                if (err.statusCode >= 400 && err.statusCode <= 499) {
                    _.pull(problematicServerIDs, serverID);
                }
                throw err;
            }
        }
    }
}

/**
 * Install hooks on given server
 *
 * @param  {Database} db
 * @param  {String} host
 * @param  {Server} server
 *
 * @return {Promise}
 */
async function installServerHooks(db, host, server) {
    let taskLog = TaskLog.start('gitlab-hook-install', {
        server_id: server.id,
        server: server.name,
    });
    try {
        let criteria = { server: { id: server.id } };
        let list = await RepoAssociation.find(db, criteria);
        let hookCount = list.length + 1;
        let added = [];

        // install system hook
        await installSystemHook(host, server);
        added.push('system');
        taskLog.report(added.length, hookCount, { added });

        // install project hooks
        for (let { repo, project } of list) {
            await installProjectHook(host, server, repo, project);
            added.push(repo.name);
            taskLog.report(added.length, hookCount, { added });
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

/**
 * Remove all hooks
 *
 * @param  {Database} db
 * @param  {String} host
 *
 * @return {Promise}
 */
async function removeHooks(db, host) {
    let criteria = {
        type: 'gitlab',
        deleted: false,
        disabled: false,
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    for (let server of servers) {
        if (hasAccessToken(server)) {
            try {
                await removeServerHooks(db, host, server);
            } finally {
                _.pull(problematicServerIDs, server.id);
            }
        }
    }
}

/**
 * Remove all project hooks
 *
 * @param  {Database} db
 * @param  {String} host
 * @param  {Server} server
 *
 * @return {Promise}
 */
async function removeServerHooks(db, host, server) {
    let taskLog = TaskLog.start('gitlab-hook-remove', {
        server_id: server.id,
        server: server.name,
    });

    try {
        // default criteria omit deleted repos and projects
        let criteria = { server: { id: server.id }, repo: {}, project: {} };
        let list = await RepoAssociation.find(db, criteria);
        let hookCount = list.length + 1;
        let deleted = [];

        // remove system hook
        await removeSystemHook(host, server);
        deleted.push('system');
        taskLog.report(deleted.length, hookCount, { deleted });

        // remove project hooks
        for (let { repo, project } of list) {
            await removeProjectHook(host, server, repo, project);
            deleted.push(repo.name);
            taskLog.report(deleted.length, hookCount, { deleted });
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

async function installSystemHook(host, server) {
    if (!host) {
        throw HTTPError(400, 'Unable to install hook due to missing server address')
    }
    console.log(`Installing web-hook on server: ${server.name}`);
    let glHooks = await fetchSystemHooks(server);
    let url = getSystemHookEndpoint(host, server);
    let hookProps = getSystemHookProps(url);
    for (let glHook of glHooks) {
        if (glHook.url === url) {
            console.log(`Removing existing hook: ${glHook.url}`);
            await destroySystemHook(server, glHook);
        }
    }
    await createSystemHook(server, hookProps);
}

/**
 * Install project hook on Gitlab server
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
async function installProjectHook(host, server, repo, project) {
    if (!host) {
        throw HTTPError(400, 'Unable to install hook due to missing server address');
    }
    console.log(`Installing web-hook on repo for project: ${repo.name} -> ${project.name}`);
    let repoLink = ExternalDataUtils.findLink(repo, server);
    if (!repoLink) {
        console.log(repo);
    }
    let glHooks = await fetchProjectHooks(server, repoLink.project.id);

    // remove existing hooks
    let url = getProjectHookEndpoint(host, server, repo, project);
    let hookProps = getProjectHookProps(url);
    for (let glHook of glHooks) {
        if (glHook.url === url) {
            console.log(`Removing existing hook: ${glHook.url}`);
            await destroyProjectHook(server, repoLink.project.id, glHook);
        }
    }
    await createProjectHook(server, repoLink.project.id, hookProps);
}

/**
 * Remove project hook from Gitlab server
 *
 * @param  {String} host
 * @param  {Server} server
 *
 * @return {Promise}
 */
async function removeSystemHook(host, server) {
    if (!host) {
        return;
    }
    console.log(`Removing web-hook on server: ${server.name}`);
    let glHooks = await fetchSystemHooks(server);
    for (let glHook of glHooks) {
        let url = getSystemHookEndpoint(host, server);
        if (glHook.url === url) {
            await destroySystemHook(server, glHook);
        }
    }
}

/**
 * Remove project hook from Gitlab server
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
async function removeProjectHook(host, server, repo, project) {
    if (!host) {
        return;
    }
    console.log(`Removing web-hook on repo for project: ${repo.name} -> ${project.name}`);
    let repoLink = ExternalDataUtils.findLink(repo, server);
    let glHooks = await fetchProjectHooks(server, repoLink.project.id);
    for (let glHook of glHooks) {
        let url = getProjectHookEndpoint(host, server, repo, project);
        if (glHook.url === url) {
            await destroyProjectHook(server, repoLink.project.id, glHook);
        }
    }
}

/**
 * Retrieve all system hooks installed on server
 *
 * @param  {Server} server
 *
 * @return {Array<Object>}
 */
async function fetchSystemHooks(server) {
    let url = `/hooks`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve all project hooks installed on repo
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 *
 * @return {Array<Object>}
 */
async function fetchProjectHooks(server, glProjectID) {
    let url = `/projects/${glProjectID}/hooks`;
    return Transport.fetchAll(server, url);
}

/**
 * Install a system hook on Gitlab server
 *
 * @param  {Server} server
 * @param  {Object} glHook
 *
 * @return {Promise<Object>}
 */
async function createSystemHook(server, glHook) {
    let url = `/hooks`;
    return Transport.post(server, url, glHook);
}

/**
 * Install a project hook on Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Object} glHook
 *
 * @return {Promise<Object>}
 */
async function createProjectHook(server, glProjectID, glHook) {
    let url = `/projects/${glProjectID}/hooks`;
    return Transport.post(server, url, glHook);
}

/**
 * Remove a system hook from Gitlab server
 *
 * @param  {Server} server
 * @param  {Object} glHook
 *
 * @return {Promise}
 */
async function destroySystemHook(server, glHook) {
    let url = `/hooks/${glHook.id}`;
    return Transport.remove(server, url);
}

/**
 * Remove a project hook from Gitlab server
 *
 * @param  {Server} server
 * @param  {Number} glProjectID
 * @param  {Object} glHook
 *
 * @return {Promise}
 */
async function destroyProjectHook(server, glProjectID, glHook) {
    let url = `/projects/${glProjectID}/hooks/${glHook.id}`;
    return Transport.remove(server, url);
}

/**
 * Return properties of a system hook
 *
 * @param  {String} url
 *
 * @return {Object}
 */
function getSystemHookProps(url) {
    return {
        url,
        push_events: false,
        tag_push_events: false,
        merge_requests_events: false,
        enable_ssl_verification: false,
        token: getSecretToken(),
    };
}

/**
 * Return properties of a project hook
 *
 * @param  {String} url
 *
 * @return {Object}
 */
function getProjectHookProps(url) {
    return {
        url,
        push_events: true,
        issues_events: true,
        merge_requests_events: true,
        tag_push_events: true,
        note_events: true,
        job_events: true,
        pipeline_events: true,
        wiki_page_events: true,
        confidential_note_events: true,     // GL 11
        confidential_issues_events: true,   // GL 11
        enable_ssl_verification: false,
        token: getSecretToken(),
    };
}

/**
 * Return URL for a system hook
 *
 * @param  {String} url
 *
 * @return {String}
 */
function getSystemHookEndpoint(host, server) {
    return `${host}/srv/gitlab/hook/${server.id}`;
}

/**
 * Return URL for a project hook
 *
 * @param  {String} url
 *
 * @return {String}
 */
function getProjectHookEndpoint(host, server, repo, project) {
    return `${host}/srv/gitlab/hook/${server.id}/${repo.id}/${project.id}`;
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
    return (accessToken && oauthBaseURL);
}

/**
 * Verify that a request has the secret token used to ensure a webhook
 * request is really comming from GitLab
 *
 * @param  {HTTPRequest} req
 */
function verifyHookRequest(req) {
    let tokenReceived = req.headers['x-gitlab-token'];
    let tokenRequired = getSecretToken();
    if (tokenReceived !== tokenRequired) {
        throw new HTTPError(403);
    }
}

/**
 * Return secret token used to verify requests from GitLab
 *
 * @return {String}
 */
function getSecretToken() {
    if (!secretToken) {
        let buffer = Crypto.randomBytes(16);
        secretToken = buffer.toString('hex');
    }
    return secretToken;
}

let secretToken;

export {
    installHooks,
    installFailedHooks,
    installServerHooks,
    installSystemHook,
    installProjectHook,
    removeHooks,
    removeServerHooks,
    removeSystemHook,
    removeProjectHook,
    verifyHookRequest,
};
