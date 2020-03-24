import _ from 'lodash';
import { findLinkByServerType } from '../utils/external-data-utils.js';

const schema = 'global';
const table = 'server';
const emptyArray = [];

/**
 * Find server by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Server>}
 */
async function findServer(db, id) {
  return db.findOne({
    schema,
    table,
    criteria: { id },
    required: true
  });
}

/**
 * Find server by ID
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Server>>}
 */
async function findAllServers(db, minimum) {
  return db.find({
    schema,
    table,
    criteria: {},
    minimum
  });
}

/**
 * Find servers associated with repos
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Server>>}
 */
async function findRepoServers(db, repos) {
  const ids = [];
  for (let repo of repos) {
    const link = findLinkByServerType(repo, repo.type);
    if (link && ids.includes(link.server_id)) {
      ids.push(link.server_id);
    }
  }
  if (ids.length === 0) {
    return emptyArray;
  }
  ids.sort();
  return db.find({
    schema,
    table,
    criteria: { id: ids }
  });
}

export {
  findServer,
  findAllServers,
  findRepoServers,
};
