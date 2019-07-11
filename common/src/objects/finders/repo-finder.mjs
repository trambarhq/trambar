import _ from 'lodash';

const schema = 'global';
const table = 'repo';
const emptyArray = [];

/**
 * Find a repo by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Repo>}
 */
async function findRepo(db, id) {
    return db.findOne({
        schema,
        table,
        criteria: { id },
        required: true
    });
}

/**
 * Find all repos
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Repo>>}
 */
async function findAllRepos(db, minimum) {
    return db.find({
        schema,
        table,
        criteria: {},
        minimum
    });
}

/**
 * Find repo that haven't been deleted
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Repo>>}
 */
async function findExistingRepos(db, minimum) {
    return db.find({
        schema,
        table,
        criteria: {
            deleted: false
        },
        minimum
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
async function findProjectRepos(db, projects) {
    if (projects instanceof Array) {
        let ids = _.flatten(_.map(projects, 'repo_ids'));
        if (_.isEmpty(ids)) {
            return emptyArray;
        }
        ids = _.sortBy(_.uniq(ids));
        return db.find({
            schema,
            table,
            criteria: {
                id: ids,
                deleted: false
            },
        });
    } else {
        let project = projects;
        if (!project) {
            return emptyArray;
        }
        return db.find({
            schema,
            table,
            criteria: {
                id: project.repo_ids,
                deleted: false
            },
            prefetch: true,
        });
    }
}

/**
 * Find repos that can server as website template
 *
 * @param  {Database} db
 * @param  {Project|Array<Project>} id
 *
 * @return {Promise<Array<Repo>>}
 */
async function findTemplates(db) {
    return db.find({
        schema,
        table,
        criteria: {
            template: true,
            deleted: false
        },
    });
}

export {
    findRepo,
    findAllRepos,
    findExistingRepos,
    findProjectRepos,
    findTemplates,
};
