import { findAllProjects } from './project-finder.js';

const schema = 'local';
const table = 'project_link';

/**
 * Find all project links
 *
 * @param  {Database} db
 *
 * @return {ProjectLink[]}
 */
async function findAllLinks(db) {
  return db.find({
    schema,
    table,
    criteria: {},
  });
}

/**
 * Return true if a link points to a project with unexpired session
 *
 * @param  {ProjectLink}  link
 *
 * @return {boolean}
 */
async function hasUnexpiredSession(db, link) {
  const record = await db.findOne({
    schema,
    table: 'session',
    criteria: { key: link.address },
  });
  if (record) {
    const now = (new Date).toISOString();
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
 * @param  {string} address
 *
 * @return {ProjectLink[]}
 */
async function findLinksToServer(db, address) {
  return db.find({
    schema,
    table,
    criteria: { address },
  });
}

/**
 * Find links to projects with unexpired session
 *
 * @param  {Database} db
 *
 * @return {ProjectLink[]}
 */
async function findActiveLinks(db) {
  const results = [];
  const links = await findAllLinks(db);
  for (let link of links) {
    const active = await hasUnexpiredSession(db, link);
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
 * @return {ProjectLink[]}
 */
async function findDefunctLinks(db) {
  const results = [];
  const { address } = db.context;
  const projects = await findAllProjects(db);
  const links = await findLinksToServer(db, address);
  for (let link of links) {
    if (!projects.some(prj => prj.name === link.schema)) {
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
 * @return {Project|null}
 */
async function findProjectLink(db, project) {
  if (!project) {
    return null;
  }
  let { address } = db.context;
  let schema = project.name;
  let key = `${address}/${schema}`;
  return db.findOne({
    schema,
    table,
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
