import _ from 'lodash';
import Promise from 'bluebird';

const emptyArray = [];

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
        return Promise.resolve(emptyArray);
    }
    return db.find({
        schema: 'global',
        table: 'device',
        criteria: {
            user_id: user.id
        },
        prefetch: true,
        minimum
    });
}

export {
    findUserDevices,
};
