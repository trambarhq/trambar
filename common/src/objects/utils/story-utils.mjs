import _ from 'lodash';
import Moment from 'moment';
import * as ListParser from 'common/utils/list-parser.mjs';
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
 * Return true if the story can be canceled
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function isCancelable(story) {
  if (!story) {
    return false;
  }
  if (hasContents(story) || story.ptime) {
    return true;
  }
  return false;
}

/**
 * Return true if the story has contents
 *
 * @param  {Story}  story
 *
 * @return {Boolean}
 */
function hasContents(story) {
  if (!story) {
    return false;
  }
  if (!_.isEmpty(_.get(story, 'details.text'))) {
    return true;
  }
  if (!_.isEmpty(_.get(story, 'details.resources'))) {
    return true;
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

function extractUserAnswers(story, locale) {
  const { p } = locale;
  const langText = p(story.details.text);
  const tokens = ListParser.extract(langText);
  const answers = {};
  for (let token of tokens) {
    for (let item of token) {
      if (story.type === 'task-list') {
        _.set(answers, [ item.list, item.key ], item.checked);
      } else if (story.type === 'survey') {
        if (item.checked) {
          _.set(answers, item.list, item.key);
        } else {
          _.set(answers, item.list, undefined);
        }
      }
    }
  }
  return answers;
}

function insertUserAnswers(story, answers) {
  const storyUpdated = _.cloneDeep(story);
  const taskCounts = [];
  storyUpdated.details.text = _.mapValues(story.details.text, (langText) => {
    const tokens = ListParser.extract(langText);
    for (let token of tokens) {
      for (let item of token) {
        let checked;
        if (story.type === 'task-list') {
          checked = !!_.get(answers, [ item.list, item.key ]);
        } else if (story.type === 'survey') {
          checked = (_.get(answers, item.list) === item.key);
        }
        ListParser.update(item, checked);
      }
    }
    if (story.type === 'task-list') {
      const unfinished = ListParser.count(tokens, false);
      taskCounts.push(unfinished);
    }
    return ListParser.join(tokens);
  });
  if (story.type === 'task-list') {
    storyUpdated.unfinished_tasks = _.max(taskCounts);
  }
  return storyUpdated;
}

function removeSuperfluousDetails(story) {
  // remove text object from details if it's empty
  let text = _.get(story, 'details.text');
  text = _.pickBy(text);
  if (_.isEmpty(text)) {
    story = _.decoupleUnset(story, 'details.text');
  } else {
    story = _.decoupleSet(story, 'details.text', text);
  }

  // remove empty resources array
  let resources = _.get(story, 'details.resources');
  if (_.isEmpty(resources)) {
    story = _.decoupleUnset(story, 'details.resources');
  }
  return story;
}

const trafficRobot = {
  robot: true,
  type: 'traffic'
};

function findRobot(story) {
  if (story) {
    switch (story.type) {
      case 'website-traffic': return trafficRobot;
    }
  }
}

export {
  isSaved,
  isEditable,
  isTrackable,
  isCancelable,
  hasContents,
  isActuallyPublished,
  wasPublishedWithin,
  wasBumpedWithin,
  hasUncomittedChanges,
  mergeRemoteChanges,
  extractUserAnswers,
  insertUserAnswers,
  removeSuperfluousDetails,
  findRobot,
};
