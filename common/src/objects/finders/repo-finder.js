var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findRepo,
    findAllRepos,
    findExistingRepos,
    findProjectRepos,
};

/**
 * Find a repo by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Repo>}
 */
function findRepo(db, id) {
    return db.findOne({
        schema: 'global',
        table: 'repo',
        criteria: { id },
        required: true
    });
}

/**
 * Find all repos
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Repo>>}
 */
function findAllRepos(db) {
    return db.find({
        schema: 'global',
        table: 'repo',
        criteria: {}
    });
}

/**
 * Find repo that haven't been deleted
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Repo>>}
 */
function findExistingRepos(db) {
    return db.find({
        schema: 'global',
        table: 'repo',
        criteria: {
            deleted: false
        }
    });
}

/**
 * Find repos connected with given project(s)
 *
 * @param  {Database} db
 * @param  {Project|Array<Project>} id
 *
 * @return {Promise<Array<Repo>>}
 */
function findProjectRepos(db, projects) {
    if (projects instanceof Array) {
        var ids = _.flatten(_.map(projects, 'repo_ids'));
        if (_.isEmpty(ids)) {
            return Promise.resolve(Empty.array);
        }
        ids = _.sortBy(_.uniq(ids));
        return db.find({
            schema: 'global',
            table: 'repo',
            criteria: {
                id: ids,
                deleted: false
            },
        });
    } else {
        var project = projects;
        if (!project) {
            return Promise.resolve(Empty.array);
        }
        return db.find({
            schema: 'global',
            table: 'repo',
            criteria: {
                id: project.repo_ids,
                deleted: false
            }
        });
    }
}
