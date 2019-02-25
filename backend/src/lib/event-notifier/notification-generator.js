import _ from 'lodash';
import Moment from 'moment';

// accessors
import Bookmark from 'accessors/bookmark';
import Notification from 'accessors/notification';
import Project from 'accessors/project';
import Reaction from 'accessors/reaction';
import Story from 'accessors/story';
import User from 'accessors/user';

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
            let now = Moment();
            let elapsed = now - Moment(event.current.ptime);
            if (elapsed > 5 * 60 * 1000) {
                return false;
            }
        }
        return true;
    });

    let userCriteria = { deleted: false, disabled: false };
    let users = await User.findCached(db, 'global', userCriteria, '*');
    let savedNotifications = [];

    for (let event of events) {
        let entries = [];
        for (let f of notificationGeneratingFunctions) {
            let list = await f(db, event);
            for (let entry of list) {
                let notification = entry.notification;
                let user = _.find(users, { id: notification.target_user_id });
                // see if user wants to receive the notification
                if (checkUserPreference(user, notification)) {
                    entries.push(entry)
                }
            }
        }
        // save the notification
        let schemas = _.uniq(_.map(entries, 'schema'));
        for (let schema of schemas) {
            let entriesForSchema = _.filter(entries, { schema });
            let notifications = _.map(entries, 'notification');
            let saved = await Notification.save(db, schema, notifications);
            for (let notification of saved) {
                savedNotifications.push(notification);
            }
        }
    }
    return savedNotifications;
}

let notificationGeneratingFunctions = [
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
    let newCoauthorIDs = getNewCoauthorIds(event);
    if (_.isEmpty(newCoauthorIDs)) {
        return [];
    }
    let schema = event.schema;
    let notificationType = 'coauthor';
    let storyId = event.id;
    let leadAuthorId = event.current.user_ids[0];
    let entries = _.map(newCoauthorIDs, (coauthorID) => {
        return {
            notification: {
                type: notificationType,
                story_id: storyId,
                user_id: leadAuthorId,
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
    let schema = event.schema;
    // every story type generates the a notification of the same type
    let notificationType = event.current.type;
    let storyId = event.id;
    let leadAuthorId = event.current.user_ids[0];
    // notify (potentially) all active users
    let userCriteria = { deleted: false, disabled: false };
    let users = await User.findCached(db, 'global', userCriteria, '*');
    let details = await getStoryPublicationDetails(db, schema, storyId, notificationType);
    let entries = _.map(users, (user) => {
        return {
            notification: {
                type: notificationType,
                story_id: storyId,
                user_id: leadAuthorId,
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
 * @param  {Number} storyId
 * @param  {String} notificationType
 *
 * @return {Promise<Object|undefined>}
 */
async function getStoryPublicationDetails(db, schema, storyId, notificationType) {
    switch (notificationType) {
        case 'push':
        case 'merge':
        case 'branch':
        case 'tag':
            // need addition info from story object not contained in event
            let criteria = { id: storyId };
            let story = await Story.findOne(db, schema, criteria, 'details');
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
    let schema = event.schema;
    // every reaction type generates the a notification of the same type
    let notificationType = event.current.type;
    let reactionId = event.id;
    let storyId = event.current.story_id;
    let respondentId = event.current.user_id;
    // notify the author(s) of the story reacted to
    let criteria = { id: storyId };
    let story = await Story.findOne(db, schema, criteria, 'type, user_ids');
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
    let entries = _.map(story.user_ids, (authorId) => {
        return {
            notification: {
                type: notificationType,
                story_id: storyId,
                reaction_id: reactionId,
                user_id: respondentId,
                target_user_id: authorId,
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
    let senderIdsBefore = event.previous.user_ids;
    let senderIdsAfter = event.current.user_ids;
    if (!_.isEmpty(senderIdsBefore) || _.isEmpty(senderIdsAfter)) {
        return [];
    }
    let senderId = _.first(senderIdsAfter);
    let schema = event.schema;
    let notificationType = 'bookmark';
    let storyId = event.current.story_id;
    let targetUserId = event.current.target_user_id;
    let criteria = { id: storyId, deleted: false };
    let stories = await Story.find(db, schema, criteria, 'type');
    let entries = _.map(stories, (story) => {
        return {
            notification: {
                type: notificationType,
                story_id: storyId,
                user_id: senderId,
                target_user_id: targetUserId,
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
    let relevantUserTags = _.filter(relevantTags, (tag) => {
        return (tag.charAt(0) === '@');
    });
    if (_.isEmpty(relevantUserTags)) {
        return [];
    }
    let schema = event.schema;
    let notificationType = 'mention';
    let storyId = event.current.story_id;
    let reactionId;
    let authorId;
    let details;
    if (event.table === 'story') {
        storyId = event.id;
        authorId = event.current.user_ids[0];
        details = { story_type: event.current.type };
    } else if (event.table === 'reaction') {
        reactionId = event.id;
        storyId = event.current.story_id;
        authorId = event.current.user_id;
        details = { reaction_type: event.current.type };
    }
    let userCriteria = { deleted: false, disabled: false };
    let users = await User.findCached(db, 'global', userCriteria, '*');
    let mentionedUsers = _.filter(users, (user) => {
        return _.includes(relevantUserTags, `@${_.toLower(user.username)}`);
    });
    let entries = _.map(mentionedUsers, (user) => {
        return {
            notification: {
                type: notificationType,
                story_id: storyId,
                reaction_id: reactionId,
                user_id: authorId,
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
    let newProjectIds = getNewRequestedProjectIds(event);
    if (_.isEmpty(newProjectIds)) {
        return [];
    }
    let notificationType = 'join-request';
    let userId = event.id;
    let projectCriteria = { id: newProjectIds, deleted: false };
    let projects = await Project.find(db, 'global', projectCriteria, 'id, name');
    let userCriteria = {};
    let users = await User.findCached(db, 'global', criteria, '*');
    let admins = _.filter(users, { type: 'admin' });
    let entryLists = _.map(projects, (project) => {
        let details = {
            project_name: project.name,
            project_id: project.id,
        };
        return _.map(admins, (admin) => {
            return {
                notification: {
                    type: 'join-request',
                    user_id: userId,
                    target_user_id: admin.id,
                    details
                },
                schema: project.name,
            };
        });
    });
    let entries = _.flatten(entryLists);
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
function getNewCoauthorIds(event) {
    if (isModifying(event, 'story')) {
        if (event.diff.user_ids) {
            let coauthorIDsBefore = _.slice(event.previous.user_ids, 1);
            let coauthorIDsAfter = _.slice(event.current.user_ids, 1);
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
        let tagsBefore = event.previous.tags;
        let tagsAfter = event.current.tags;
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
function getNewRequestedProjectIds(event) {
    if (isModifying(event, 'user')) {
        if (event.diff.requested_project_ids) {
            let projectIdsBefore = event.previous.requested_project_ids;
            let projectIdsAfter = event.current.requested_project_ids;
            return _.difference(projectIdsAfter, projectIdsBefore);
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
    let name = _.snakeCase(notification.type);
    let settingValue = _.get(user, `settings.notification.${name}`);
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
