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
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Object>>}
 */
function findUserDevices(db, user, minimum) {
    if (!user) {
        return Promise.resolve(Empty.array);
    }
    return db.find({
        schema: 'global',
        table: 'device',
        criteria: {
            user_id: user.id
        },
        minimum
    });
}
