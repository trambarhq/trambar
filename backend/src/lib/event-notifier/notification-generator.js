var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

// accessors
var Bookmark = require('accessors/bookmark');
var Notification = require('accessors/notification');
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');
var User = require('accessors/user');

exports.generate = generate;

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
    return Promise.mapSeries(events, (event) => {
        switch (event.table) {
            case 'reaction':
                return createReactionNotifications(db, event);
            case 'story':
                return createStoryNotifications(db, event);
            case 'user':
                return createUserNotifications(db, event);
            case 'bookmark':
                return createBookmarkNotifications(db, event);
            default:
                return [];
        }
    }).then((notificationLists) => {
        return _.flatten(notificationLists);
    });
}

/**
 * Create notifications in response to a change to the table "reaction"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>}
 */
function createReactionNotifications(db, event) {
    return getReactionNotificationTemplate(db, event).then((template) => {
        if (!template) {
            return [];
        }
        var schema = event.schema;
        var criteria = { deleted: false, disabled: false };
        return User.findCached(db, 'global', criteria, '*').filter((user) => {
            if (template.user_id === user.id) {
                // never notify user of his own reaction
                if (process.env.NODE_ENV === 'production') {
                    return false;
                }
            }
            if (!_.includes(template.target_user_ids, user.id)) {
                return false;
            }
            var n = _.get(user, 'settings.notification', {});
            switch (template.type) {
                case 'like': return n.like;
                case 'comment': return n.comment;
                case 'issue': return n.issue;
                case 'vote': return n.vote;
                case 'task-completion': return n.task_completion;
                case 'note': return n.note;
                case 'assignment': return n.assignment;
            }
        }).then((recipients) => {
            var notifications = _.map(recipients, (recipient) => {
                var notification = _.omit(template, 'target_user_ids');
                notification.target_user_id = recipient.id;
                return notification;
            });
            return Notification.insert(db, schema, notifications);
        });
    });
}

/**
 * Return a notification template for database event on "reaction"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<String|null>}
 */
function getReactionNotificationTemplate(db, event) {
    return Promise.try(() => {
        if (event.op === 'DELETE' || event.current.deleted) {
            return null;
        }
        var publishing = false;
        if (event.diff.published || event.diff.ready) {
            if (event.current.published && event.current.ready) {
                publishing = true;
            }
        }
        var notificationType;
        var details = {};
        if (publishing) {
            var reactionType = event.current.type;
            switch (reactionType) {
                case 'like':
                case 'comment':
                case 'issue':
                case 'vote':
                case 'task-completion':
                case 'assignment':
                    notificationType = reactionType;
                    break;
            }
        }
        if (!notificationType) {
            return null;
        }
        var schema = event.schema;
        var criteria = { id: event.current.story_id };
        return Story.findOne(db, schema, criteria, 'type, user_ids').then((story) => {
            var template = {
                type: notificationType,
                story_id: event.current.story_id,
                reaction_id: event.id,
                user_id: event.current.user_id,
                target_user_ids: story.user_ids,
            };
            switch (notificationType) {
                case 'like':
                case 'comment':
                    template.details = {
                        story_type: story.type
                    };
                    break;
            }
            return template;
        });
    });
}

/**
 * Create notifications in response to a change to the table "story"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Array<Object>}
 */
function createStoryNotifications(db, event) {
    return getStoryNotificationTemplate(db, event).then((template) => {
        if (!template) {
            return [];
        }
        var criteria = { deleted: false, disabled: false };
        return User.findCached(db, 'global', criteria, '*').filter((user) => {
            if (template.user_id === user.id) {
                // never notify user of his own action
                if (process.env.NODE_ENV === 'production') {
                    return false;
                }
            }
            var n = _.get(user, 'settings.notification', {});
            switch (template.type) {
                case 'push':
                    if (typeof(n.push_master) === 'string') {
                        return template.details.branch === n.push_master;
                    } else {
                        return n.push_master;
                    }
                case 'merge':
                    if (typeof(n.merge_master) === 'string') {
                        return template.details.branch === n.merge_master;
                    } else {
                        return n.merge_master;
                    }
                case 'branch': return n.branch;
                case 'task-list': return n.task_list && _.includes(event.current.user_ids, user.id);
                case 'survey': return n.survey;
                case 'issue': return n.issue;
            }
        }).then((recipients) => {
            var schema = event.schema;
            var notifications = _.map(recipients, (recipient) => {
                var notification = _.clone(template);
                notification.target_user_id = recipient.id;
                return notification;
            });
            return Notification.insert(db, schema, notifications);
        });
    });
}

/**
 * Return a notification template for database event on "story"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<Object|null>}
 */
function getStoryNotificationTemplate(db, event) {
    return Promise.try(() => {
        if (event.op === 'DELETE' || event.current.deleted) {
            return null;
        }
        var publishing = false;
        if (event.diff.published || event.diff.ready) {
            if (event.current.published && event.current.ready) {
                publishing = true;
            }
        }
        var notificationType;
        if (publishing) {
            var storyType = event.current.type;
            switch (storyType) {
                case 'push':
                case 'merge':
                case 'task-list':
                case 'survey':
                case 'issue':
                    notificationType = storyType;
                    break;
            }
        } else {
            if (event.diff.user_ids) {
                var newUserIds = _.different(event.current.user_ids, event.previous.user_ids);
                if (!_.isEmpty(newUserIds)) {
                    notificationType = 'coauthor';
                }
            }
        }
        if (!notificationType) {
            return null;
        }
        var template = {
            type: notificationType,
            story_id: event.id,
            user_id: event.current.user_ids[0],
        };
        switch (notificationType) {
            case 'push':
            case 'merge':
            case 'branch':
                // need addition info from story object
                var schema = event.schema;
                var criteria = { id: event.id };
                return Story.findOne(db, schema, criteria, 'details').then((story) => {
                    template.details = {
                        branch: story.details.branch
                    };
                    return template;
                });
            default:
                return template;
        }
    });
}

function createUserNotifications(db, event) {
    return getUserNotificationTemplate(db, event).then((template) => {
        if (!template) {
            return [];
        }
    });
}

/**
 * Return a notification template for database event on "user"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<String|null>}
 */
function getUserNotificationTemplate(db, event) {
    return Promise.try(() => {
        if (event.op === 'DELETE' || event.current.deleted) {
            return null;
        }
        return null;
    });
}

function createBookmarkNotifications(events, listeners) {
    return getBookmarkNotificationTemplate(db, event).then((template) => {
        if (!template) {
            return [];
        }
    });
}

/**
 * Return a notification template for database event on "bookmark"
 *
 * @param  {Database} db
 * @param  {Object} event
 *
 * @return {Promise<String|null>}
 */
function getBookNotificationTemplate(db, event) {
    return Promise.try(() => {
        if (event.op === 'DELETE' || event.current.deleted) {
            return null;
        }
        var schema = event.schema;
        return null;
    });
}
