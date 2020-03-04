import _ from 'lodash';
import Moment from 'moment';

// accessors
import { Bookmark } from '../accessors/bookmark.mjs';
import { Notification } from '../accessors/notification.mjs';
import { Project } from '../accessors/project.mjs';
import { Reaction } from '../accessors/reaction.mjs';
import { Story } from '../accessors/story.mjs';
import { User } from '../accessors/user.mjs';

/**
 * Create new notification objects based on database events
 *
 * @param  {Database} db
 * @param  {Array<Object>} events
 *
 * @return {Promise<Array<Object>>}
 */
async function generate(db, events) {
  // filter out undelete events
  events = _.filter(events, (event) => {
    if (event.diff.deleted && event.previous.deleted) {
      return false;
    } else {
      return true;
    }
  });

  // filter out event triggered by data import
  events = _.filter(events, (event) => {
    if (event.table === 'story' || event.table === 'reaction') {
      // see if event is old (created during initial import, for instance)
      const now = Moment();
      const elapsed = now - Moment(event.current.ptime);
      if (elapsed > 5 * 60 * 1000) {
        return false;
      }
    }
    return true;
  });

  const userCriteria = { deleted: false, disabled: false };
  const users = await User.findCached(db, 'global', userCriteria, '*');
  const savedNotifications = [];

  for (let event of events) {
    const entries = [];
    for (let f of notificationGeneratingFunctions) {
      const list = await f(db, event);
      for (let entry of list) {
        const notification = entry.notification;
        const user = _.find(users, { id: notification.target_user_id });
        // see if user wants to receive the notification
        if (checkUserPreference(user, notification)) {
          entries.push(entry)
        }
      }
    }
    // save the notification
    const schemas = _.uniq(_.map(entries, 'schema'));
    for (let schema of schemas) {
      const entriesForSchema = _.filter(entries, { schema });
      const notifications = _.map(entries, 'notification');
      const saved = await Notification.save(db, schema, notifications);
      for (let notification of saved) {
        savedNotifications.push(notification);
      }
    }
  }
  return savedNotifications;
}

const notificationGeneratingFunctions = [
  generateCoauthoringNotifications,
  generateStoryPublicationNotifications,
  generateReactionPublicationNotifications,
  generateUserMentionNotifications,
  generateBookmarkNotifications,
  generateJoinRequestNotifications,
];

/**
 * Generate coauthoring invitation notifications if event indicates addition of
 * new authors
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
async function generateCoauthoringNotifications(db, event) {
  if (!isModifying(event, 'story')) {
    return [];
  }
  // don't notify when we're just creating the editable copy
  if (event.diff.published_version_id) {
    return [];
  }
  // don't notify when user is assigned to issue or merge request
  if (event.current.type === 'issue' || event.current.type === 'merge-request') {
    return [];
  }
  const newCoauthorIDs = getNewCoauthorIDs(event);
  if (_.isEmpty(newCoauthorIDs)) {
    return [];
  }
  const schema = event.schema;
  const notificationType = 'coauthor';
  const storyID = event.id;
  const leadAuthorID = event.current.user_ids[0];
  const entries = _.map(newCoauthorIDs, (coauthorID) => {
    return {
      notification: {
        type: notificationType,
        story_id: storyID,
        user_id: leadAuthorID,
        target_user_id: coauthorID,
      },
      schema,
    };
  });
  return entries;
}

/**
 * Generate story notifications if event indicates a story is being published
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
async function generateStoryPublicationNotifications(db, event) {
  if (!isPublishing(event, 'story')) {
    return [];
  }
  const schema = event.schema;
  // every story type generates the a notification of the same type
  const notificationType = event.current.type;
  const storyID = event.id;
  const leadAuthorID = event.current.user_ids[0];
  // notify (potentially) all active users
  const userCriteria = { deleted: false, disabled: false };
  const users = await User.findCached(db, 'global', userCriteria, '*');
  const details = await getStoryPublicationDetails(db, schema, storyID, notificationType);
  const entries = _.map(users, (user) => {
    return {
      notification: {
        type: notificationType,
        story_id: storyID,
        user_id: leadAuthorID,
        target_user_id: user.id,
        details
      },
      schema,
    };
  });
  return entries;
}

/**
 * Return an object containing certain details from story
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Number} storyID
 * @param  {String} notificationType
 *
 * @return {Promise<Object|undefined>}
 */
async function getStoryPublicationDetails(db, schema, storyID, notificationType) {
  switch (notificationType) {
    case 'push':
    case 'merge':
    case 'branch':
    case 'tag':
    case 'snapshot':
      // need addition info from story object not contained in event
      const criteria = { id: storyID };
      const story = await Story.findOne(db, schema, criteria, 'details');
      return { branch: story.details.branch };
  }
}

/**
 * Generate reaction notifications if event indicates a reaction is being published
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
async function generateReactionPublicationNotifications(db, event) {
  if (!isPublishing(event, 'reaction')) {
    return [];
  }
  const schema = event.schema;
  // every reaction type generates the a notification of the same type
  const notificationType = event.current.type;
  const reactionID = event.id;
  const storyID = event.current.story_id;
  const respondentID = event.current.user_id;
  // notify the author(s) of the story reacted to
  const criteria = { id: storyID };
  const story = await Story.findOne(db, schema, criteria, 'type, user_ids');
  let details;
  switch (notificationType) {
    // like and comment requires the story type since they're applicable to all stories
    // note may also apply to multiple story types
    case 'like':
    case 'comment':
    case 'note':
    case 'assignment':
      details = { story_type: story.type };
      break;
  }
  const entries = _.map(story.user_ids, (authorID) => {
    return {
      notification: {
        type: notificationType,
        story_id: storyID,
        reaction_id: reactionID,
        user_id: respondentID,
        target_user_id: authorID,
        details
      },
      schema,
    };
  });
  return entries;
}

/**
 * Generate bookmark notifications if event indicates a bookmark is being sent
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
async function generateBookmarkNotifications(db, event) {
  if (!isModifying(event, 'bookmark')) {
    return [];
  }
  if (event.current.hidden) {
    return [];
  }
  const senderIDsBefore = event.previous.user_ids;
  const senderIDsAfter = event.current.user_ids;
  if (!_.isEmpty(senderIDsBefore) || _.isEmpty(senderIDsAfter)) {
    return [];
  }
  const senderID = _.first(senderIDsAfter);
  const schema = event.schema;
  const notificationType = 'bookmark';
  const storyID = event.current.story_id;
  const targetUserID = event.current.target_user_id;
  const criteria = { id: storyID, deleted: false };
  const stories = await Story.find(db, schema, criteria, 'type');
  const entries = _.map(stories, (story) => {
    return {
      notification: {
        type: notificationType,
        story_id: storyID,
        user_id: senderID,
        target_user_id: targetUserID,
        details: {
          story_type: story.type
        },
      },
      schema,
    };
  });
  return entries;
}

/**
 * Generate user mention notifications if event indicates a user is mentioned
 * in a story or reaction
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
async function generateUserMentionNotifications(db, event) {
  if (!isModifying(event, 'story') && !isModifying(event, 'reaction')) {
    return [];
  }
  let relevantTags;
  if (isPublishing(event, 'story') || isPublishing(event, 'reaction')) {
    // consider all the tags
    relevantTags = event.current.tags;
  } else if (event.current.published) {
    // consider only the ones that were added
    relevantTags = getNewTags(event);
  }
  const relevantUserTags = _.filter(relevantTags, (tag) => {
    return (tag.charAt(0) === '@');
  });
  if (_.isEmpty(relevantUserTags)) {
    return [];
  }
  const schema = event.schema;
  const notificationType = 'mention';
  const storyID = event.current.story_id;
  let reactionID;
  let authorID;
  let details;
  if (event.table === 'story') {
    storyID = event.id;
    authorID = event.current.user_ids[0];
    details = { story_type: event.current.type };
  } else if (event.table === 'reaction') {
    reactionID = event.id;
    storyID = event.current.story_id;
    authorID = event.current.user_id;
    details = { reaction_type: event.current.type };
  }
  const userCriteria = { deleted: false, disabled: false };
  const users = await User.findCached(db, 'global', userCriteria, '*');
  const mentionedUsers = _.filter(users, (user) => {
    return _.includes(relevantUserTags, `@${_.toLower(user.username)}`);
  });
  const entries = _.map(mentionedUsers, (user) => {
    return {
      notification: {
        type: notificationType,
        story_id: storyID,
        reaction_id: reactionID,
        user_id: authorID,
        target_user_id: user.id,
        details,
      },
      schema,
    };
  });
  return entries;
}

/**
 * Generate join request notifications if event indicate addition of new
 * project ids
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Array<Object>}
 */
async function generateJoinRequestNotifications(db, event) {
  const newProjectIDs = getNewRequestedProjectIDs(event);
  if (_.isEmpty(newProjectIDs)) {
    return [];
  }
  const notificationType = 'join-request';
  const userID = event.id;
  const projectCriteria = { id: newProjectIDs, deleted: false };
  const projects = await Project.find(db, 'global', projectCriteria, 'id, name');
  const userCriteria = {};
  const users = await User.findCached(db, 'global', criteria, '*');
  const admins = _.filter(users, { type: 'admin' });
  const entryLists = _.map(projects, (project) => {
    const details = {
      project_name: project.name,
      project_id: project.id,
    };
    return _.map(admins, (admin) => {
      return {
        notification: {
          type: 'join-request',
          user_id: userID,
          target_user_id: admin.id,
          details
        },
        schema: project.name,
      };
    });
  });
  const entries = _.flatten(entryLists);
  return entries;
}

/**
 * Check if an event indicates a row in the given table is being inserted/update
 *
 * @param  {Object}  event
 * @param  {String}  table
 *
 * @return {Boolean}
 */
function isModifying(event, table) {
  if (event.table === table) {
    // make sure row isn't being deleted or marked deleted
    if (event.op !== 'DELETE' && !event.current.deleted) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an event indicates a story or reaction is being published
 *
 * @param  {Object}  event
 * @param  {String}  table
 *
 * @return {Boolean}
 */
function isPublishing(event, table) {
  if (isModifying(event, table)) {
    // published can become false again when user edit a comment
    // ptime, on the other hand, will only be set when the comment is first published
    if (event.diff.ptime || event.diff.ready) {
      if (!event.previous.ptime) {
        if (event.current.published && event.current.ready) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Return ids of new coauthors
 *
 * @param  {Object} event
 *
 * @return {Array<Number>}
 */
function getNewCoauthorIDs(event) {
  if (isModifying(event, 'story')) {
    if (event.diff.user_ids) {
      const coauthorIDsBefore = _.slice(event.previous.user_ids, 1);
      const coauthorIDsAfter = _.slice(event.current.user_ids, 1);
      return _.difference(coauthorIDsAfter, coauthorIDsBefore);
    }
  }
  return [];
}

/**
 * Return new tags added to a story or reaction
 *
 * @param  {Object} event
 *
 * @return {Array<String>}
 */
function getNewTags(event) {
  if (event.diff.tags) {
    const tagsBefore = event.previous.tags;
    const tagsAfter = event.current.tags;
    return _.difference(tagsAfter, tagsBefore);
  }
  return [];
}

/**
 * Return id of new projects requested by user
 *
 * @param  {Object} event
 *
 * @return {Array<String>}
 */
function getNewRequestedProjectIDs(event) {
  if (isModifying(event, 'user')) {
    if (event.diff.requested_project_ids) {
      const projectIDsBefore = event.previous.requested_project_ids;
      const projectIDsAfter = event.current.requested_project_ids;
      return _.difference(projectIDsAfter, projectIDsBefore);
    }
  }
}

/**
 * Check whether user wishes to receive notification or not
 *
 * @param  {User}  user
 * @param  {Notification}  notification
 *
 * @return {Boolean}
 */
function checkUserPreference(user, notification) {
  const name = _.snakeCase(notification.type);
  const settingValue = _.get(user, `settings.notification.${name}`);
  if (settingValue) {
    // user never receives notification from himself
    if (notification.user_id === notification.target_user_id) {
      return false;
    }
    if (settingValue === true) {
      return true;
    } else {
      let testValue;
      switch (notification.type) {
        case 'push':
        case 'merge':
          testValue = notification.details.branch;
          break;
      }
      if (settingValue instanceof Array) {
        return _.includes(settingValue, testValue);
      } else {
        return settingValue === testValue;
      }
    }
  }
  return false;
}

export {
  generate,
};
