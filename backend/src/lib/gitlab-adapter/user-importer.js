var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Request = require('request');
var HttpError = require('errors/http-error');

var Transport = require('gitlab-adapter/transport');
var Import = require('gitlab-adapter/import');

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
    var repoLink = _.find(repo.external, {
        type: 'gitlab',
        server_id: server.id,
    });
    var userLink = {
        type: 'gitlab',
        server_id: server.id,
        user: { id: glEvent.author_id }
    };
    var link = _.merge({}, repoLink, userLink);
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
        external_object: {
            type: 'gitlab',
            server_id: server.id,
            user: {
                id: _.map(glUsers, 'id')
            }
        }
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        return Promise.map(glUsers, (glUser) => {
            var link = {
                type: 'gitlab',
                server_id: server.id,
                user: { id: glUser.id }
            };
            var user = _.find(users, (user) => {
                return _.some(user.external, link);
            });
            if (user) {
                // already imported
                return user;
            }
            // retrieve the full profile
            return fetchUser(server, glUser.id).then((glUser) => {
                return importProfileImage(glUser).then((image) => {
                    // find user by email
                    var criteria = { email: glUser.email, deleted: false };
                    return User.findOne(db, 'global', criteria, '*').then((user) => {
                        var userNew = copyUserProperties(null, image, glUser, link);
                        return User.saveOne(db, 'global', userNew);
                    });
                });
            });
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
    var link = _.find(user.external, {
        type: 'gitlab',
        server_id: server.id,
    });
    return fetchUser(server, link.user.id).then((glUser) => {
        return importProfileImage(glUser).then((image) => {
            var userAfter = copyUserProperties(user, glUser, image, link);
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
 * @param  {Object} profileImage
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyUserProperties(user, profileImage, glUser, link) {
    var userAfter = _.cloneDeep(user) || {};
    var imported = Import.reacquire(userAfter, link);
    Import.set(userAfter, imported, 'type', (glUser.is_admin) ? 'admin' : 'member');
    Import.set(userAfter, imported, 'username', glUser.username);
    Import.set(userAfter, imported, 'details.name', glUser.name);
    Import.set(userAfter, imported, 'details.gitlab_url', glUser.web_url);
    Import.set(userAfter, imported, 'details.skype_username', glUser.skype || undefined);
    Import.set(userAfter, imported, 'details.twitter_username', glUser.twitter || undefined);
    Import.set(userAfter, imported, 'details.linkedin_username', glUser.linkedin_name || undefined);
    Import.set(userAfter, imported, 'details.email', glUser.email);
    Import.attach(userAfter, imported, 'image', profileImage);
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
        var link = _.find(repo.external, { type: 'gitlab' });
        var criteria = {
            id: link.server_id,
            deleted: false,
        };
        return Server.findOne(db, 'global', criteria, '*').then((server) => {
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
 * @param  {Number} glUserId
 *
 * @return {Promise<Object>}
 */
function fetchUser(server, glUserId) {
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
