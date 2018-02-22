var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var LinkUtils = require('objects/utils/link-utils');

var Import = require('external-services/import');
var TaskLog = require('external-services/task-log');
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
    var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
    var link = repoLink;
    var storyNew = copyEventProperties(null, author, glEvent, link);
    return Story.insertOne(db, schema, storyNew);
}

/**
 * Copy properties of an event object
 *
 * @param  {Story|null} story
 * @param  {User} user
 * @param  {Object} glEvent
 * @param  {Object} link
 *
 * @return {Object|null}
 */
function copyEventProperties(story, author, glEvent, link) {
    var storyAfter = _.cloneDeep(story) || {};
    Import.join(storyAfter, link);
    Import.set(storyAfter, 'type', 'repo');
    Import.set(storyAfter, 'user_ids', [ author.id ]);
    Import.set(storyAfter, 'role_ids', author.role_ids);
    Import.set(storyAfter, 'published', true);
    Import.set(storyAfter, 'ptime', Moment(glEvent.created_at).toISOString());
    Import.set(storyAfter, 'public', true);
    Import.set(storyAfter, 'details.action', glEvent.action_name);
    if (_.isEqual(story, storyAfter)) {
        return null;
    }
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
    var serverLink = LinkUtils.create(server)
    var criteria = { external_object: serverLink };
    return Repo.find(db, 'global', criteria, '*').then((repos) => {
        var added = [];
        var deleted = [];
        var modified = [];
        // get list of repos from Gitlab
        return fetchRepos(server).then((glRepos) => {
            // delete ones that no longer exists
            return Promise.each(repos, (repo) => {
                var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
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
                        var link = LinkUtils.create(server, {
                            project: { id: glRepo.id }
                        });
                        var repoAfter = copyRepoDetails(repo, members, glRepo, glLabels, link);
                        if (!repoAfter) {
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
        var repoLink = LinkUtils.find(repo, { server, relation: 'project' });
        if (repoLink.project && repoLink.project.id === glRepo.id) {
            return true;
        }
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
 * @param  {Array<User>} members
 * @param  {Object} glRepo
 * @param  {Array<Object>} glLabels
 * @param  {Object} linkCriteria
 *
 * @return {Object|null}
 */
function copyRepoDetails(repo, members, glRepo, glLabels, link) {
    var repoAfter = _.cloneDeep(repo) || {};
    Import.join(repoAfter, link);
    Import.set(repoAfter, 'type', 'gitlab');
    Import.set(repoAfter, 'name', glRepo.name);
    Import.set(repoAfter, 'user_ids', _.map(members, 'id'));
    Import.set(repoAfter, 'details.web_url', glRepo.web_url);
    Import.set(repoAfter, 'details.issues_enabled', glRepo.issues_enabled);
    Import.set(repoAfter, 'details.archived', glRepo.archived);
    Import.set(repoAfter, 'details.default_branch', glRepo.default_branch);
    Import.set(repoAfter, 'details.labels', _.map(glLabels, 'name'));
    Import.set(repoAfter, 'details.label_colors', _.map(glLabels, 'color'));
    if (_.isEqual(repo, repoAfter)) {
        return null;
    }
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
