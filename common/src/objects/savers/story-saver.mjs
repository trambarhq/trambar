import _ from 'lodash';

const table = 'story';

async function saveStory(db, story) {
    const storyAfter = db.saveOne({ table }, story);
    return storyAfter;
}

async function unpublishStory(story) {
    let storyAfter;
    if (story.id > 1) {
        // create a temporary object linked to this one
        const tempCopy = _.omit(story, 'id', 'published', 'ptime');
        tempCopy.published_version_id = story.id;
        storyAfter = await db.saveOne({ table }, tempCopy);
    } else {
        // story hasn't been saved yet--edit it directly
        const changes = {
            id: story.id,
            published: false,
        };
        storyAfter = await db.saveOne({ table }, changes);
    }
    return storyAfter;
}

async function removeStory(story) {
    const storyAfter = await db.removeOne({ table }, story);
    return storyAfter;
}

async function bumpStory(story) {
    const changes = {
        id: story.id,
        bump: true,
        btime: Moment().toISOString(),
    };
    const storyAfter = await db.saveOne({ table: 'story' }, changes);
    return storyAfter;
}
