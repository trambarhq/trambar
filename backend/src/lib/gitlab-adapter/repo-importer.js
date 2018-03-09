var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var TaskLog = require('task-log');
var ExternalObjectUtils = require('objects/utils/external-object-utils');

var Transport = require('gitlab-adapter/transport');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Story = require('accessors/story');

module.exports = {
    importEvent,
    importRepositories,
};

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var storyNew = copyEventProperties(null, server, repo, author, glEvent);
    return Story.insertOne(db, schema, storyNew);
}

/**
 * Copy properties of an event object
 *
 * @param  {Story|null} story
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} user
 * @param  {Object} glEvent
 *
 * @return {Object}
 */
function copyEventProperties(story, server, repo, author, glEvent) {
    var storyAfter = _.cloneDeep(story) || {};
    ExternalObjectUtils.inheritLink(storyAfter, server, repo);
    ExternalObjectUtils.importProperty(storyAfter, server, 'type', {
        value: 'repo',
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
    ExternalObjectUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(storyAfter, server, 'published', {
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
 * Import repositories that aren't in the system yet
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Repo>>}
 */
function importRepositories(db, server) {
    var taskLog = TaskLog.start('gitlab-repo-import', {
        server_id: server.id,
        server: server.name,
    });
    // find existing repos connected with server (including deleted ones)
    var criteria = {
        external_object: ExternalObjectUtils.createLink(server)
    };
    return Repo.find(db, 'global', criteria, '*').then((repos) => {
        var added = [];
        var deleted = [];
        var modified = [];
        // get list of repos from Gitlab
        return fetchRepos(server).then((glRepos) => {
            // delete ones that no longer exists
            return Promise.each(repos, (repo) => {
                var repoLink = ExternalObjectUtils.findLink(repo, server);
                if (!_.some(glRepos, { id: repoLink.project.id })) {
                    deleted.push(repo.name);
                    return Repo.updateOne(db, 'global', { id: repo.id, deleted: true });
                }
            }).return(glRepos);
        }).mapSeries((glRepo, index, count) => {
            // fetch issue-tracker labels
            return fetchLabels(server, glRepo.id).then((glLabels) => {
                // find matching repo
                return fetchMembers(server, glRepo.id).then((glUsers) => {
                    // add owner to the list
                    if (!_.some(glUsers, { id: glRepo.creator_id })) {
                        glUsers.push({ id: glRepo.creator_id });
                    }
                    return Promise.mapSeries(glUsers, (glUser) => {
                        return UserImporter.findUser(db, server, glUser);
                    }).filter(Boolean);
                }).then((members) => {
                    return findExistingRepo(db, server, repos, glRepo).then((repo) => {
                        var repoAfter = copyRepoDetails(repo, server, members, glRepo, glLabels);
                        if (_.isEqual(repoAfter, repo)) {
                            return repo;
                        }
                        if (repo) {
                            modified.push(repoAfter.name);
                            return Repo.updateOne(db, 'global', repoAfter).then((repoAfter) => {
                                var newMembers = _.filter(members, (user) => {
                                    // exclude root user
                                    if (user.username !== 'root') {
                                        if (!user.disabled && !user.deleted) {
                                            return !_.includes(repo.user_ids);
                                        }
                                    }
                                });
                                return addProjectMembers(db, repoAfter, newMembers).return(repoAfter);
                            });
                        } else {
                            added.push(repoAfter.name);
                            return Repo.insertOne(db, 'global', repoAfter);
                        }
                    });
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
 * Find repo from among existing ones
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Object} glRepo
 *
 * @return {Promise<Repo|null>}
 */
function findExistingRepo(db, server, repos, glRepo) {
    var repo = _.find(repos, (repo) => {
        return ExternalObjectUtils.findLink(repo, server, {
            project: { id: glRepo.id }
        });
    });
    if (repo) {
        if (repo.deleted) {
            // restore it
            return Repo.updateOne(db, 'global', { id: repo.id, deleted: false });
        } else {
            return Promise.resolve(repo);
        }
    }
    return Promise.resolve(null);
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
function addProjectMembers(db, repo, users) {
    var newUserIds = _.map(users, 'id');
    var criteria = {
        repo_ids: [ repo.id ]
    };
    return Project.find(db, 'global', criteria, 'id, user_ids').mapSeries((project) => {
        var existingUserIds = project.user_ids;
        project.user_ids = _.union(existingUserIds, newUserIds);
        return Project.updateOne(db, 'global', project);
    });
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
 * @return {Object|null}
 */
function copyRepoDetails(repo, server, members, glRepo, glLabels) {
    var repoAfter = _.cloneDeep(repo) || {};
    ExternalObjectUtils.addLink(repoAfter, server, {
        project: { id: glRepo.id }
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'type', {
        value: 'gitlab',
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'name', {
        value: glRepo.name,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'user_ids', {
        value: _.map(members, 'id'),
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.web_url', {
        value: glRepo.web_url,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.issues_enabled', {
        value: glRepo.issues_enabled,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.archived', {
        value: glRepo.archived,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.default_branch', {
        value: glRepo.default_branch,
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.labels', {
        value: _.map(glLabels, 'name'),
        overwrite: 'always',
    });
    ExternalObjectUtils.importProperty(repoAfter, server, 'details.label_colors', {
        value: _.map(glLabels, 'color'),
        overwrite: 'always',
    });
    return repoAfter;
}

/**
 * Retrieve all repos on a Gitlab server
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
function fetchRepos(server) {
    var url = `/projects`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve all labels used by a Gitlab repo
 *
 * @param  {Server} server
 * @param  {Number} glRepoId
 *
 * @return {Promise<Object>}
 */
function fetchLabels(server, glRepoId) {
    var url = `/projects/${glRepoId}/labels`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve member records from Gitlab (these are not complete user records)
 *
 * @param  {Server} server
 * @param  {Number} glRepoId
 *
 * @return {Promise<Array<Object>>}
 */
function fetchMembers(server, glRepoId) {
    var url = `/projects/${glRepoId}/members`;
    return Transport.fetchAll(server, url);
}
