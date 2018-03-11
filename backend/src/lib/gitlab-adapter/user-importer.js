var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Request = require('request');
var TaskLog = require('task-log');
var HTTPError = require('errors/http-error');
var ExternalObjectUtils = require('objects/utils/external-object-utils');
var UserTypes = require('objects/types/user-types');
var UserSettings = require('objects/settings/user-settings');

var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var User = require('accessors/user');

module.exports = {
    importEvent,
    importUsers,
    findUser,
    copyUserProperties,
};

/**
 * Import an activity log entry about someone joining or leaving the project
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var storyNew = copyEventProperties(null, server, repo, author, glEvent);
    return Story.insertOne(db, schema, storyNew).then((story) => {
        if (glEvent.action_name === 'joined') {
            if (!_.includes(project.user_ids, author.id)) {
                project.user_ids.push(author.id);
            }
        } else if (glEvent.action_name === 'left') {
            _.pull(project.user_ids, author.id);
        }
        return Project.updateOne(db, 'global', _.pick(project, 'id', 'user_ids')).then((project) => {
            return story;
        });
    });
}

/**
 * Copy properties of event
 *
 * @param  {Story|null} story
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function copyEventProperties(story, server, repo, author, glEvent) {
    var storyAfter = _.cloneDeep(story) || {};
    ExternalObjectUtils.inheritLink(storyAfter, server, repo, {
        user: { id: glEvent.author_id }
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'type', {
        value: 'member',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'details.action', {
        value: glEvent.action_name,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(glEvent.created_at).toISOString(),
        overwrite: 'always',
    });
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
function importUsers(db, server) {
    var taskLog = TaskLog.start('gitlab-user-import', {
        server_id: server.id,
        server: server.name,
    });
    // find existing users connected with server (including disabled ones)
    var criteria = {
        external_object: ExternalObjectUtils.createLink(server),
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var added = [];
        var disabled = [];
        var modified = [];
        // fetch list of users from Gitlab
        return fetchUsers(server).then((glUsers) => {
            // disable ones that no longer exists
            return Promise.each(users, (user) => {
                var userLink = ExternalObjectUtils.findLink(user, server);
                var glUserId = _.get(userLink, 'user.id');
                if (!_.some(glUsers, { id: glUserId })) {
                    var userAfter = _.cloneDeep(user);
                    ExternalObjectUtils.removeLink(userAfter, server);
                    // remove user unless he's associated with another server
                    if (ExternalObjectUtils.countLinks(userAfter) === 0) {
                        userAfter.disabled = true;
                        disabled.push(userAfter.username);
                    }
                    return User.updateOne(db, 'global', userAfter);
                }
            }).return(glUsers);
        }).mapSeries((glUser, index, count) => {
            // import profile image
            return importProfileImage(glUser).then((image) => {
                // find existing user
                return findExistingUser(db, server, users, glUser).then((user) => {
                    var userAfter = copyUserProperties(user, server, image, glUser);
                    if (_.isEqual(userAfter, user)) {
                        return user;
                    }
                    if (user) {
                        modified.push(userAfter.username);
                        return User.updateOne(db, 'global', userAfter);
                    } else {
                        added.push(userAfter.username);
                        return User.insertUnique(db, 'global', userAfter);
                    }
                });
            }).tap(() => {
                taskLog.report(index + 1, count, { added, disabled, modified });
            });
        });
    }).tap(() => {
        taskLog.finish();
    }).tapCatch((err) => {
        taskLog.abort(err);
    });
}

/**
 * Find an existing user to link Gitlab account to
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glUser
 *
 * @return {Promise<User>}
 */
function findExistingUser(db, server, users, glUser) {
    var user = _.find(users, (user) => {
        var userLink = ExternalObjectUtils.findLink(user, server, {
            user: { id: glUser.id }
        });
        if (userLink) {
            return true;
        }
    });
    if (user) {
        if (user.disabled) {
            // restore it
            return User.updateOne(db, 'global', { id: user.id, disabled: false });
        } else {
            return Promise.resolve(user);
        }
    }
    // match by email or username ("root" only)
    var strategies = [ 'email', 'username' ];
    return Promise.reduce(strategies, (matching, strategy) => {
        if (matching) {
            return matching;
        }
        if (strategy === 'email' && glUser.email) {
            var criteria = {
                email: glUser.email,
                deleted: false,
                order: 'id',
            };
            return User.findOne(db, 'global', criteria, '*');
        } else if (strategy === 'username' && glUser.username === 'root') {
            var criteria = {
                username: glUser.username,
                deleted: false,
                order: 'id',
            }
            return User.findOne(db, 'global', criteria, '*');
        } else {
            return null;
        }
    }, null);
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
function findUser(db, server, glUser) {
    if (!glUser.id) {
        return findUserByName(db, server, glUser);
    }
    var criteria = {
        external_object: ExternalObjectUtils.createLink(server, {
            user: { id: glUser.id }
        })
    };
    return User.findOne(db, 'global', criteria, '*').then((user) => {
        if (user) {
            return user;
        }
        return importUsers(db, server).then((users) => {
            return _.find(users, (user) => {
                var userLink = ExternalObjectUtils.findLink(user, server, {
                    user: { id: glUser.id }
                });
                if (userLink) {
                    return true;
                }
            });
        });
    });
}

/**
 * Look for a user when Gitlab doesn't give us only the username and not the id.
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glUser
 *
 * @return {Promise<User|null>}
 */
function findUserByName(db, server, glUser) {
    // first, try to find an user imported with that name
    var criteria = {
        external_object: ExternalObjectUtils.createLink(server)
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var user = _.find(users, (user) => {
            var userLink = ExternalObjectUtils.findLink(user, server);
            var username = _.get(userLink, 'user.username');
            if (username === glUser.username) {
                return true;
            }
        });
        if (user) {
            return user;
        } else {
            return fetchUserByName(server, glUser.username).then((glUser) => {
                if (!glUser) {
                    return null;
                }
                return findUser(db, server, glUser);
            });
        }
    });
}

/**
 * Copy details from Gitlab user object
 *
 * @param  {User|null} user
 * @param  {Server} server
 * @param  {Object} image
 * @param  {Object} glUser
 *
 * @return {Object|null}
 */
function copyUserProperties(user, server, image, glUser) {
    var mapping = _.get(server, 'settings.user.mapping', {});
    var userType;
    if (glUser.is_admin) {
        userType = mapping.admin;
    } else if (glUser.external) {
        userType = mapping.external_user;
    } else {
        userType = mapping.user;
    }
    var overwriteUserType = 'never';
    if (user) {
        // overwrite user type if new type has more privileges
        if (UserTypes.indexOf(userType) > UserTypes.indexOf(user.type)) {
            overwriteUserType = 'always';
        }
    }

    var userAfter = _.cloneDeep(user);
    if (!userAfter) {
        userAfter = {
            role_ids: _.get(server, 'settings.user.role_ids', []),
            settings: UserSettings.default,
        };
    }
    ExternalObjectUtils.addLink(userAfter, server, {
        user: {
            id: glUser.id,
            username: glUser.username,
        }
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'type', {
        value: userType,
        overwrite: overwriteUserType,
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'username', {
        value: glUser.username,
        overwrite: 'match-previous'
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'details.name', {
        value: glUser.name,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'details.gitlab_url', {
        value: glUser.web_url,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'details.skype_username', {
        value: glUser.skype,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'details.twitter_username', {
        value: glUser.twitter,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.importProperty(userAfter, server, 'details.linkedin_username', {
        value: glUser.linkedin_name,
        overwrite: 'match-previous',
    });
    ExternalObjectUtils.importResource(userAfter, server, {
        type: 'image',
        value: image,
        replace: 'match-previous',
    });
    if (!userAfter.type) {
        // create as disabled if user import is disabled
        userAfter.type = 'regular';
        userAfter.disabled = true;
    }
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
    var url = `/users`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve user record from Gitlab by name
 *
 * @param  {Server} server
 *
 * @return {Promise<Object>}
 */
function fetchUserByName(server, username) {
    var url = `/users`;
    var query = { username };
    return Transport.fetch(server, url, query).then((users) => {
        if (_.size(users) === 1) {
            return users[0];
        } else {
            return null;
        }
    });
}

/**
 * Ask Media Server to import a Gitlab user's avatar
 *
 * @param  {Object} glUser
 *
 * @return {Promise<Object>}
 */
function importProfileImage(glUser) {
    var url = glUser.avatar_url;
    if (!url) {
        return Promise.resolve(null);
    }
    console.log(`Retrieving profile image: ${url}`);
    var options = {
        json: true,
        url: 'http://media_server/internal/import',
        body: {
            external_url: url
        },
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
