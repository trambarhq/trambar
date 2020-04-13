import { uniqIds } from '../../utils/array-utils.js';

const table = 'bookmark';
const emptyArray = [];

/**
 * Find bookmarks created by a user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Story[]} stories
 * @param  {number|undefined} minimum
 *
 * @return {Bookmark[]}
 */
async function findBookmarksByUser(db, user, stories, minimum) {
  const storyIds = uniqIds(stories.map(s => s.id));
  if (storyIds.length === 0 || !user) {
    return emptyArray;
  }
  return db.find({
    table,
    criteria: {
      user_ids: [ user.id ],
      story_ids: storyIds,
    },
    minimum,
  });
}

/**
 * Find bookmarks intended for a user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {number|undefined} minimum
 *
 * @return {Bookmark[]}
 */
async function findBookmarksForUser(db, user, minimum) {
  return db.find({
    table,
    criteria: {
      target_user_id: user.id,
      hidden: false,
    },
    prefetch: true,
    minimum
  });
}

export {
  findBookmarksByUser,
  findBookmarksForUser,
};
