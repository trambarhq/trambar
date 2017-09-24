var _ = require('lodash');
var Promise = require('bluebird');

var Transport = require('gitlab-adapter/transport');

// accessors
var Repo = require('accessors/repo');

exports.importRepositories = importRepositories;
exports.updateRepository = updateRepository;

/**
 * Import repositories that aren't in the system yet
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Repo>>}
 */
function importRepositories(db, server) {
    // get list of repos from Gitlab
    return retrieveRepos(server).then((glRepos) => {
        var criteria = {
            server_id: server.id,
        };
        return Repo.find(db, 'global', criteria, 'external_id').then((repos) => {
            return deleteMissingRepos(db, repos, glRepos).then((deleted) => {
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
 * @param  {Array<Repo>} repos
 * @param  {Array<Object>} glRepos
 *
 * @return {Promise<Array>}
 */
function deleteMissingRepos(db, repos, glRepos) {
    return Promise.filter(repos, (repo) => {
        // remove ones with corresponding Gitlab record
        return !_.some(glRepos, { id: repo.external_id });
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
 */
function addNewRepos(db, server, repos, glRepos) {
    return Promise.filter(glRepos, (glRepo) => {
        return _.some(repos, { external_id: glRepo.id });
    }).mapSeries((glRepo) => {
        // fetch labels as well
        return retrieveLabels(server, glRepo.id).then((glLabels) => {
            var repo = {
                server_id: server.id,
                external_id: glRepo.id,
                type: 'gitlab',
                details: {},
            };
            copyRepoDetails(repo, glRepo, glLabels);
            return Repo.insertOne(db, 'global', repo);
        });
    });
}

/**
 * Update info of one repo
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Repo|null>}
 */
function updateRepository(db, server, repo) {
    // retrieve record
    return retrieveRepo(server, repo.external_id).then((glRepo) => {
        // retrieve labels
        return retrieveLabels(server, repo.external_id).then((glLabels) => {
            // update the record if it's different
            var repoBefore = _.cloneDeep(repo);
            copyRepoDetails(repo, glRepo, glLabels);
            if (!_.isEqual(repo, repoBefore)) {
                return Repo.updateOne(db, 'global', repo);
            }
        });
    });
}

/**
 * Copy details from Gitlab project object
 *
 * @param  {Repo} repo
 * @param  {Object} glRepo
 * @param  {Array<Object>} glLabels
 */
function copyRepoDetails(repo, glRepo, glLabels) {
    repo.name = glRepo.name;
    repo.details.ssh_url = glRepo.ssh_url;
    repo.details.http_url = glRepo.http_url;
    repo.details.web_url = glRepo.web_url;
    repo.details.issues_enabled = glRepo.issues_enabled;
    repo.details.archived = glRepo.archived;
    repo.details.default_branch = glRepo.default_branch;
    repo.details.labels = _.map(glLabels, 'name');
    repo.details.label_colors = _.map(glLabels, 'color');
}

/**
 * Retrieve all repos on a Gitlab server
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
function retrieveRepos(server) {
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
function retrieveRepo(server, glRepoId) {
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
function retrieveLabels(server, glRepoId) {
    var url = `/projects/${glRepoId}/labels`;
    return Transport.fetchAll(server, url);
}
