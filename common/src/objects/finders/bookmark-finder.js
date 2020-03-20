import _ from 'lodash';

const table = 'bookmark';
const emptyArray = [];

/**
 * Find bookmarks created by a user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Array<Story>} stories
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Bookmark>>}
 */
async function findBookmarksByUser(db, user, stories, minimum) {
  const storyIds = _.uniq(_.map(stories, 'id'));
  if (storyIds.length === 0 || !user) {
    return emptyArray;
  }
  storyIds.sort();
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
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Bookmark>>}
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
