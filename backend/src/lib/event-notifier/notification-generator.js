var _ = require('lodash');
var Promise = require('bluebird');

exports.generate = generate;

function generate(db, events) {
    events = _.filter(events, isEventRelevant);
    return Promise.mapSeries(events, (event) => {
        switch (event.table) {
            case 'reaction':
                return generateReactionNotifications(db, event);
            case 'story':
                return generateStoryNotifications(db, event);
            case 'user':
                return generateUserNotifications(db, event);
            case 'bookmark':
                return generateBookmarkNotifications(db, event);
            default:
                return [];
        }
    }).then((notificationLists) => {
        return _.flatten(notificationLists);
    });
}

function generateReactionNotifications(db, event) {
}

function generateStoryNotifications(db, event) {
}

function generateUserNotifications(db, event) {
}

function generateReactionNotifications(events, listeners) {
}

/**
 * Return true if an database change event could lead to the creation of a
 * notification
 *
 * @param  {Object}  event
 *
 * @return {Boolean}
 */
function isEventRelevant(event) {
    if (event.table === 'story' || event.table === 'reaction') {
        // see if the story/reaction is published and ready
        if (!(event.current.published && !event.current.ready)) {
            return false;
        }
        // see if event is old (created during initial import, for instance)
        var now = Moment();
        var elapsed = now - Moment(event.current.ptime);
        if (elapsed > 5 * 60 * 1000) {
            return false;
        }
        // see if there's a change in either published or ready
        if (!(event.diff.published || event.diff.ready)) {
            return false;
        }
    }

    if (event.table === 'story') {
        switch (event.current.type) {
            case 'push':
            case 'merge':
            case 'survey':
            case 'task-list':
            case 'issue':
                break;
            default:
                return false;
        }
        return true;
    } else if (event.table === 'reaction') {
        return true;
    } else if (event.table === 'user') {
        if (!(event.diff.approved || event.diff.requested_project_ids)) {
            return false;
        }
        return true;
    } else if (event.table === 'bookmark') {
        return true;
    } else {
        return false;
    }
}
