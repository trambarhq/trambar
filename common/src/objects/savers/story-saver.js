import _ from 'lodash';
import Moment from 'moment';

const table = 'story';

async function saveStory(db, story) {
  const storyAfter = await db.saveOne({ table }, story);
  return storyAfter;
}

async function removeStory(db, story) {
  const storyAfter = await db.removeOne({ table }, story);
  return storyAfter;
}

async function hideStory(db, story, hidden) {
  return saveStory(db, { id: story.id, public: !hidden });
}

async function unpublishStory(db, story) {
  let storyAfter;
  if (story.id > 1) {
    // create a temporary object linked to this one
    const tempCopy = _.omit(story, 'id', 'published', 'ptime');
    tempCopy.published_version_id = story.id;
    storyAfter = await saveStory(db, tempCopy);
  } else {
    // story hasn't been saved yet--edit it directly
    const changes = {
      id: story.id,
      published: false,
    };
    storyAfter = await saveStory(db, changes);
  }
  return storyAfter;
}

async function bumpStory(db, story) {
  const changes = {
    id: story.id,
    bump: true,
    btime: Moment().toISOString(),
  };
  return saveStory(db, changes);
}

export {
  saveStory,
  hideStory,
  unpublishStory,
  bumpStory,
  removeStory,
};
