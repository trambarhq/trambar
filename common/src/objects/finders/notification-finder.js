import _ from 'lodash';
import * as DateUtils from '../../utils/date-utils.js';

const table = 'notification';
const emptyArray = [];

/**
 * Find notifications intended for a user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Notification>>}
 */
async function findNotificationsForUser(db, user, minimum) {
  if (!user) {
    return emptyArray;
  }
  return db.find({
    table,
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
async function findNotificationsForUserOnDate(db, user, date, minimum) {
  if (!user) {
    return emptyArray;
  }
  return db.find({
    table,
    criteria: {
      target_user_id: user.id,
      time_range: DateUtils.getDayRange(date),
    },
    minimum,
  });
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
async function findNotificationsUnseenByUser(db, user, minimum) {
  if (!user) {
    return emptyArray;
  }
  return db.find({
    table,
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
};
