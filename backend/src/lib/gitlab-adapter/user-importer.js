var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Request = require('request');
var HttpError = require('errors/http-error');
var UserTypes = require('objects/types/user-types');
var UserSettings = require('objects/settings/user-settings');

var Import = require('external-services/import');
var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var User = require('accessors/user');

exports.importEvent = importEvent;
exports.importUsers = importUsers;
exports.importUser = importUser;
exports.importProjectMembers = importProjectMembers;
exports.updateUser = updateUser;
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
 * @return {Promise}
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
 * @param  {Array<Object>} glUsers
 *
 * @return {Promise<User>}
 */
function importUsers(db, server, glUsers) {
    glUsers = _.uniqBy(glUsers, 'id');
    var criteria = {
        external_object: Import.Link.create(server, {
            user: {
                id: _.map(glUsers, 'id')
            }
        })
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var existingUsers = [];
        var unimported = _.filter(glUsers, (glUser) => {
            var user = _.find(users, (user) => {
                var userLink = Import.Link.find(user, server);
                if (userLink.user.id === glUser.id) {
                    return true;
                }
            });
            if (!user) {
                return true;
            } else {
                existingUsers.push(user);
                return false;
            }
        });
        if (_.isEmpty(unimported)) {
            return existingUsers;
        }
        // need to fetch the full-list, as result from /users/:id doesn't have
        // is_admin for some reason
        return fetchUsers(server).filter((glUser) => {
            return _.some(unimported, { id: glUser.id });
        }).mapSeries((glUser) => {
            // import profile image
            return importProfileImage(glUser).then((image) => {
                // find existing user by email and root account
                return findExistingUser(db, glUser).then((user) => {
                    var link = Import.Link.create(server, {
                        user: { id: glUser.id }
                    });
                    var userAfter = copyUserProperties(user, image, server, glUser, link);
                    if (user) {
                        return User.updateOne(db, 'global', userAfter);
                    } else {
                        return User.insertUnique(db, 'global', userAfter);
                    }
                });
            });
        }).then((importedUsers) => {
            return _.concat(existingUsers, importedUsers);
        });
    });
}

/**
 * Find an existing user to link Gitlab account to
 *
 * @param  {Database} db
 * @param  {[type]} glUser
 *
 * @return {[type]}
 */
function findExistingUser(db, glUser) {
    var strategies = [ 'email', 'username' ];
    return Promise.reduce(strategies, (matching, strategy) => {
        if (matching) {
            return matching;
        }
        var criteria = { deleted: false, order: 'id' };
        if (strategy === 'email' && glUser.email) {
            criteria.email = glUser.email;
        } else if (strategy === 'username' && glUser.username === 'root') {
            criteria.username = glUser.username;
        } else {
            return null;
        }
        return User.findOne(db, 'global', criteria, '*');
    }, null);
}

/**
 * Import a single Gitlab user
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} glUser
 *
 * @return {Promise<User>}
 */
function importUser(db, server, glUser) {
    if (!glUser) {
        return Promise.resolve(null);
    }
    return importUsers(db, server, [ glUser ]).then((users) => {
        return users[0] || null;
    });
}

/**
 * Update a user
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {User} user
 *
 * @return {Promise<User>}
 */
function updateUser(db, server, user) {
    var link = Import.Link.find(user, server);
    return fetchUser(server, link.user.id).then((glUser) => {
        return importProfileImage(glUser).then((image) => {
            var userAfter = copyUserProperties(user, image, server, glUser, link);
            if (userAfter) {
                return User.updateOne(db, 'global', user);
            } else {
                return user;
            }
        });
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
 * Import members of Gitlab project into Trambar project
 *
 * @param  {Database} db
 * @param  {Project} project
 *
 * @return {Promise<Array>}
 */
function importProjectMembers(db, project) {
    return importProjectRepoMembers(db, project).then((members) => {
        var newMembers = _.filter(members, (member) => {
            return !_.includes(project.user_ids, member.id);
        });
        if (_.isEmpty(newMembers)) {
            return [];
        }
        var newMemberIds = _.map(newMembers, 'id');
        return Project.addMembers(db, 'global', project.id, newMemberIds).then((project) => {
            return newMembers;
        });
    });
}

/**
 * Import members of Gitlab repos connected to project
 *
 * @param  {Database} db
 * @param  {Project} project
 *
 * @return {Array<User>}
 */
function importProjectRepoMembers(db, project) {
    var criteria = {
        id: project.repo_ids,
        type: 'gitlab',
        deleted: false,
    };
    return Repo.find(db, 'global', criteria, '*').map((repo) => {
        var links = _.filter(repo.external, { type: 'gitlab' });
        var criteria = {
            id: _.map(links, 'server_id'),
            deleted: false,
        };
        return Server.find(db, 'global', criteria, '*').each((server) => {
            return fetchRepoMembers(server, link.project.id).then((glUsers) => {
                return importUsers(db, server, glUsers);
            });
        });
    }).then((memberLists) => {
        return _.flatten(memberLists);
    });
}

/**
 * Retrieve member records from Gitlab (these are not complete user records)
 *
 * @param  {Server} server
 * @param  {Number} glRepoId
 *
 * @return {Promise<Array<Object>>}
 */
function fetchRepoMembers(server, glRepoId) {
    var url = `/projects/${glRepoId}/members`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve user record from Gitlab
 *
 * @param  {Server} server
 *
 * @return {Promise<Object>}
 */
function fetchUsers(server) {
    var url = `/users`;
    return Transport.fetchAll(server, url);
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
