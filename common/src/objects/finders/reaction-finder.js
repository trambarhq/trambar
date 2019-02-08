import _ from 'lodash';

const emptyArray = [];

/**
 * Find reactions to given stories
 *
 * @param  {Database} db
 * @param  {Array<Story>} stories
 * @param  {User} currentUser
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Reaction>>}
 */
async function findReactionsToStories(db, stories, currentUser, minimum) {
    var storyIDs = _.filter(_.uniq(_.map(stories, 'id')), (id) => {
        return (id >= 1);
    });
    if (_.isEmpty(storyIDs) || !currentUser) {
        return emptyArray;
    }
    return db.find({
        table: 'reaction',
        criteria: {
            story_id: storyIDs,
            public: (currentUser.type === 'guest') ? true : undefined
        },
        minimum
    });
}

export {
    findReactionsToStories,
};
