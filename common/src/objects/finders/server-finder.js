import _ from 'lodash';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

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
        schema: 'global',
        table: 'server',
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
        schema: 'global',
        table: 'server',
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
async function findServersOfRepos(db, repos) {
    var ids = _.filter(_.map(repos, (repo) => {
        var link = ExternalDataUtils.findLinkByServerType(repo, repo.type);
        if (link) {
            return link.server_id;
        }
    }));
    if (_.isEmpty(ids)) {
        return emptyArray;
    }
    ids = _.sortBy(_.uniq(ids));
    return db.find({
        schema: 'global',
        table: 'server',
        criteria: { id: ids }
    });
}

export {
    findServer,
    findAllServers,
    findServersOfRepos,
};
