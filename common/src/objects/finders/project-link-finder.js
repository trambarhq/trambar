import _ from 'lodash';
import Promise from 'bluebird';
import ProjectFinder from 'objects/finders/project-finder';

/**
 * Find all project links
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<ProjectLink>>}
 */
function findAllLinks(db) {
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
function hasUnexpiredSession(db, link) {
    return db.findOne({
        schema: 'local',
        table: 'session',
        criteria: { key: link.address },
    }).then((record) => {
        if (record) {
            let now = (new Date).toISOString();
            if (now < record.etime) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Find links to projects at a server
 *
 * @param  {Database} db
 * @param  {String} address
 *
 * @return {Promise<Array<ProjectLink>>}
 */
function findLinksToServer(db, address) {
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
function findActiveLinks(db) {
    return findAllLinks(db).filter((link) => {
        return hasUnexpiredSession(db, link);
    });
}

/**
 * Return links to projects that no longer exists (or have become inaccessible)
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<ProjectLink>>}
 */
function findDefunctLinks(db) {
    let { address } = db.context;
    return ProjectFinder.findAllProjects(db).then((projects) => {
        return findLinksToServer(db, address).filter((link) => {
            return !_.some(projects, { name: link.schema });
        });
    });
}

/**
 * Find link of project
 *
 * @param  {Database} db
 * @param  {Project} project
 *
 * @return {Promise<Project|null>}
 */
function findProjectLink(db, project) {
    if (!project) {
        return Promise.resolve(null);
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
