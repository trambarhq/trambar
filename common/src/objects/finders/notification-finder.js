import _ from 'lodash';
import Promise from 'bluebird';
import Empty from 'data/empty';
import DateTracker from 'utils/date-tracker';
import DateUtils from 'utils/date-utils';

/**
 * Find notifications intended for a user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Notification>>}
 */
function findNotificationsForUser(db, user, minimum) {
    if (!user) {
        return Promise.resolve(Empty.array)
    }
    return db.find({
        table: 'notification',
        criteria: {
            target_user_id: user.id,
            limit: 500,
        },
        prefetch: true,
        minimum
    });
}

/**
 * Find notifications intended for a user on a given date
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {String} date
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Notification>>}
 */
function findNotificationsForUserOnDate(db, user, date, minimum) {
    if (!user) {
        return Promise.resolve(Empty.array)
    }
    return db.find({
        table: 'notification',
        criteria: {
            target_user_id: user.id,
            time_range: DateUtils.getDayRange(date),
        },
        minimum,
    })
}

/**
 * Find notifications intended for a user that he hasn't yet seen
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Notification>>}
 */
function findNotificationsUnseenByUser(db, user, minimum) {
    if (!user) {
        return Promise.resolve(Empty.array)
    }
    return db.find({
        table: 'notification',
        criteria: {
            target_user_id: user.id,
            seen: false,
            limit: 100,
        },
        prefetch: true,
        minimum
    });
}

export {
    findNotificationsForUser,
    findNotificationsForUserOnDate,
    findNotificationsUnseenByUser
    exports as default,
};
