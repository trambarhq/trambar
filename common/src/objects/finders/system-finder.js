var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findSystem,
};

/**
 * Find system object
 *
 * @param  {Database} db
 *
 * @return {Promise<System>}
 */
function findSystem(db) {
    return db.findOne({
        schema: 'global',
        table: 'system',
        criteria: {},
        prefetch: true,
    }).then((system) => {
        return system || {};
    });
}
