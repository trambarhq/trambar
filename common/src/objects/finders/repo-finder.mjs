import _ from 'lodash';

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
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Repo>>}
 */
async function findAllRepos(db, minimum) {
    return db.find({
        schema: 'global',
        table: 'repo',
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
        schema: 'global',
        table: 'repo',
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
            schema: 'global',
            table: 'repo',
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
            schema: 'global',
            table: 'repo',
            criteria: {
                id: project.repo_ids,
                deleted: false
            },
            prefetch: true,
        });
    }
}

export {
    findRepo,
    findAllRepos,
    findExistingRepos,
    findProjectRepos,
};
