var _ = require('lodash');
var Moment = require('moment');
var Merger = require('data/merger');
var ReactionTypes = require('objects/types/reaction-types');
var StoryUtils = require('objects/utils/story-utils');

module.exports = {
    isSaved,
    isActuallyPublished,
    isEditable,
    wasPublishedWithin,
    hasUncomittedChanges,
    mergeRemoteChanges: StoryUtils.mergeRemoteChanges,
};

/**
 * Return true if the reaction has a valid database id
 *
 * @param  {Reaction} reaction
 *
 * @return {Boolean}
 */
function isSaved(reaction) {
    if (!reaction) {
        return false;
    }
    if (reaction.id < 1) {
        return false;
    }
    return true;
}

/**
 * Return true if the reaction's published state has been saved
 *
 * @param  {Reaction} reaction
 *
 * @return {Boolean}
 */
function isActuallyPublished(reaction) {
    if (!reaction) {
        return false;
    }
    if (!reaction.ptime) {
        return false;
    }
    return true;
}

/**
 * Return true if the reaction is of a type that can be edited
 *
 * @param  {Reaction} reaction
 *
 * @return {Boolean}
 */
function isEditable(reaction) {
    if (!reaction) {
        return false;
    }
    return _.includes(ReactionTypes.editable, reaction.type);
}

/**
 * Return true if reaction is published within the given time
 *
 * @param  {Reaction}  reaction
 * @param  {Number}  time
 * @param  {String}  unit
 *
 * @return {Boolean}
 */
function wasPublishedWithin(reaction, time, unit) {
    if (!reaction || !reaction.published) {
        return false;
    }
    var ptime = reaction.ptime;
    if (!ptime) {
        return true;
    }
    if (Moment() < Moment(ptime).add(time, unit)) {
        return true;
    }
    return false;
}

/**
 * Return true if the reaction has changes that's sitting in the save queue,
 * awaiting delivery to remote server
 *
 * @param  {Reaction} reaction
 *
 * @return {Boolean}
 */
function hasUncomittedChanges(reaction) {
    // a special property set by RemoteDataSource
    return reaction.uncommitted;
}
