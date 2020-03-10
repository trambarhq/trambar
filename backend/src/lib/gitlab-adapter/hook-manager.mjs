import _ from 'lodash';
import Crypto from 'crypto'
import { Database } from '../database.mjs';
import { TaskLog } from '../task-log.mjs';
import { findLink } from '../external-data-utils.mjs';
import { HTTPError } from '../errors.mjs';

// accessors
import { Server } from '../accessors/server.mjs';

import * as Transport from './transport.mjs';

/**
 * Install hooks on given server
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Array<Project>} projects
 *
 * @return {Promise}
 */
async function installServerHooks(host, server, repos, projects) {
  const taskLog = TaskLog.start('gitlab-hook-install', {
    saving: true,
    server_id: server.id,
    server: server.name,
  });
  try {
    const list = getRepoProjectPairs(repos, projects);
    const hookCount = list.length + 1;
    let hookNumber = 1;

    // install system hook
    taskLog.describe(`installing system hook`);
    await installSystemHook(host, server);
    taskLog.append('added', 'system');
    taskLog.report(hookNumber++, hookCount);

    // install project hooks
    for (let { repo, project } of list) {
      taskLog.describe(`installing repo hook: ${repo.name}`);
      await installProjectHook(host, server, repo, project);
      taskLog.append('added', repo.name);
      taskLog.report(hookNumber++, hookCount);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
}

/**
 * Remove all project hooks
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Array<Project>} projects
 *
 * @return {Promise}
 */
async function removeServerHooks(host, server, repos, projects) {
  const taskLog = TaskLog.start('gitlab-hook-remove', {
    saving: true,
    server_id: server.id,
    server: server.name,
  });
  try {
    const list = getRepoProjectPairs(repos, projects);
    const hookCount = list.length + 1;
    let hookNumber = 1;

    // remove system hook
    taskLog.describe(`removing system hook`);
    await removeSystemHook(host, server);
    taskLog.append('deleted', 'system');
    taskLog.report(hookNumber++, hookCount);

    // remove project hooks
    for (let { repo, project } of list) {
      taskLog.describe(`removing repo hook: ${repo.name}`);
      await removeProjectHook(host, server, repo, project);
      taskLog.append('deleted', repo.name);
      taskLog.report(hookNumber++, hookCount);
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
  const glHooks = await fetchSystemHooks(server);
  const url = getSystemHookEndpoint(host, server);
  const hookProps = getSystemHookProps(url);
  for (let glHook of glHooks) {
    if (glHook.url === url) {
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
  const repoLink = findLink(repo, server);
  const glHooks = await fetchProjectHooks(server, repoLink.project.id);

  // remove existing hooks
  const url = getProjectHookEndpoint(host, server, repo, project);
  const hookProps = getProjectHookProps(url);
  for (let glHook of glHooks) {
    if (glHook.url === url) {
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
  const glHooks = await fetchSystemHooks(server);
  for (let glHook of glHooks) {
    const url = getSystemHookEndpoint(host, server);
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
  const repoLink = findLink(repo, server);
  const glHooks = await fetchProjectHooks(server, repoLink.project.id);
  for (let glHook of glHooks) {
    const url = getProjectHookEndpoint(host, server, repo, project);
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
  const url = `/hooks`;
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
  const url = `/projects/${glProjectID}/hooks`;
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
  const url = `/hooks`;
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
  const url = `/projects/${glProjectID}/hooks`;
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
  const url = `/hooks/${glHook.id}`;
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
  const url = `/projects/${glProjectID}/hooks/${glHook.id}`;
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
    confidential_note_events: true,   // GL 11
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
  const accessToken = _.get(server, 'settings.api.access_token');
  const oauthBaseURL = _.get(server, 'settings.oauth.base_url');
  return (accessToken && oauthBaseURL);
}

/**
 * Verify that a request has the secret token used to ensure a webhook
 * request is really comming from GitLab
 *
 * @param  {HTTPRequest} req
 */
function verifyHookRequest(req) {
  const tokenReceived = req.headers['x-gitlab-token'];
  const tokenRequired = getSecretToken();
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
    const buffer = Crypto.randomBytes(16);
    secretToken = buffer.toString('hex');
  }
  return secretToken;
}

function getRepoProjectPairs(repos, projects) {
  const list = [];
  for (let project of projects) {
    for (let repo of repos) {
      if (_.includes(project.repo_ids, repo.id)) {
        list.push({ repo, project });
      }
    }
  }
  return list;
}

let secretToken;

export {
  installServerHooks,
  installSystemHook,
  installProjectHook,
  removeServerHooks,
  removeSystemHook,
  removeProjectHook,
  verifyHookRequest,
};
