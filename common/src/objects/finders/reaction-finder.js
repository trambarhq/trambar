var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findReactionsToStories,
};

/**
 * Find reactions to given stories
 *
 * @param  {Database} db
 * @param  {Array<Story>} stories
 * @param  {User} currentUser
 *
 * @return {Promise<Array<Reaction>>}
 */
function findReactionsToStories(db, stories, currentUser) {
    var storyIds = _.filter(_.uniq(_.map(stories, 'id')), (id) => {
        return (id >= 1);
    });
    if (_.isEmpty(storyIds) || !currentUser) {
        return Promise.resolve(Empty.array);
    }
    return db.find({
        table: 'reaction',
        criteria: {
            story_id: storyIds,
            public: (currentUser.type === 'guest') ? true : undefined
        },
    });
}
