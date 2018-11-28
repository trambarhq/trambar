import _ from 'lodash';
import Promise from 'bluebird';
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
function generate(db, events) {
    // filter out event triggered by data import
    events = _.filter(events, (event) => {
        if (event.table === 'story' || event.table === 'reaction') {
            // see if event is old (created during initial import, for instance)
            var now = Moment();
            var elapsed = now - Moment(event.current.ptime);
            if (elapsed > 5 * 60 * 1000) {
                return false;
            }
        }
        return true;
    });

    var criteria = { deleted: false, disabled: false };
    return User.findCached(db, 'global', criteria, '*').then((users) => {
        return Promise.mapSeries(events, (event) => {
            return Promise.mapSeries(notificationGeneratingFunctions, (f) => {
                return f(db, event);
            }).then((lists) => {
                // filter out notifications that user doesn't want to receive
                var entries = _.filter(_.flatten(lists), (entry) => {
                    var notification = entry.notification;
                    var user = _.find(users, { id: notification.target_user_id });
                    return checkUserPreference(user, notification);
                });
                var schemas = _.uniq(_.map(entries, 'schema'));
                return Promise.mapSeries(schemas, (schema) => {
                    var entriesForSchema = _.filter(entries, { schema });
                    var notifications = _.map(entries, 'notification');
                    return Notification.save(db, schema, notifications);
                }).then((lists) => {
                    return _.flatten(lists);
                });
            });
        }).then((lists) => {
            return _.flatten(lists);
        });
    });
}

var notificationGeneratingFunctions = [
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
function generateCoauthoringNotifications(db, event) {
    return Promise.try(() => {
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
        var newCoauthorIds = getNewCoauthorIds(event);
        if (_.isEmpty(newCoauthorIds)) {
            return [];
        }
        var schema = event.schema;
        var notificationType = 'coauthor';
        var storyId = event.id;
        var leadAuthorId = event.current.user_ids[0];
        return _.map(newCoauthorIds, (coauthorId) => {
            return {
                notification: {
                    type: notificationType,
                    story_id: storyId,
                    user_id: leadAuthorId,
                    target_user_id: coauthorId,
                },
                schema,
            };
        });
    });
}

/**
 * Generate story notifications if event indicates a story is being published
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
function generateStoryPublicationNotifications(db, event) {
    return Promise.try(() => {
        if (!isPublishing(event, 'story')) {
            return [];
        }
        var schema = event.schema;
        // every story type generates the a notification of the same type
        var notificationType = event.current.type;
        var storyId = event.id;
        var leadAuthorId = event.current.user_ids[0];
        // notify (potentially) all active users
        var criteria = { deleted: false, disabled: false };
        return User.findCached(db, 'global', criteria, '*').then((users) => {
            return getStoryPublicationDetails(db, schema, storyId, notificationType).then((details) => {
                return _.map(users, (user) => {
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
            });
        });
    });
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
function getStoryPublicationDetails(db, schema, storyId, notificationType) {
    switch (notificationType) {
        case 'push':
        case 'merge':
        case 'branch':
        case 'tag':
            // need addition info from story object not contained in event
            var criteria = { id: storyId };
            return Story.findOne(db, schema, criteria, 'details').then((story) => {
                return {
                    branch: story.details.branch
                };
            });
        default:
            return Promise.resolve();
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
function generateReactionPublicationNotifications(db, event) {
    return Promise.try(() => {
        if (!isPublishing(event, 'reaction')) {
            return [];
        }
        var schema = event.schema;
        // every reaction type generates the a notification of the same type
        var notificationType = event.current.type;
        var reactionId = event.id;
        var storyId = event.current.story_id;
        var respondentId = event.current.user_id;
        // notify the author(s) of the story reacted to
        var criteria = { id: storyId };
        return Story.findOne(db, schema, criteria, 'type, user_ids').then((story) => {
            var details;
            switch (notificationType) {
                // like and comment requires the story type since they're applicable to all stories
                // note may also apply to multiple story types
                case 'like':
                case 'comment':
                case 'note':
                    details = {
                        story_type: story.type
                    };
                    break;
            }
            return _.map(story.user_ids, (authorId) => {
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
        });
    });
}

/**
 * Generate bookmark notifications if event indicates a bookmark is being sent
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>>}
 */
function generateBookmarkNotifications(db, event) {
    return Promise.try(() => {
        if (!isModifying(event, 'bookmark')) {
            return [];
        }
        var senderIdsBefore = event.previous.user_ids;
        var senderIdsAfter = event.current.user_ids;
        if (!_.isEmpty(senderIdsBefore) || _.isEmpty(senderIdsAfter)) {
            return [];
        }
        var senderId = _.first(senderIdsAfter);
        var schema = event.schema;
        var notificationType = 'bookmark';
        var storyId = event.current.story_id;
        var targetUserId = event.current.target_user_id;
        var criteria = { id: storyId, deleted: false };
        return Story.find(db, schema, criteria, 'type').map((story) => {
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
    });
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
function generateUserMentionNotifications(db, event) {
    return Promise.try(() => {
        if (!isModifying(event, 'story') && !isModifying(event, 'reaction')) {
            return [];
        }
        var relevantTags;
        if (isPublishing(event, 'story') || isPublishing(event, 'reaction')) {
            // consider all the tags
            relevantTags = event.current.tags;
        } else if (event.current.published) {
            // consider only the ones that were added
            relevantTags = getNewTags(event);
        }
        var relevantUserTags = _.filter(relevantTags, (tag) => {
            return (tag.charAt(0) === '@');
        });
        if (_.isEmpty(relevantUserTags)) {
            return [];
        }
        var schema = event.schema;
        var notificationType = 'mention';
        var storyId = event.current.story_id;
        var storyId;
        var reactionId;
        var authorId;
        var details;
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
        var criteria = { deleted: false, disabled: false };
        return User.findCached(db, 'global', criteria, '*').then((users) => {
            var mentionedUsers = _.filter(users, (user) => {
                return _.includes(relevantUserTags, `@${_.toLower(user.username)}`);
            });
            return _.map(mentionedUsers, (user) => {
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
        });
    });
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
function generateJoinRequestNotifications(db, event) {
    return Promise.try(() => {
        var newProjectIds = getNewRequestedProjectIds(event);
        if (_.isEmpty(newProjectIds)) {
            return [];
        }
        var notificationType = 'join-request';
        var userId = event.id;
        var criteria = { id: newProjectIds, deleted: false };
        return Project.find(db, 'global', criteria, 'id, name').then((projects) => {
            var criteria = {};
            return User.findCached(db, 'global', criteria, '*').then((users) => {
                var admins = _.filter(users, { type: 'admin' });
                var notificationLists = _.map(projects, (project) => {
                    var details = {
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
                return _.flatten(notificationLists);
            });
        });
    });
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
            var coauthorIdsBefore = _.slice(event.previous.user_ids, 1);
            var coauthorIdsAfter = _.slice(event.current.user_ids, 1);
            return _.difference(coauthorIdsAfter, coauthorIdsBefore);
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
        var tagsBefore = event.previous.tags;
        var tagsAfter = event.current.tags;
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
            var projectIdsBefore = event.previous.requested_project_ids;
            var projectIdsAfter = event.current.requested_project_ids;
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
    var name = _.snakeCase(notification.type);
    var settingValue = _.get(user, `settings.notification.${name}`);
    if (settingValue) {
        // user never receives notification from himself
        if (notification.user_id === notification.target_user_id) {
            return false;
        }
        if (settingValue === true) {
            return true;
        } else {
            var testValue;
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
