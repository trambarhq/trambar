import _ from 'lodash';
import Moment from 'moment';
import Database from './lib/database.mjs';
import * as Shutdown from './lib/shutdown.mjs';
import HTTPError from './lib/common/errors/http-error.mjs';

import * as ListenerManager from './lib/event-notifier/listener-manager.mjs';
import * as NotificationGenerator from './lib/event-notifier/notification-generator.mjs';
import * as AlertComposer from './lib/event-notifier/alert-composer.mjs';

// global accessors
import Device from './lib/accessors/device.mjs';
import Picture from './lib/accessors/picture.mjs';
import Project from './lib/accessors/project.mjs';
import Repo from './lib/accessors/repo.mjs';
import Role from './lib/accessors/role.mjs';
import Server from './lib/accessors/server.mjs';
import Session from './lib/accessors/session.mjs';
import Subscription from './lib/accessors/subscription.mjs';
import System from './lib/accessors/system.mjs';
import User from './lib/accessors/user.mjs';

// project accessors
import Bookmark from './lib/accessors/bookmark.mjs';
import Listing from './lib/accessors/listing.mjs';
import Reaction from './lib/accessors/reaction.mjs';
import Statistics from './lib/accessors/statistics.mjs';
import Story from './lib/accessors/story.mjs';

// appear in both
import Notification from './lib/accessors/notification.mjs';
import Task from './lib/accessors/task.mjs';

const accessors = [
    Device,
    Picture,
    Project,
    Repo,
    Role,
    Server,
    Session,
    System,
    Task,
    User,

    Bookmark,
    Listing,
    Notification,
    Reaction,
    Statistics,
    Subscription,
    Story,

    Notification,
    Task,
];
let database;

async function start() {
    database = await Database.open(true);
    await ListenerManager.listen(database);
    let tables = _.map(accessors, 'table');
    let result = await database.listen(tables, 'change', handleDatabaseChanges, 100);
    return result;
}

async function stop() {
    await ListenerManager.shutdown();
    database.close();
    database = null;
}

async function handleDatabaseChanges(events) {
    let db = this;
    // invalidate cache
    let eventsByTable = _.entries(_.groupBy(events, 'table'));
    for (let [ table, events ] of eventsByTable) {
        if (table === 'user') {
            User.clearCache(events);
        } else if (table === 'subscription') {
            Subscription.clearCache(events);
        } else if (table === 'system') {
            System.clearCache(events);
        }
    }

    let system = await System.findOne(db, 'global', { deleted: false }, '*');
    // see who's listening
    let listeners = await ListenerManager.find(db);
    // request revalidation of cache if necessary (silent)
    await sendRevalidationRequests(db, events, listeners, system);
    // send change messages (silent)
    await sendChangeNotifications(db, events, listeners, system);
    // send alerts
    await sendAlerts(db, events, listeners, system);
}

/**
 * Send cache revalidation requests
 *
 * @param  {Database} db
 * @param  {Array<Object>} events
 * @param  {Array<Listener>} listeners
 * @param  {System} system
 *
 * @return {Promise}
 */
async function sendRevalidationRequests(db, events, listeners, system) {
    let messages = [];
    for (let listener of listeners) {
        for (let event of events) {
            let revalidate = false;
            if (event.table === 'user') {
                if (event.id === listener.user.id) {
                    // see if the access level changed
                    if (event.diff.type) {
                        revalidate = true;
                    }
                }
            } else if (event.table === 'session') {
                if (event.current.user_id === listener.user.id) {
                    // see if the session was deleted
                    if (event.diff.deleted && event.current.deleted) {
                        revalidate = true;
                    }
                }
            }

            if (revalidate) {
                let revalidation = { schema: '*' };
                messages.push(new Message('revalidation', listener, { revalidation }, system));
            }
        }
    }
    ListenerManager.send(db, messages);
}

/**
 * Send change notifications
 *
 * @param  {Database} db
 * @param  {Array<Object>} events
 * @param  {Array<Listener>} listeners
 * @param  {System} system
 *
 * @return {Promise}
 */
async function sendChangeNotifications(db, events, listeners, system) {
    let messages = [];
    for (let listener of listeners) {
        let changes = {};
        let badge;
        for (let event of events) {
            let accessor = _.find(accessors, { table: event.table });
            if (accessor.isRelevantTo(event, listener.user, listener.subscription)) {
                let table = `${event.schema}.${event.table}`;
                let lists = changes[table];
                if (!lists) {
                    lists = changes[table] = {
                        ids: [ event.id ],
                        gns: [ event.gn ]
                    };
                } else {
                    if (!_.includes(lists.ids, event.id)) {
                        lists.ids.push(event.id);
                        lists.gns.push(event.gn);
                    }
                }

                if(event.table === 'notification') {
                    let criteria = {
                        seen: false,
                        deleted: false,
                        target_user_id: listener.user.id,
                    };
                    let columns = 'COUNT(id) AS count';
                    let row = await Notification.findOne(db, event.schema, criteria, columns);
                    badge = row.count;
                }
            }
        }
        if (!_.isEmpty(changes)) {
            messages.push(new Message('change', listener, { changes, badge }, system));
        }
    }
    ListenerManager.send(db, messages);
}

/**
 * Send alert messages
 *
 * @param  {Database} db
 * @param  {Array<Object>} events
 * @param  {Array<Listener>} listeners
 * @param  {System} system
 *
 * @return {Promise}
 */
async function sendAlerts(db, events, listeners, system) {
    let eventsBySchema = _.entries(_.groupBy(events, 'schema'))
    for (let [ schema, schemaEvents ] of eventsBySchema) {
        let notifications = await NotificationGenerator.generate(db, schemaEvents);
        if (_.isEmpty(notifications)) {
            continue;
        }
        let messages = [];
        let criteria = { deleted: false, disabled: false };
        let users = await User.findCached(db, 'global', criteria, '*');
        for (let notification of notifications) {
            for (let listener of listeners) {
                if (listener.user.id === notification.target_user_id) {
                    let user = _.find(users, { id: notification.user_id });
                    if (user) {
                        let locale = listener.subscription.locale || 'en-us';
                        let alert = AlertComposer.format(system, schema, user, notification, locale);
                        messages.push(new Message('alert', listener, { alert }, system));
                    }
                }
            }
        }
        ListenerManager.send(db, messages);
    }
}

class Message {
    constructor(type, listener, body, system) {
        this.type = type;
        this.listener = listener;
        this.body = body;
        this.address = _.trimEnd(_.get(system, 'settings.address', ''), '/');
    }
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
