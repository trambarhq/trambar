import _ from 'lodash';

const schema = 'global';
const table = 'user';
const emptyArray = [];

/**
 * Find a user by ID
 *
 * @param  {Database} db
 * @param  {Number} id
 *
 * @return {Promise<User>}
 */
async function findUser(db, id) {
  return db.findOne({
    schema,
    table,
    criteria: { id },
    required: true
  });
}

/**
 * Find users by IDs
 *
 * @param  {Database} db
 * @param  {Array<Number>} ids
 *
 * @return {Promise<User>}
 */
async function findUsers(db, ids) {
  ids = _.uniq(ids);
  if (ids.length === 0) {
    return emptyArray;
  }
  ids.sort();
  return db.find({
    schema,
    table,
    criteria: { id: ids },
  });
}

/**
 * Find all users
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
async function findAllUsers(db, minimum) {
  return db.find({
    schema,
    table,
    criteria: {},
    minimum
  });
}

/**
 * Find users who're members of given project(s)
 *
 * @param  {Database} db
 * @param  {Project|Array<Project>} projects
 *
 * @return {Promise<User>}
 */
async function findProjectMembers(db, projects) {
  const userIDs = [];
  if (projects instanceof Array) {
    for (let project of projects) {
      for (let userID of project.user_ids) {
        if (userIDs.includes(userID)) {
          userIDs.push(userID);
        }
      }
    }
  } else {
    for (let userID of projects.user_ids) {
      if (userIDs.includes(userID)) {
        userIDs.push(userID);
      }
    }
  }
  return findUsers(db, userIDs);
}

/**
 * Find users who aren't deleted
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
async function findExistingUsers(db, minimum) {
  return db.find({
    schema,
    table,
    criteria: { deleted: false },
    minimum
  });
}

/**
 * Find users who aren't deleted or disabled
 *
 * @param  {Database} db
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
async function findActiveUsers(db, minimum) {
  return db.find({
    schema,
    table,
    criteria: {
      deleted: false,
      disabled: false,
    },
    minimum
  });
}

/**
 * Find users with given roles
 *
 * @param  {Database} db
 * @param  {Array<Role>} roles
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<User>}
 */
async function findUsersWithRoles(db, roles, minimum) {
  let ids = _.map(roles, 'id');
  ids = _.sortBy(_.uniq(ids));
  return db.find({
    schema,
    table,
    criteria: { role_ids: ids },
    minimum
  });
}

/**
 * Find users who're authors or co-authors of given stories
 *
 * @param  {Database} db
 * @param  {Array<Story>} stories
 *
 * @return {Promise<User>}
 */
async function findStoryAuthors(db, stories) {
  const userIDs = _.flatten(_.map(stories, 'user_ids'));
  return findUsers(db, userIDs);
}

/**
 * Find users who wrote a comment or liked a story
 *
 * @param  {Database} db
 * @param  {Array<Reaction>} reactions
 *
 * @return {Promise<User>}
 */
async function findReactionAuthors(db, reactions) {
  const userIDs = _.map(reactions, 'user_id');
  return findUsers(db, userIDs);
}

/**
 * Find users to whom bookmarks were sent
 *
 * @param  {Database} db
 * @param  {Array<Bookmark>} bookmarks
 *
 * @return {Promise<User>}
 */
async function findBookmarkRecipients(db, bookmarks) {
  const userIDs = _.map(bookmarks, 'target_user_id');
  return findUsers(db, userIDs);
}

/**
 * Find users who sent the bookmarks
 *
 * @param  {Database} db
 * @param  {Array<Bookmark>} bookmarks
 *
 * @return {Promise<User>}
 */
async function findBookmarkSenders(db, bookmarks) {
  const userIDs = _.flatten(_.map(bookmarks, 'user_ids'));
  return findUsers(db, userIDs);
}

/**
 * Find users whose action is being notified
 *
 * @param  {Database} db
 * @param  {Array<Reaction>} reactions
 *
 * @return {Promise<User>}
 */
async function findNotificationTriggerers(db, notifications) {
  const userIDs = _.map(notifications, 'user_id');
  return findUsers(db, userIDs);
}

async function findSnapshotAuthors(db, snapshots) {
  const userIDs = _.map(snapshots, 'user_id');
  return findUsers(db, userIDs);
}

export {
  findUser,
  findUsers,
  findAllUsers,
  findUsersWithRoles,
  findProjectMembers,
  findExistingUsers,
  findActiveUsers,
  findStoryAuthors,
  findReactionAuthors,
  findBookmarkRecipients,
  findBookmarkSenders,
  findNotificationTriggerers,
  findSnapshotAuthors,
};
