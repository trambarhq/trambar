var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');
var LinkUtils = require('objects/utils/link-utils');

module.exports = {
    findServer,
    findAllServers,
    findServersOfRepos
};

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
 *
 * @return {Promise<Array<Server>>}
 */
function findAllServers(db) {
    return db.find({
        schema: 'global',
        table: 'server',
        criteria: {}
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
        var link = LinkUtils.find(repo, { type: repo.type });
        if (link) {
            return link.server_id;
        }
    }));
    if (_.isEmpty(ids)) {
        return Promise.resolve(Empty.array);
    }
    ids = _.uniq(ids).sort();
    return db.find({
        schema: 'global',
        table: 'server',
        criteria: { id: ids }
    });
}
