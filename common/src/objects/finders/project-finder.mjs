import _ from 'lodash';

const schema = 'global';
const table = 'project';
const emptyArray = [];

/**
 * Find project by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Project>}
 */
async function findProject(db, id) {
    return db.findOne({
        schema,
        table,
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
async function findProjectByName(db, name) {
    return db.findOne({
        schema,
        table,
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
async function findAllProjects(db, minimum) {
    return db.find({
        schema,
        table,
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
async function findCurrentProject(db) {
    return db.findOne({
        schema,
        table,
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
async function findActiveProjects(db, minimum) {
    return db.find({
        schema,
        table,
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
async function findProjectsWithMembers(db, users, minimum) {
    let ids = _.map(users, 'id');
    if (_.isEmpty(ids)) {
        return emptyArray;
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema,
        table,
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
