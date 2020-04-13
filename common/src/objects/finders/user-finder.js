import { uniqIds } from '../../utils/array-utils.js';

const schema = 'global';
const table = 'user';
const emptyArray = [];

/**
 * Find a user by ID
 *
 * @param  {Database} db
 * @param  {number} id
 *
 * @return {User}
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
 * @param  {number[]} ids
 *
 * @return {User}
 */
async function findUsers(db, ids) {
  ids = uniqIds(ids);
  if (ids.length === 0) {
    return emptyArray;
  }
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
 * @param  {number|undefined} minimum
 *
 * @return {User}
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
 * @param  {Project|Project[]} projects
 *
 * @return {User}
 */
async function findProjectMembers(db, projects) {
  const userIDs = [];
  if (projects instanceof Array) {
    for (let project of projects) {
      for (let userID of project.user_ids) {
        if (!userIDs.includes(userID)) {
          userIDs.push(userID);
        }
      }
    }
  } else {
    for (let userID of projects.user_ids) {
      if (!userIDs.includes(userID)) {
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
 * @param  {number|undefined} minimum
 *
 * @return {User}
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
 * @param  {number|undefined} minimum
 *
 * @return {User}
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
 * @param  {Role[]} roles
 * @param  {number|undefined} minimum
 *
 * @return {User}
 */
async function findUsersWithRoles(db, roles, minimum) {
  const ids = roles.map(r => r.id);
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
 * @param  {Story[]} stories
 *
 * @return {User}
 */
async function findStoryAuthors(db, stories) {
  const userIDs = stories.map(s => s.user_ids);
  return findUsers(db, userIDs);
}

/**
 * Find users who wrote a comment or liked a story
 *
 * @param  {Database} db
 * @param  {Reaction[]} reactions
 *
 * @return {User}
 */
async function findReactionAuthors(db, reactions) {
  const userIDs = reactions.map(r => r.user_id);
  return findUsers(db, userIDs);
}

/**
 * Find users to whom bookmarks were sent
 *
 * @param  {Database} db
 * @param  {Bookmark[]} bookmarks
 *
 * @return {User}
 */
async function findBookmarkRecipients(db, bookmarks) {
  const userIDs = bookmarks.map(bm => bm.target_user_id);
  return findUsers(db, userIDs);
}

/**
 * Find users who sent the bookmarks
 *
 * @param  {Database} db
 * @param  {Bookmark[]} bookmarks
 *
 * @return {User}
 */
async function findBookmarkSenders(db, bookmarks) {
  const userIDs = bookmarks.map(bm => bm.user_ids);
  return findUsers(db, userIDs);
}

/**
 * Find users whose action is being notified
 *
 * @param  {Database} db
 * @param  {Reaction[]} reactions
 *
 * @return {User}
 */
async function findNotificationTriggerers(db, notifications) {
  const userIDs = notifications.map(n => n.user_id);
  return findUsers(db, userIDs);
}

async function findSnapshotAuthors(db, snapshots) {
  const userIDs = snapshots.map(s => s.user_id);
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
