const table = 'reaction';
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
  const storyIDs = [];
  for (let story of stories) {
    if (story.id >= 1 && storyIDs.includes(story.id)) {
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
