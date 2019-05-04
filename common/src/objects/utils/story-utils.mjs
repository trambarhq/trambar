import _ from 'lodash';
import Moment from 'moment';
import { mergeObjects } from '../../data/merger.mjs';
import { mergeLists } from './resource-utils.mjs';
import {
    TrackableStoryTypes,
    EditableStoryTypes
} from '../types/story-types';

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
    if (_.includes(EditableStoryTypes, story.type)) {
        return true;
    }
    if (story.type === 'issue') {
        if (story.details.exported) {
            return true;
        }
    }
    return false;
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
    if (story.type === 'issue') {
        if (story.details.exported) {
            return true;
        }
    }
    return _.includes(TrackableStoryTypes, story.type || 'post');
}

/**
 * Return true if story is published within the given time
 *
 * @param  {Story}  story
 * @param  {Number}  time
 * @param  {String}  unit
 *
 * @return {Boolean}
 */
function wasPublishedWithin(story, time, unit) {
    if (!story || !story.published) {
        return false;
    }
    let ptime = story.ptime;
    if (!ptime) {
        return true;
    }
    if (Moment() < Moment(ptime).add(time, unit)) {
        return true;
    }
    return false;
}

/**
 * Return true if story is published within the given time
 *
 * @param  {Story}  story
 * @param  {Number}  time
 * @param  {String}  unit
 *
 * @return {Boolean}
 */
function wasBumpedWithin(story, time, unit) {
    if (!story || !story.published) {
        return false;
    }
    let btime = story.btime || story.ptime;
    if (!btime) {
        return true;
    }
    if (Moment() < Moment(btime).add(time, unit)) {
        return true;
    }
    return false;
}

/**
 * Return true if the story has changes that's sitting in the save queue,
 * awaiting delivery to remote server
 *
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function hasUncomittedChanges(story) {
    // a special property set by RemoteDataSource
    return story.uncommitted;
}

/**
 * Perform three-way merge on story, putting merged properties into local copy
 *
 * @param  {Story} local
 * @param  {Story} remote
 * @param  {Story} common
 *
 * @return {Boolean}
 */
function mergeRemoteChanges(local, remote, common) {
    if (!remote) {
        // no merging if the object has vanished from remote database
        return false;
    }
    let resolveFns = {
        details: {
            resources: mergeLists
        }
    };
    let merged = mergeObjects(local, remote, common, resolveFns);
    _.assign(local, merged);
    return true;
}

export {
    isSaved,
    isEditable,
    isTrackable,
    isActuallyPublished,
    wasPublishedWithin,
    wasBumpedWithin,
    hasUncomittedChanges,
    mergeRemoteChanges,
};
