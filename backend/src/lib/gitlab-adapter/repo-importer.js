var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var Transport = require('gitlab-adapter/transport');
var Import = require('gitlab-adapter/import');

// accessors
var Repo = require('accessors/repo');
var Story = require('accessors/story');

exports.importEvent = importEvent;
exports.importRepositories = importRepositories;
exports.updateRepository = updateRepository;

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
 * @return {Promise}
 */
function importEvent(db, server, repo, project, author, glEvent) {
    var schema = project.name;
    var repoLink = Import.Link.find(repo, server);
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
    _.set(storyAfter, 'type', 'repo');
    _.set(storyAfter, 'user_ids', [ author.id ]);
    _.set(storyAfter, 'role_ids', author.role_ids);
    _.set(storyAfter, 'public', true);
    _.set(storyAfter, 'published', true);
    _.set(storyAfter, 'ptime', Moment(glEvent.created_at).toISOString());
    _.set(storyAfter, 'details.action', glEvent.action_name);
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
    console.log(`Importing repositories from ${server.name}`);
    // find existing repos connected with server
    var criteria = {
        external_object: Import.Link.create(server),
        deleted: false,
    };
    return Repo.find(db, 'global', criteria, '*').then((repos) => {
        // get list of repos from Gitlab
        return fetchRepos(server).then((glRepos) => {
            return deleteMissingRepos(db, server, repos, glRepos).then((deleted) => {
                return addNewRepos(db, server, repos, glRepos).then((added) => {
                    return added;
                });
            });
        });
    });
}

/**
 * Mark repo records as deleted if there're no corresponding record in Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Array<Object>} glRepos
 *
 * @return {Promise<Array<Repo>>}
 */
function deleteMissingRepos(db, server, repos, glRepos) {
    // filter out repos that we want to keep
    return Promise.filter(repos, (repo) => {
        var repoLink = Import.find(repo, server);
        return _.some(glRepos, { id: repoLink.project.id });
    }).mapSeries((repo) => {
        return Repo.updateOne(db, 'global', { id: repo.id, deleted: true });
    });
}

/**
 * Add repos that don't exist in the system yet
 *
 * @param {Database} db
 * @param {Server} server
 * @param {Array<Repo>} repos
 * @param {Array<Object>} glRepos
 *
 * @return {Promise<Array<Repo>>}
 */
function addNewRepos(db, server, repos, glRepos) {
    // filter out Gitlab records that have been imported already
    return Promise.filter(glRepos, (glRepo) => {
        return !_.some(repos, (repo) => {
            var repoLink = Import.Link.find(server);
            if (repoLink.project.id === glRepo.id) {
                return true;
            }
        });
    }).mapSeries((glRepo) => {
        // fetch labels as well
        return fetchLabels(server, glRepo.id).then((glLabels) => {
            var link = {
                type: 'gitlab',
                server_id: server.id,
                project: { id: glRepo.id }
            };
            var repoNew = copyRepoDetails(null, glRepo, glLabels, link);
            return Repo.insertOne(db, 'global', repoNew);
        });
    });
}

/**
 * Update info of one repo
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Promise<Repo|null>}
 */
function updateRepository(db, server, repo) {
    // retrieve record
    var link = Import.Link.find(repo, server);
    return fetchRepo(server, link.project.id).then((glRepo) => {
        // retrieve labels
        return fetchLabels(server, link.project.id).then((glLabels) => {
            // update the record if it's different
            var repoAfter = copyRepoDetails(repo, glRepo, glLabels, link);
            if (repoAfter) {
                return Repo.updateOne(db, 'global', repo);
            } else {
                return repo;
            }
        });
    });
}

/**
 * Copy details from Gitlab project object
 *
 * @param  {Repo|null} repo
 * @param  {Object} glRepo
 * @param  {Array<Object>} glLabels
 * @param  {Object} linkCriteria
 *
 * @return {Object|null}
 */
function copyRepoDetails(repo, glRepo, glLabels, link) {
    var repoAfter = _.cloneDeep(repo) || {};
    Import.join(repoAfter, link);
    _.set(repoAfter, 'type', 'gitlab');
    _.set(repoAfter, 'name', glRepo.name);
    _.set(repoAfter, 'details.ssh_url', glRepo.ssh_url);
    _.set(repoAfter, 'details.http_url', glRepo.http_url);
    _.set(repoAfter, 'details.web_url', glRepo.web_url);
    _.set(repoAfter, 'details.issues_enabled', glRepo.issues_enabled);
    _.set(repoAfter, 'details.archived', glRepo.archived);
    _.set(repoAfter, 'details.default_branch', glRepo.default_branch);
    _.set(repoAfter, 'details.labels', _.map(glLabels, 'name'));
    _.set(repoAfter, 'details.label_colors', _.map(glLabels, 'color'));
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
 * Retrieve a single Gitlab repo record
 *
 * @param  {Server} server
 * @param  {Number} glRepoId
 *
 * @return {Promise<Object>}
 */
function fetchRepo(server, glRepoId) {
    var url = `/projects/${glRepoId}`;
    return Transport.fetch(server, url);
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
