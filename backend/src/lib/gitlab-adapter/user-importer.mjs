import _ from 'lodash';
import Moment from 'moment';
import Request from 'request';
import * as TaskLog from '../task-log.mjs';
import * as Localization from '../localization.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';
import { DefaultUserSettings } from '../common/objects/settings/user-settings.mjs';

import * as Transport from './transport.mjs';

// accessors
import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Server from '../accessors/server.mjs';
import Story from '../accessors/story.mjs';
import User from '../accessors/user.mjs';

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
 * @return {Promise<Story>}
 */
async function importEvent(db, system, server, repo, project, author, glEvent) {
    let schema = project.name;
    let storyNew = copyEventProperties(null, system, server, repo, author, glEvent);
    let story = await Story.insertOne(db, schema, storyNew);
    if (glEvent.action_name === 'joined') {
        if (!_.includes(project.user_ids, author.id)) {
            project.user_ids.push(author.id);
        }
    } else if (glEvent.action_name === 'left') {
        _.pull(project.user_ids, author.id);
    }
    await Project.updateOne(db, 'global', _.pick(project, 'id', 'user_ids'));
    return story;
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
    let defLangCode = Localization.getDefaultLanguageCode(system);

    let storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo, {
        user: { id: glEvent.author_id }
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'member',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.action', {
        value: glEvent.action_name,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(glEvent.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    storyAfter.itime = new String('NOW()');
    return storyAfter;
}

/**
 * Import multiple Gitlab users
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<User>>}
 */
async function importUsers(db, server) {
    let userList = [];
    let taskLog = TaskLog.start('gitlab-user-import', {
        server_id: server.id,
        server: server.name,
    });
    try {
        // find existing users connected with server (including disabled ones)
        let criteria = {
            external_object: ExternalDataUtils.createLink(server),
        };
        let users = await User.find(db, 'global', criteria, '*');
        let glUsers = await fetchUsers(server);

        // disable users that no longer exists at GitLab
        let disabled = [];
        for (let user of users) {
            let userLink = ExternalDataUtils.findLink(user, server);
            let glUserId = _.get(userLink, 'user.id');
            if (!_.some(glUsers, { id: glUserId })) {
                let userAfter = _.cloneDeep(user);
                ExternalDataUtils.removeLink(userAfter, server);
                // remove user unless he's associated with another server
                if (ExternalDataUtils.countLinks(userAfter) === 0) {
                    userAfter.disabled = true;
                    disabled.push(userAfter.username);
                }
                await User.updateOne(db, 'global', userAfter);
            }
        }

        let added = [];
        let modified = [];
        let index = 0, count = _.size(glUsers);
        for (let glUser of glUsers) {
            // import profile image
            let image = await importProfileImage(glUser);
            // find existing user
            let user = await findExistingUser(db, server, users, glUser);
            let userAfter = copyUserProperties(user, server, image, glUser);
            if (userAfter !== user) {
                if (user) {
                    modified.push(userAfter.username);
                    user = await User.updateOne(db, 'global', userAfter);
                } else {
                    added.push(userAfter.username);
                    user = await User.insertUnique(db, 'global', userAfter);
                }
            }
            userList.push(user);
            if (added.length + disabled.length + modified.length > 0) {
                taskLog.report(index + 1, count, { added, disabled, modified });
            }
            index++;
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
    return userList;
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
        return !!ExternalDataUtils.findLink(user, server, {
            user: { id: glUser.id }
        });
    });
    // match by username ("root" only)
    if (!user && glUser.username === 'root') {
        let criteria = {
            username: glUser.username,
            deleted: false,
            order: 'id',
        }
        user = await User.findOne(db, 'global', criteria, '*');
    }
    // match by email
    if (!user && glUser.email) {
        let criteria = {
            email: glUser.email,
            deleted: false,
            order: 'id',
        };
        user = await User.findOne(db, 'global', criteria, '*');
    }
    return user || null;
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
async function findUser(db, server, glUser) {
    if (!glUser.id) {
        return findUserByName(db, server, glUser.username);
    }
    let criteria = {
        external_object: ExternalDataUtils.createLink(server, {
            user: { id: glUser.id }
        })
    };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        let users = await importUsers(db, server);
        user = _.find(users, (user) => {
            return !!ExternalDataUtils.findLink(user, server, {
                user: { id: glUser.id }
            });
        });
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
    let userList = [];
    // first, load all users from server
    let criteria = {
        external_object: ExternalDataUtils.createLink(server)
    };
    let users = await User.find(db, 'global', criteria, '*');
    for (let glUsername of glUsernames) {
        // try to find an user imported with that name
        let user = _.find(users, (user) => {
            let userLink = ExternalDataUtils.findLink(user, server);
            let username = _.get(userLink, 'user.username');
            if (username === glUsername) {
                return true;
            }
        });
        if (!user) {
            let glUser = await fetchUserByName(server, glUsername);
            if (glUser) {
                user = await findUser(db, server, glUser);
            }
        }
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
    let users = await findUsersByName(db, server, [ glUsername ]);
    return users[0] || null;
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
    let mapping = _.get(server, 'settings.user.mapping', {});
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
    let userAfter = _.cloneDeep(user);
    if (!userAfter) {
        userAfter = {
            role_ids: _.get(server, 'settings.user.role_ids', []),
            settings: DefaultUserSettings,
        };
    }
    ExternalDataUtils.addLink(userAfter, server, {
        user: {
            id: glUser.id,
            username: glUser.username,
        }
    });
    ExternalDataUtils.importProperty(userAfter, server, 'disabled', {
        value: disabled,
        overwrite: 'match-previous:disabled',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'type', {
        value: userType,
        overwrite: 'match-previous:type',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'username', {
        value: glUser.username,
        overwrite: 'match-previous:username'
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.name', {
        value: glUser.name,
        overwrite: 'match-previous:name',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.email', {
        value: glUser.email,
        overwrite: 'match-previous:email',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.gitlab_url', {
        value: glUser.web_url,
        overwrite: 'match-previous:gitlab_url',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.skype_username', {
        value: glUser.skype,
        overwrite: 'match-previous:skype_username',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.twitter_username', {
        value: glUser.twitter,
        overwrite: 'match-previous:twitter_username',
    });
    ExternalDataUtils.importProperty(userAfter, server, 'details.linkedin_username', {
        value: glUser.linkedin_name,
        overwrite: 'match-previous:linkedin_username',
    });
    ExternalDataUtils.importResource(userAfter, server, {
        type: 'image',
        value: image,
        replace: 'match-previous',
    });
    if (_.isEqual(userAfter, user)) {
        return user;
    }
    userAfter.itime = new String('NOW()');
    return userAfter;
}

/**
 * Retrieve all user records from Gitlab
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
function fetchUsers(server) {
    let url = `/users`;
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
    let url = `/users`;
    let query = { username };
    let users = await Transport.fetch(server, url, query);
    return users[0] || null;
}

/**
 * Ask Media Server to import a Gitlab user's avatar
 *
 * @param  {Object} glUser
 *
 * @return {Promise<Object|null>}
 */
async function importProfileImage(glUser) {
    let url = glUser.avatar_url;
    if (!url) {
        return null;
    }
    console.log(`Retrieving profile image: ${url}`);
    let options = {
        json: true,
        url: 'http://media_server/srv/internal/import',
        body: { url },
    };
    return new Promise((resolve, reject) => {
        Request.post(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HTTPError(resp.statusCode);
            }
            if (!err) {
                resolve(body);
            } else {
                console.log('Unable to retrieve profile image: ' + url);
                resolve(null);
            }
        });
    });
}

export {
    importEvent,
    importUsers,
    findUser,
    findUserByName,
    findUsersByName,
    copyUserProperties,
};
