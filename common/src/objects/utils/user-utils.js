var _ = require('lodash');
var Moment = require('moment');
var StoryTypes = require('objects/types/story-types');

exports.canEditStory = canEditStory;
exports.canHideStory = canHideStory;
exports.canRemoveStory = canRemoveStory;
exports.canBumpStory = canBumpStory;
exports.canAddIssue = canAddIssue;
exports.canSendBookmarks = canSendBookmarks;

/**
 * Return true if user can edit a story
 *
 * @param  {User} user
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function canEditStory(user, story) {
    if (!user || !story) {
        return false;
    }
    if (_.includes(StoryTypes.editable, story.type)) {
        if (user.type === 'admin' || user.type === 'moderator') {
            // allow editing for two weeks
            if (Moment() < Moment(story.ptime).add(14, 'day')) {
                return true;
            }
        }
        if (_.includes(story.user_ids, user.id)) {
            // allow editing for 3 days
            if (Moment() < Moment(story.ptime).add(3, 'day')) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Return true if user can hide a story
 *
 * @param  {User} user
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function canHideStory(user, story) {
    if (!user || !story) {
        return false;
    }
    if (user.type === 'admin' || user.type === 'moderator') {
        return true;
    } else if (user.type === 'regular') {
        // regular user can only hide his own stories
        if (_.includes(story.user_ids, user.id)) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can remove a story
 *
 * @param  {User} user
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function canRemoveStory(user, story) {
    if (!user || !story) {
        return false;
    }
    if (_.includes(story.user_ids, user.id)) {
        // allow removal for 3 days
        if (Moment() < Moment(story.ptime).add(3, 'day')) {
            return true;
        }
    }
    if (user.type === 'admin') {
        return true;
    }
    return false;
}

/**
 * Return true if user can bump a story
 *
 * @param  {User} user
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function canBumpStory(user, story) {
    if (!user || !story) {
        return false;
    }
    if (_.includes(story.user_ids, user.id) || user.type === 'admin') {
        // allow bumping after a day
        if (Moment() > Moment(story.btime || story.ptime).add(1, 'day')) {
            return true;
        }
    }
    return false;
}

/**
 * Return true if user can add story to an issue tracker
 *
 * @param  {User} user
 * @param  {Story} story
 * @param  {Array<Repo>} repos
 *
 * @return {Boolean}
 */
function canAddIssue(user, story, repos) {
    if (!user || !story) {
        return false;
    }
    if (_.includes(StoryTypes.trackable, story.type || 'story')) {
        if (user.type === 'admin' || user.type === 'moderator' || _.includes(story.user_ids, user.id)) {
            return _.some(repos, (repo) => {
                if (_.includes(repo.user_ids, user.id)) {
                    if (repo.details.issues_enabled) {
                        return true;
                    }
                }
            });
        }
    }
    return false;
}

function canSendBookmarks(user, story) {
    // TODO
    return true;
}
