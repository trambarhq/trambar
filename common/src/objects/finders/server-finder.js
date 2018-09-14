import _ from 'lodash';
import Promise from 'bluebird';
import Empty from 'data/empty';
import ExternalDataUtils from 'objects/utils/external-data-utils';

/**
 * Find server by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<Server>}
 */
function findServer(db, id) {
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
function findAllServers(db, minimum) {
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
function findServersOfRepos(db, repos) {
    var ids = _.filter(_.map(repos, (repo) => {
        var link = ExternalDataUtils.findLinkByServerType(repo, repo.type);
        if (link) {
            return link.server_id;
        }
    }));
    if (_.isEmpty(ids)) {
        return Promise.resolve(Empty.array);
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
    exports as default,
};
