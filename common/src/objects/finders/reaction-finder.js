const table = 'reaction';
const emptyArray = [];

/**
 * Find reactions to given stories
 *
 * @param  {Database} db
 * @param  {Story[]} stories
 * @param  {User} currentUser
 * @param  {number|undefined} minimum
 *
 * @return {Reaction[]}
 */
async function findReactionsToStories(db, stories, currentUser, minimum) {
  const storyIDs = [];
  for (let story of stories) {
    if (story && story.id >= 1 && !storyIDs.includes(story.id)) {
      storyIDs.push(story.id);
    }
  }
  if (storyIDs.length === 0 || !currentUser) {
    return emptyArray;
  }
  return db.find({
    table,
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
