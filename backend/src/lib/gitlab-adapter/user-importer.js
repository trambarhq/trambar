var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Request = require('request');
var HttpError = require('errors/http-error');
var UserTypes = require('objects/types/user-types');
var UserSettings = require('objects/settings/user-settings');

var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var User = require('accessors/user');

exports.importEvent = importEvent;
exports.importUsers = importUsers;
exports.findUser = findUser;
exports.copyUserProperties = copyUserProperties;

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
    var repoLink = Import.Link.find(repo, server);
    var userLink = Import.Link.create(server, {
        user: { id: glEvent.author_id }
    });
    var link = Import.Link.merge(userLink, repoLink);
    var storyNew = copyEventProperties(null, author, glEvent, link);
    return Story.insertOne(db, schema, storyNew);
}

/**
 * Copy properties of event
 *
 * @param  {Story|null} story
 * @param  {User} author
 * @param  {Object} glEvent
 * @param  {Object} link
 *
 * @return {Object}
 */
function copyEventProperties(story, author, glEvent, link) {
    var storyAfter = _.cloneDeep(story) || {};
    Import.join(storyAfter, link);
    _.set(storyAfter, 'type', 'member');
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'details.action', glEvent.action_name);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'ptime', Moment(glEvent.created_at).toISOString());
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
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
    // find existing users connected with server (including deleted ones)
    var criteria = {
        external_object: Import.Link.create(server),
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var added = [];
        var deleted = [];
        var modified = [];
        // fetch list of users from Gitlab
        return fetchUsers(server).then((glUsers) => {
            // delete ones that no longer exists
            return Promise.each(users, (user) => {
                var userLink = Import.Link.find(user, server);
                if (!_.some(glUsers, { id: userLink.user.id })) {
                    // unless the user is connected to another server
                    var otherLinks = _.filter(user.external, (link) => {
                        if (link.server_id !== server.id) {
                            return true;
                        }
                    });
                    deleted.push(user.username);
                    if (!_.isEmpty(otherLinks)) {
                        // in which case we just remove the connection to this server
                        return User.updateOne(db, 'global', { id: user.id, external: otherLinks });
                    } else {
                        return User.updateOne(db, 'global', { id: user.id, deleted: true });
                    }
                }
            }).return(glUsers);
        }).mapSeries((glUser, index, count) => {
            // import profile image
            return importProfileImage(glUser).then((image) => {
                // find existing user
                return findExistingUser(db, server, users, glUser).then((user) => {
                    var link = Import.Link.create(server, {
                        user: { id: glUser.id }
                    });
                    var userAfter = copyUserProperties(user, image, server, glUser, link);
                    if (!userAfter) {
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
                taskLog.report(index + 1, count, { added, deleted, modified });
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
        var userLink = Import.Link.find(user, server);
        if (userLink.project && userLink.project.id === glRepo.id) {
            return true;
        }
    });
    if (user) {
        if (user.deleted) {
            // restore it
            return User.updateOne(db, 'global', { id: user.id, deleted: false });
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
    var userLink = Import.Link.create(server, {
        user: { id: glUser.id }
    });
    var criteria = { external_object: userLink };
    return User.findOne(db, 'global', criteria, '*').then((user) => {
        if (user) {
            return user;
        }
        return importUsers(db, server).then((users) => {
            return _.find(users, (user) => {
                var link = Import.Link.find(user, server);
                if (link && link.user.id === glUser.id) {
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
    var serverLink = Import.Link.create(server);
    var criteria = { external_object: serverLink };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var user = _.find(users, (user) => {
            var userLink = Import.Link.find(user, server);
            var username = _.get(userLink, 'user.imported.username');
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
 * @param  {Object} glUser
 * @param  {Object} image
 * @param  {Server} server
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyUserProperties(user, image, server, glUser, link) {
    var userAfter = _.cloneDeep(user) || {
        role_ids: _.get(server, 'settings.user.role_ids', []),
        settings: UserSettings.default,
    };
    var imported = Import.reacquire(userAfter, link, 'user');
    Import.set(userAfter, imported, 'username', glUser.username);
    Import.set(userAfter, imported, 'details.name', glUser.name);
    Import.set(userAfter, imported, 'details.gitlab_url', glUser.web_url);
    Import.set(userAfter, imported, 'details.skype_username', glUser.skype || undefined);
    Import.set(userAfter, imported, 'details.twitter_username', glUser.twitter || undefined);
    Import.set(userAfter, imported, 'details.linkedin_username', glUser.linkedin_name || undefined);
    Import.set(userAfter, imported, 'details.email', glUser.email);
    Import.attach(userAfter, imported, 'image', image);

    // set user type
    var mapping = _.get(server, 'settings.user.mapping', {});
    var userType;
    if (glUser.is_admin) {
        userType = mapping.admin;
    } else if (glUser.external) {
        userType = mapping.external_user;
    } else {
        userType = mapping.user;
    }
    if (user) {
        if (userType) {
            // set it if it's more privileged
            if (UserTypes.indexOf(userType) > UserTypes.indexOf(userAfter.type)) {
                userAfter.type = userType;
            }
        }
    } else {
        // new user
        if (userType) {
            userAfter.type = userType;
        } else {
            // create as disabled if user import is disabled
            userAfter.type = 'regular';
            userAfter.disabled = true;
        }
    }

    if (_.isEqual(user, userAfter)) {
        return null;
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
                err = new HttpError(resp.statusCode);
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
