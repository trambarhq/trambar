import _ from 'lodash';
import Moment from 'moment';
import Database from 'database';
import * as Shutdown from 'shutdown';
import HTTPError from 'errors/http-error';

import * as ListenerManager from 'event-notifier/listener-manager';
import * as NotificationGenerator from 'event-notifier/notification-generator';
import * as AlertComposer from 'event-notifier/alert-composer';

// global accessors
import Device from 'accessors/device';
import Picture from 'accessors/picture';
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Role from 'accessors/role';
import Server from 'accessors/server';
import Subscription from 'accessors/subscription';
import System from 'accessors/system';
import User from 'accessors/user';

// project accessors
import Bookmark from 'accessors/bookmark';
import Listing from 'accessors/listing';
import Reaction from 'accessors/reaction';
import Statistics from 'accessors/statistics';
import Story from 'accessors/story';

// appear in both
import Notification from 'accessors/notification';
import Task from 'accessors/task';

const accessors = [
    Device,
    Picture,
    Project,
    Repo,
    Role,
    Server,
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
var database;

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
    // request revalidation of cache when access level changes
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
            if (event.table === 'user' && event.id === listener.user.id) {
                if (event.diff.type) {
                    let revalidation = { schema: '*' };
                    messages.push(new Message('revalidation', listener, { revalidation }, system));
                }
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
            var accessor = _.find(accessors, { table: event.table });
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

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
