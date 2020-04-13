import _ from 'lodash';
import ReactionTypes, { EditableReactionTypes } from '../types/reaction-types.js';

import {
  mergeRemoteChanges,
  hasContents,
  wasPublishedWithin,
  removeSuperfluousDetails,
} from './story-utils.js';

/**
 * Return true if the reaction has a valid database id
 *
 * @param  {Reaction} reaction
 *
 * @return {boolean}
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
 * @return {boolean}
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
 * @return {boolean}
 */
function isEditable(reaction) {
  if (!reaction) {
    return false;
  }
  return EditableReactionTypes.includes(reaction.type);
}

/**
 * Return true if the reaction has changes that's sitting in the save queue,
 * awaiting delivery to remote server
 *
 * @param  {Reaction} reaction
 *
 * @return {boolean}
 */
function hasUncomittedChanges(reaction) {
  // a special property set by RemoteDataSource
  return reaction.uncommitted;
}

export {
  isSaved,
  isActuallyPublished,
  isEditable,
  hasContents,
  wasPublishedWithin,
  hasUncomittedChanges,
  mergeRemoteChanges,
  removeSuperfluousDetails,
};
