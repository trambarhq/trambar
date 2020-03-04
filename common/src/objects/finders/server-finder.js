import _ from 'lodash';
import * as ExternalDataUtils from '../utils/external-data-utils.js';

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
  let ids = _.filter(_.map(repos, (repo) => {
    let link = ExternalDataUtils.findLinkByServerType(repo, repo.type);
    if (link) {
      return link.server_id;
    }
  }));
  if (_.isEmpty(ids)) {
    return emptyArray;
  }
  ids = _.sortBy(_.uniq(ids));
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
