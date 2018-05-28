var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findProject,
    findAllProjects,
    findCurrentProject,
    findActiveProjects,
    findProjectsWithMembers,
    findProjectLinks,
};

/**
 * Find project by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Project>}
 */
function findProject(db, id) {
    return db.findOne({
        schema: 'global',
        table: 'project',
        criteria: { id },
        required: true
    });
}

/**
 * Find all projects
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Project>>}
 */
function findAllProjects(db, minimum) {
    return db.find({
        table: 'project',
        criteria: {},
        minimum
    });
}

/**
 * Find current project, as determined by database object's preset schema
 *
 * @param  {Database} db
 *
 * @return {Promise<Project>}
 */
function findCurrentProject(db) {
    return db.findOne({
        schema: 'global',
        table: 'project',
        criteria: { name: db.context.schema + '' },
        required: true
    });
}

/**
 * Find projects that aren't deleted or archived
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Project>>}
 */
function findActiveProjects(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'project',
        criteria: {
            achived: false,
            deleted: false,
        },
        minimum
    });
}

/**
 * Find projects that have given users as members
 *
 * @param  {Database} db
 * @param  {Array<User>} users
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Project>>}
 */
function findProjectsWithMembers(db, users, minimum) {
    var ids = _.map(users, 'id');
    if (_.isEmpty(ids)) {
        return Promise.resolve(Empty.array);
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema: 'global',
        table: 'project',
        criteria: { user_ids: ids },
        minimum
    });
}

/**
 * Find links to products
 *
 * @param  {Database} db
 *
 * @return {PRomise<Array<Object>>}
 */
function findProjectLinks(db) {
    return db.find({
        schema: 'local',
        table: 'project_link',
        criteria: {},
    }).filter((link) => {
        return db.findOne({
            schema: 'local',
            table: 'session',
            criteria: { key: link.address },
        }).then((record) => {
            if (record) {
                var now = (new Date).toISOString();
                if (now < record.etime) {
                    return true;
                }
            }
        });
    });
}
