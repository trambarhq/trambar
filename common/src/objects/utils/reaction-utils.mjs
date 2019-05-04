import _ from 'lodash';
import Moment from 'moment';
import ReactionTypes, { EditableReactionTypes } from '../types/reaction-types.mjs';
import { mergeRemoteChanges } from './story-utils.mjs';

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
    if (reaction.ready === false) {
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
    return _.includes(EditableReactionTypes, reaction.type);
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
    let ptime = reaction.ptime;
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

export {
    isSaved,
    isActuallyPublished,
    isEditable,
    wasPublishedWithin,
    hasUncomittedChanges,
    mergeRemoteChanges,
};
