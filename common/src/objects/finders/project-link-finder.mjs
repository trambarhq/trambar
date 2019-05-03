import _ from 'lodash';
import * as ProjectFinder from 'objects/finders/project-finder';

/**
 * Find all project links
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<ProjectLink>>}
 */
async function findAllLinks(db) {
    return db.find({
        schema: 'local',
        table: 'project_link',
        criteria: {},
    });
}

/**
 * Return true if a link points to a project with unexpired session
 *
 * @param  {ProjectLink}  link
 *
 * @return {Boolean}
 */
async function hasUnexpiredSession(db, link) {
    let record = await db.findOne({
        schema: 'local',
        table: 'session',
        criteria: { key: link.address },
    });
    if (record) {
        let now = (new Date).toISOString();
        if (now < record.etime) {
            return true;
        }
    }
    return false;
}

/**
 * Find links to projects at a server
 *
 * @param  {Database} db
 * @param  {String} address
 *
 * @return {Promise<Array<ProjectLink>>}
 */
async function findLinksToServer(db, address) {
    return db.find({
        schema: 'local',
        table: 'project_link',
        criteria: { address },
    });
}

/**
 * Find links to projects with unexpired session
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<ProjectLink>>}
 */
async function findActiveLinks(db) {
    let results = [];
    let links = await findAllLinks(db);
    for (let link of links) {
        let active = await hasUnexpiredSession(db, link);
        if (active) {
            results.push(link);
        }
    }
    return results;
}

/**
 * Return links to projects that no longer exists (or have become inaccessible)
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<ProjectLink>>}
 */
async function findDefunctLinks(db) {
    let results = [];
    let { address } = db.context;
    let projects = await ProjectFinder.findAllProjects(db);
    let links = await findLinksToServer(db, address);
    for (let link of links) {
        if (!_.some(projects, { name: link.schema })) {
            results.push(link);
        }
    }
    return results;
}

/**
 * Find link of project
 *
 * @param  {Database} db
 * @param  {Project} project
 *
 * @return {Promise<Project|null>}
 */
async function findProjectLink(db, project) {
    if (!project) {
        return null;
    }
    let { address } = db.context;
    let schema = project.name;
    let key = `${address}/${schema}`;
    return db.findOne({
        schema: 'local',
        table: 'project_link',
        criteria: { key }
    });
}

export {
    findAllLinks,
    findLinksToServer,
    findActiveLinks,
    findDefunctLinks,
    findProjectLink,
};
