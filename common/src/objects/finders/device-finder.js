var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findUserDevices,
};

/**
 * Find devices belonging to a given user
 *
 * @param  {Database} db
 * @param  {User} user
 *
 * @return {Promise<Array<Object>>}
 */
function findUserDevices(db, user) {
    if (!user) {
        return Promise.resolve(Empty.array);
    }
    return db.find({
        schema: 'global',
        table: 'device',
        criteria: {
            user_id: user.id
        }
    });
}
