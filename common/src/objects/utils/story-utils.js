var _ = require('lodash');
var Moment = require('moment');
var StoryTypes = require('objects/types/story-types');

module.exports = {
    isSaved,
    isActuallyPublished,
    isEditable,
    isTrackable,
    isActuallyPublished,
    hasUncomittedChanges,
};

/**
 * Return true if the story has a valid database id
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function isSaved(story) {
    if (!story) {
        return false;
    }
    if (story.id < 1) {
        return false;
    }
    return true;
}

/**
 * Return true if the story's published state has been saved
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function isActuallyPublished(story) {
    if (!story) {
        return false;
    }
    if (!story.ptime) {
        return false;
    }
    return true;
}

/**
 * Return true if the story is of a type that can be edited
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function isEditable(story) {
    if (!story) {
        return false;
    }
    return _.includes(StoryTypes.editable, story.type);
}

/**
 * Return true if the story is of a type that can be exported to issue-tracker
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function isTrackable(story) {
    if (!story) {
        return false;
    }
    return _.includes(StoryTypes.trackable, story.type || 'post')
}

/**
 * Return true if the story has changes that's sitting in the save queue,
 * awaiting delivery to remote server
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function hasUncomittedChanges(story) {
    // a special property set by RemoteDataSource
    return story.uncomitted;
}
