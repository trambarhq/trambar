var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var HttpError = require('errors/http-error');

var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var User = require('accessors/user');

exports.importUsers = importUsers;
exports.importUser = importUser;
exports.importProjectMembers = importProjectMembers;
exports.updateUser = updateUser;

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
    var criteria = {
        server_id: server.id,
        external_id: _.map(glUsers, 'id'),
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        return Promise.map(glUsers, (glUser) => {
            var user = _.find(users, { external_id: glUser.id });
            if (!user) {
                // retrieve the full profile
                return retrieveUser(server, glUser.id).then((glUser) => {
                    return retrieveProfileImage(glUser).then((image) => {
                        // find user with the username
                        var criteria = {
                            username: glUser.username,
                            deleted: false,
                        };
                        return User.findOne(db, 'global', criteria, '*').then((user) => {
                            if (!user) {
                                user = {
                                    details: {},
                                };
                            }
                            if (!user.server_id) {
                                user.server_id = server.id;
                                user.external_id = glUser.id;
                            }
                            copyUserDetails(user, glUser, image);
                            return User.saveOne(db, 'global', user);
                        });
                    });
                });
            } else {
                return user;
            }
        });
    });
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
    return retrieveUser(server, user.external_id).then((glUser) => {
        return retrieveProfileImage(glUser).then((image) => {
            var userBefore = _.cloneDeep(user);
            copyUserDetails(user, glUser, image);
            if (_.isEqual(user, userBefore)) {
                return User.updateOne(db, 'global', user);
            }
        });
    });
}

/**
 * Copy details from Gitlab user object
 *
 * @param  {User} user
 * @param  {Object} glUser
 * @param  {Object} profileImage
 */
function copyUserDetails(user, glUser, profileImage) {
    user.username = glUser.username;
    user.details.name = glUser.name;
    var nameParts = _.split(glUser.name, /\s+/);
    user.details.first_name = (nameParts.length >= 2) ? _.first(nameParts) : undefined;
    user.details.last_name = (nameParts.length >= 2) ? _.last(nameParts) : undefined;
    user.details.gitlab_url = glUser.web_url;
    user.details.skype_username = glUser.skype || undefined;
    user.details.twitter_username = glUser.twitter || undefined;
    user.details.linkedin_username = glUser.linkedin_name || undefined;
    user.details.email = glUser.email;

    // set user type
    if (!user.type) {
        if (glUser.is_admin) {
            user.type = 'admin';
        } else {
            user.type = 'member';
        }
    }

    // attach profile image
    if (profileImage) {
        var resources = user.details.resources;
        var existing = _.find(resources, { type: 'image' });
        if (existing) {
            if (existing.from_gitlab) {
                var index = _.indexOf(resources, existing);
                resources[index] = profileImage;
            }
        } else {
            if (!resources) {
                resources = user.details.resources = [];
            }
            resources.push(profileImage);
        }
    }
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
        var criteria = {
            id: repo.server_id,
            deleted: false,
        };
        return Server.findOne(db, 'global', criteria, '*').then((server) => {
            return retrieveRepoMembers(server, repo.external_id).then((glUsers) => {
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
function retrieveRepoMembers(server, glRepoId) {
    var url = `/projects/${glRepoId}/members`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve user record from Gitlab
 *
 * @param  {Server} server
 * @param  {Number} glUserId
 *
 * @return {Promise<Object>}
 */
function retrieveUser(server, glUserId) {
    var url = `/users/${glUserId}`;
    return Transport.fetch(server, url);
}

/**
 * Ask Media Server to import a Gitlab user's avatar
 *
 * @param  {Object} glUser
 *
 * @return {Promise<Object>}
 */
function retrieveProfileImage(glUser) {
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
                var image = body;
                image.from_gitlab = true;
                resolve(image);
            } else {
                console.log('Unable to retrieve profile image: ' + url);
                resolve(null);
            }
        });
    });
}
