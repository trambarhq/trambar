var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findBookmarksByUser,
    findBookmarksForUser,
};

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
function findBookmarksByUser(db, user, stories, minimum) {
    var storyIds = _.map(stories, 'id');
    storyIds = _.sortBy(_.uniq(storyIds));
    if (_.isEmpty(storyIds) || !user) {
        return Promise.resolve(Empty.array);
    }
    return db.find({
        table: 'bookmark',
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
function findBookmarksForUser(db, user, minimum) {
    return db.find({
        table: 'bookmark',
        criteria: {
            target_user_id: user.id,
        },
        prefetch: true,
        minimum
    });
}
