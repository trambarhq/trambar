import _ from 'lodash';
import Promise from 'bluebird';

const emptyArray = [];

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
 * Find project by ID
 *
 * @param  {Database} db
 * @param  {String} name
 *
 * @return {Promise<Project>}
 */
function findProjectByName(db, name) {
    return db.findOne({
        schema: 'global',
        table: 'project',
        criteria: { name },
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
        schema: 'global',
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
            archived: false,
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
    let ids = _.map(users, 'id');
    if (_.isEmpty(ids)) {
        return Promise.resolve(emptyArray);
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema: 'global',
        table: 'project',
        criteria: { user_ids: ids },
        minimum
    });
}

export {
    findProject,
    findProjectByName,
    findAllProjects,
    findCurrentProject,
    findActiveProjects,
    findProjectsWithMembers,
};
