var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');

module.exports = {
    findNotificationsForUser,
    findNotificationsForUserOnDate,
    findNotificationsUnseenByUser
};

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
        // disable prefetch if we're looking at the past (which shouldn't change)
        prefetch: (date >= DateTracker.today),
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
        minimum
    });
}
