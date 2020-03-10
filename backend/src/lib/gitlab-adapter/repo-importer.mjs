import _ from 'lodash';
import Moment from 'moment';
import { TaskLog } from '../task-log.mjs';
import { getDefaultLanguageCode } from '../localization.mjs';
import { createLink, findLink, inheritLink, addLink, importProperty } from '../external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as SnapshotManager from './snapshot-manager.mjs';
import * as UserImporter from './user-importer.mjs';

// accessors
import { Project } from '../accessors/project.mjs';
import { Repo } from '../accessors/repo.mjs';
import { Story } from '../accessors/story.mjs';

/**
 * Import repositories that aren't in the system yet
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Repo[]>}
 */
async function importRepositories(db, server) {
  const taskLog = TaskLog.start('gitlab-repo-import', {
    saving: true,
    server_id: server.id,
    server: server.name,
  });
  const reposAfter = [];
  try {
    // find existing repos connected with server (including deleted ones)
    const criteria = {
      external_object: createLink(server)
    };
    const repos = await Repo.find(db, 'global', criteria, '*');

    // fetch records from Gitlab
    const glRepos = await fetchRepos(server);

    // delete ones that no longer exists at GitLab
    for (let repo of repos) {
      const repoLink = findLink(repo, server);
      if (!_.some(glRepos, { id: repoLink.project.id })) {
        await Repo.updateOne(db, 'global', { id: repo.id, deleted: true });
        taskLog.append('deleted', repo.name);
      }
    }

    // add or update repo records
    const repoCount = glRepos.length;
    let repoNumber = 1;
    for (let glRepo of glRepos) {
      taskLog.describe(`importing GitLab repo: ${glRepo.name}`);

      const glLabels = await fetchLabels(server, glRepo.id);
      const glUsers = await fetchMembers(server, glRepo.id);

      // find members
      const members = [];
      for (let glUser of glUsers) {
        const member = await UserImporter.importUser(db, server, glUser);
        if (member) {
          members.push(member);
        }
      }
      // add owner to the list
      if (!_.some(glUsers, { id: glRepo.creator_id })) {
        const member = await UserImporter.importUser(db, server, { id: glRepo.creator_id });
        if (member) {
          members.push(member);
        }
      }

      const repo = await findExistingRepo(db, server, repos, glRepo);
      const repoChanges = copyRepoDetails(repo, server, members, glRepo, glLabels);
      const repoAfter = (repoChanges) ? await Repo.saveOne(db, 'global', repoChanges) : repo;
      reposAfter.push(repoAfter);

      if (repoChanges) {
        // add new members to Trambar project
        const newMembers = _.filter(members, (user) => {
          // exclude root user
          if (user.username !== 'root') {
            if (!user.disabled && !user.deleted) {
              return !repo || !_.includes(repo.user_ids);
            }
          }
        });
        await addProjectMembers(db, repoAfter, newMembers);

        taskLog.append((repo) ? 'modified' : 'added', repoAfter.name);
      }
      taskLog.report(repoNumber++, repoCount);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
  return reposAfter;
}

async function detectTemplate(db, server, repo) {
  try {
    const repoLink = findLink(repo, server);
    const packageInfo = await fetchPackageJSON(server, repoLink.project.id);
    const keywords = _.get(packageInfo, 'keywords');
    const template = _.includes(keywords, 'trambar-template');
    if (repo.template !== template) {
      const repoChanges = {
        id: repo.id,
        template
      };
      const repoAfter = await Repo.updateOne(db, 'global', repoChanges);
    }
  } catch (err) {
  }
}

/**
 * Import an activity log entry about an repo action
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
async function processEvent(db, system, server, repo, project, author, glEvent) {
  const schema = project.name;
  const storyNew = copyEventProperties(null, system, server, repo, author, glEvent);
  await Story.insertOne(db, schema, storyNew);
}

/**
 * Respond to system-level event
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glHookEvent
 *
 * @return {Promise}
 */
async function processSystemEvent(db, server, glHookEvent) {
  const eventName = _.snakeCase(glHookEvent.event_name);
  if (/^user_(add|remove)/.test(eventName)) {
    await RepoImporter.importRepositories(db, server);
  } else if (/^user_(create|destroy)/.test(eventName)) {
    await importUsers(db, server);
  }

  if (eventName === 'repository_update') {
    const criteria = {
      external_object: createLink(server, {
        project: { id: glHookEvent.project_id }
      }),
      deleted: false,
    };
    const repo = await Repo.findOne(db, 'global', criteria, '*');
    if (repo) {
      if (repo.template) {
        await SnapshotManager.processNewEvents(db, server, repo);
      } else {
        if (isMasterChanged(glHookEvent)) {
          await detectTemplate(db, server, repo);
        }
      }
    }
  } else if (/^project_(create|destroy|rename|transfer|update)/.test(eventName)) {
    await importRepositories(db, server);
  }
}

/**
 * Copy properties of an event object
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} user
 * @param  {Object} glEvent
 *
 * @return {Story}
 */
function copyEventProperties(story, system, server, repo, author, glEvent) {
  const defLangCode = getDefaultLanguageCode(system);
  const storyChanges = _.cloneDeep(story) || {};
  inheritLink(storyChanges, server, repo);
  importProperty(storyChanges, server, 'type', {
    value: 'repo',
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'language_codes', {
    value: [ defLangCode ],
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'user_ids', {
    value: [ author.id ],
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'role_ids', {
    value: author.role_ids,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'details.action', {
    value: glEvent.action_name,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'public', {
    value: true,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'ptime', {
    value: Moment(glEvent.created_at).toISOString(),
    overwrite: 'always',
  });
  if (_.isEqual(storyChanges, story)) {
    return null;
  }
  storyChanges.itime = new String('NOW()');
  return storyChanges;
}

/**
 * Find repo from among existing ones
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Object} glRepo
 *
 * @return {Promise<Repo|null>}
 */
async function findExistingRepo(db, server, repos, glRepo) {
  const repo = _.find(repos, (repo) => {
    return findLink(repo, server, {
      project: { id: glRepo.id }
    });
  });
  if (repo) {
    if (repo.deleted) {
      // restore it
      repo = await Repo.updateOne(db, 'global', { id: repo.id, deleted: false });
    }
  }
  return repo || null;
}

/**
 * Add users to projects associated with the repo
 *
 * @param {Database} db
 * @param {Repo} repo
 * @param {Array<User>} users
 *
 * @return {Promise<Array<Project>>}
 */
async function addProjectMembers(db, repo, users) {
  const newUserIDs = _.map(users, 'id');
  const criteria = {
    repo_ids: [ repo.id ]
  };
  const projectsAfter = [];
  const projects = await Project.find(db, 'global', criteria, 'id, user_ids');
  for (let project of projects) {
    project.user_ids = _.union(project.user_ids, newUserIDs);
    project = await Project.updateOne(db, 'global', project);
    projectsAfter.push(project);
  }
  return projectsAfter;
}

/**
 * Copy details from Gitlab project object
 *
 * @param  {Repo|null} repo
 * @param  {Server} server
 * @param  {Array<User>} members
 * @param  {Object} glRepo
 * @param  {Array<Object>} glLabels
 *
 * @return {Repo}
 */
function copyRepoDetails(repo, server, members, glRepo, glLabels) {
  const repoChanges = _.cloneDeep(repo) || {};
  addLink(repoChanges, server, {
    project: { id: glRepo.id }
  });
  importProperty(repoChanges, server, 'type', {
    value: 'gitlab',
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'name', {
    value: glRepo.name,
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'user_ids', {
    value: _.map(members, 'id'),
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.web_url', {
    value: glRepo.web_url,
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.issues_enabled', {
    value: glRepo.issues_enabled,
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.archived', {
    value: glRepo.archived,
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.default_branch', {
    value: glRepo.default_branch,
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.labels', {
    value: _.map(glLabels, 'name'),
    overwrite: 'always',
  });
  importProperty(repoChanges, server, 'details.label_colors', {
    value: _.map(glLabels, 'color'),
    overwrite: 'always',
  });
  if (repoChanges.deleted) {
    repoChanges.deleted = false;
  }
  if (_.isEqual(repoChanges, repo)) {
    return null;
  }
  repoChanges.itime = new String('NOW()');
  return repoChanges;
}

/**
 * Retrieve all repos on a Gitlab server
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchRepos(server) {
  const url = `/projects`;
  return Transport.fetchAll(server, url);
}

/**
 * Retrieve all labels used by a Gitlab repo
 *
 * @param  {Server} server
 * @param  {Number} glRepoID
 *
 * @return {Promise<Object>}
 */
async function fetchLabels(server, glRepoID) {
  const url = `/projects/${glRepoID}/labels`;
  return Transport.fetchAll(server, url);
}

/**
 * Retrieve member records from Gitlab (these are not complete user records)
 *
 * @param  {Server} server
 * @param  {Number} glRepoID
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchMembers(server, glRepoID) {
  const url = `/projects/${glRepoID}/members`;
  return Transport.fetchAll(server, url);
}

/**
 * Retrieve package.json
 *
 * @param  {Server} server
 * @param  {Number} glRepoID
 *
 * @return {Promise<Array<Object|null>>}
 */
async function fetchPackageJSON(server, glRepoID) {
  const treeURL = `/projects/${glRepoID}/repository/tree`;
  const query = { ref: 'master' };
  const listing = await Transport.fetchAll(server, treeURL, query);
  const entry = _.find(listing, { type: 'blob', name: 'package.json' });
  if (!entry) {
    return null;
  }
  const pathEncoded = encodeURIComponent(entry.path);
  const blobURL = `/projects/${glRepoID}/repository/files/${pathEncoded}`;
  const file = await Transport.fetch(server, blobURL, query);
  const buffer = Buffer.from(file.content, 'base64');
  const text = buffer.toString();
  const object = JSON.parse(text);
  return object;
}

function isMasterChanged(glHookEvent) {
  const changes = glHookEvent.changes;
  if (changes === undefined) {
    return true;
  }
  return _.some(changes, (change) => {
    const refParts = _.split(change.ref, '/');
    const branch = _.last(refParts);
    return (branch === 'master');
  });
}

export {
  importRepositories,
  detectTemplate,
  processEvent,
  processSystemEvent,
};
