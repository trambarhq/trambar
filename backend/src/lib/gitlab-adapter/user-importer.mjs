import _ from 'lodash';
import Moment from 'moment';
import CrossFetch from 'cross-fetch';
import { TaskLog } from '../task-log.mjs';
import { getDefaultLanguageCode } from '../localization.mjs';
import { findLink, inheritLink, createLink, addLink, removeLink, countLinks, importProperty, importResource } from '../external-data-utils.mjs';
import { HTTPError } from '../errors.mjs';

import * as Transport from './transport.mjs';
import * as RepoImporter from './repo-importer.mjs';
import * as MediaImporter from '../media-server/media-importer.mjs';

// accessors
import { Project } from '../accessors/project.mjs';
import { Repo } from '../accessors/repo.mjs';
import { Server } from '../accessors/server.mjs';
import { Story } from '../accessors/story.mjs';
import { User } from '../accessors/user.mjs';

/**
 * Import multiple Gitlab users
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<User[]>}
 */
async function importUsers(db, server) {
  const taskLog = TaskLog.start('gitlab-user-import', {
    saving: true,
    server_id: server.id,
    server: server.name,
  });
  const usersAfter = [];
  try {
    // find existing users connected with server (including disabled ones)
    const criteria = {
      external_object: createLink(server),
    };
    const users = await User.find(db, 'global', criteria, '*');
    const glUsers = await fetchUsers(server);

    // disable users that no longer exists at GitLab
    for (let user of users) {
      const userLink = findLink(user, server);
      const glUserId = _.get(userLink, 'user.id');
      if (!_.some(glUsers, { id: glUserId })) {
        const userChanges = _.cloneDeep(user);
        removeLink(userChanges, server);
        // remove user unless he's associated with another server
        if (countLinks(userChanges) === 0) {
          userChanges.disabled = true;
        }
        const userAfter = await User.updateOne(db, 'global', userChanges);
        if (userAfter.disabled) {
          taskLog.append('disabled', user.username);
        }
      }
    }

    const userCount = glUsers.length;
    let userNumber = 1;
    for (let [ index, glUser ] of glUsers.entries()) {
      taskLog.describe(`importing GitLab user:  ${glUser.username}`);
      // import profile image
      const image = await findProfileImage(glUser);
      // find existing user
      const user = await findExistingUser(db, server, users, glUser);
      const userChanges = copyUserProperties(user, server, image, glUser);
      const userAfter = (userChanges) ? await User.saveUnique(db, 'global', userChanges) : user;
      usersAfter.push(userAfter);
      if (userChanges) {
        taskLog.append((user) ? 'modified' : 'added', userAfter.username);
      }
      taskLog.report(userNumber++, userCount);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
  return usersAfter;
}

/**
 * Look for a user. If it's not these, call importUsers().
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glUser
 *
 * @return {Promise<User|null>}
 */
async function importUser(db, server, glUser) {
  if (!glUser.id) {
    const user = await findUserByName(db, server, glUser.username);
    if (user) {
      return user;
    }

    // find record with ID
    glUser = await fetchUserByName(server, glUsername);
  }
  const criteria = {
    external_object: createLink(server, {
      user: { id: glUser.id }
    })
  };
  let user = await User.findOne(db, 'global', criteria, '*');
  if (!user) {
    const users = await importUsers(db, server);
    user = _.find(users, (user) => {
      return !!findLink(user, server, {
        user: { id: glUser.id }
      });
    });
  }
  return user || null;
}

/**
 * Find an existing user to link Gitlab account to
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glUser
 *
 * @return {Promise<User|null>}
 */
async function findExistingUser(db, server, users, glUser) {
  // look for matching id among users imported from server previously
  let user = _.find(users, (user) => {
    return !!findLink(user, server, {
      user: { id: glUser.id }
    });
  });
  // match by username ("root" only)
  if (!user && glUser.username === 'root') {
    const criteria = {
      username: glUser.username,
      deleted: false,
      order: 'id',
    }
    user = await User.findOne(db, 'global', criteria, '*');
  }
  // match by email
  if (!user && glUser.email) {
    const criteria = {
      email: glUser.email,
      deleted: false,
      order: 'id',
    };
    user = await User.findOne(db, 'global', criteria, '*');
  }
  return user || null;
}

/**
 * Look for a user when Gitlab doesn't give us only the username and not the id.
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {String} glUserName
 *
 * @return {Promise<Array<User|null>>}
 */
async function findUsersByName(db, server, glUsernames) {
  const userList = [];
  // first, load all users from server
  const criteria = {
    external_object: createLink(server)
  };
  const users = await User.find(db, 'global', criteria, '*');
  for (let glUsername of glUsernames) {
    // try to find an user imported with that name
    const user = _.find(users, (user) => {
      const userLink = findLink(user, server);
      const username = _.get(userLink, 'user.username');
      if (username === glUsername) {
        return true;
      }
    });
    userList.push(user || null);
  }
  return userList;
}

/**
 * Look for a user when Gitlab gives us only the username and not the id.
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {String} glUsername
 *
 * @return {Promise<User|null>}
 */
async function findUserByName(db, server, glUsername) {
  const [ user ] = await findUsersByName(db, server, [ glUsername ]);
  return user || null;
}

/**
 * Copy details from Gitlab user object
 *
 * @param  {User|null} user
 * @param  {Server} server
 * @param  {Object} image
 * @param  {Object} glUser
 *
 * @return {User}
 */
function copyUserProperties(user, server, image, glUser) {
  const mapping = _.get(server, 'settings.user.mapping', {});
  let userType;
  if (glUser.is_admin) {
    userType = mapping.admin;
  } else if (glUser.external) {
    userType = mapping.external_user;
  } else {
    userType = mapping.user;
  }
  let disabled = false;
  if (!userType) {
    // create as disabled if user import is disabled
    userType = 'guest';
    disabled = true;
  }
  const userChanges = _.cloneDeep(user) || {
    role_ids: _.get(server, 'settings.user.role_ids', []),
    settings: User.getDefaultSettings(),
  };
  addLink(userChanges, server, {
    user: {
      id: glUser.id,
      username: glUser.username,
    }
  });
  importProperty(userChanges, server, 'disabled', {
    value: disabled,
    overwrite: 'match-previous:disabled',
  });
  importProperty(userChanges, server, 'type', {
    value: userType,
    overwrite: 'match-previous:type',
  });
  importProperty(userChanges, server, 'username', {
    value: glUser.username,
    overwrite: 'match-previous:username'
  });
  importProperty(userChanges, server, 'details.name', {
    value: glUser.name,
    overwrite: 'match-previous:name',
  });
  importProperty(userChanges, server, 'details.email', {
    value: glUser.email,
    overwrite: 'match-previous:email',
  });
  importProperty(userChanges, server, 'details.gitlab_url', {
    value: glUser.web_url,
    overwrite: 'match-previous:gitlab_url',
  });
  importProperty(userChanges, server, 'details.skype_username', {
    value: glUser.skype,
    overwrite: 'match-previous:skype_username',
  });
  importProperty(userChanges, server, 'details.twitter_username', {
    value: glUser.twitter,
    overwrite: 'match-previous:twitter_username',
  });
  importProperty(userChanges, server, 'details.linkedin_username', {
    value: glUser.linkedin_name,
    overwrite: 'match-previous:linkedin_username',
  });
  importResource(userChanges, server, {
    type: 'image',
    value: image,
    replace: 'match-previous',
  });
  if (_.isEqual(userChanges, user)) {
    return null;
  }
  userChanges.itime = new String('NOW()');
  return userChanges;
}

/**
 * Import an activity log entry about someone joining or leaving the project
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise}
 */
async function processEvent(db, system, server, repo, project, author, glEvent) {
  const schema = project.name;
  const storyNew = copyEventProperties(null, system, server, repo, author, glEvent);
  const storyAfter = await Story.insertOne(db, schema, storyNew);
  let userIDs;
  if (glEvent.action_name === 'joined') {
    userIDs = _.union(project.user_ids, [ author.id ]);
  } else if (glEvent.action_name === 'left') {
    userIDs = _.difference(project.user_ids, [ author.id ]);
  }
  await Project.updateOne(db, 'global', { id: project.id, user_ids: userIDs });
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
}

/**
 * Copy properties of event
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Story}
 */
function copyEventProperties(story, system, server, repo, author, glEvent) {
  const defLangCode = getDefaultLanguageCode(system);
  const storyChanges = _.cloneDeep(story) || {};
  inheritLink(storyChanges, server, repo, {
    user: { id: glEvent.author_id }
  });
  importProperty(storyChanges, server, 'type', {
    value: 'member',
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
  importProperty(storyChanges, server, 'published', {
    value: true,
    overwrite: 'always',
  });
  importProperty(storyChanges, server, 'public', {
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
 * Retrieve all user records from Gitlab
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
function fetchUsers(server) {
  const url = `/users`;
  return Transport.fetchAll(server, url);
}

/**
 * Retrieve user record from Gitlab by name
 *
 * @param  {Server} server
 * @param  {String} username
 *
 * @return {Promise<Object>}
 */
async function fetchUserByName(server, username) {
  const url = `/users`;
  const query = { username };
  const [ user ] = await Transport.fetch(server, url, query);
  return user || null;
}

/**
 * Ask Media Server to import a Gitlab user's avatar
 *
 * @param  {Object} glUser
 *
 * @return {Promise<Object|null>}
 */
async function findProfileImage(glUser) {
  try {
    const avatarURL = glUser.avatar_url;
    if (avatarURL) {
      const info = await MediaImporter.importFile(avatarURL);
      return info;
    }
  } catch (err) {
  }
  return null;
}

export {
  importUsers,
  importUser,
  findUserByName,
  findUsersByName,
  copyUserProperties,
  processEvent,
  processSystemEvent,
};
