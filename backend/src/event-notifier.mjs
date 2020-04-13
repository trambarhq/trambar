import _ from 'lodash';
import Moment from 'moment';
import { Database } from './lib/database.mjs';
import { onShutdown } from './lib/shutdown.mjs';
import { HTTPError } from './lib/errors.mjs';

import * as ListenerManager from './lib/event-notifier/listener-manager.mjs';
import * as NotificationGenerator from './lib/event-notifier/notification-generator.mjs';
import * as AlertComposer from './lib/event-notifier/alert-composer.mjs';
import { getAccessors } from './lib/data-server/accessors.mjs';

// accessors
import { Subscription } from './lib/accessors/subscription.mjs';
import { System } from './lib/accessors/system.mjs';
import { User } from './lib/accessors/user.mjs';
import { Notification } from './lib/accessors/notification.mjs';

let database;

async function start() {
  database = await Database.open(true);
  await ListenerManager.listen(database);
  const accessors = _.union(getAccessors('global'), getAccessors('project'));
  const tables = _.map(accessors, 'table');
  const result = await database.listen(tables, 'change', handleDatabaseChanges, 100);
  return result;
}

async function stop() {
  await ListenerManager.shutdown();
  database.close();
  database = null;
}

async function handleDatabaseChanges(events) {
  const db = this;
  // invalidate cache
  const eventsByTable = _.entries(_.groupBy(events, 'table'));
  for (let [ table, events ] of eventsByTable) {
    if (table === 'user') {
      User.clearCache(events);
    } else if (table === 'subscription') {
      Subscription.clearCache(events);
    } else if (table === 'system') {
      System.clearCache(events);
    }
  }

  const system = await System.findOne(db, 'global', { deleted: false }, '*');
  // see who's listening
  const listeners = await ListenerManager.find(db);
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
 * @param  {Object[]} events
 * @param  {Listener[]} listeners
 * @param  {System} system
 */
async function sendRevalidationRequests(db, events, listeners, system) {
  const messages = [];
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
 * @param  {Object[]} events
 * @param  {Listener[]} listeners
 * @param  {System} system
 */
async function sendChangeNotifications(db, events, listeners, system) {
  const messages = [];
  for (let listener of listeners) {
    const changes = {};
    let badge;
    for (let event of events) {
      const accessors = getAccessors(event.schema);
      const accessor = _.find(accessors, { table: event.table });
      if (accessor.isRelevantTo(event, listener.user, listener.subscription)) {
        const table = `${event.schema}.${event.table}`;
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
          const criteria = {
            seen: false,
            deleted: false,
            target_user_id: listener.user.id,
          };
          const columns = 'COUNT(id) AS count';
          const row = await Notification.findOne(db, event.schema, criteria, columns);
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
 * @param  {Object[]} events
 * @param  {Listener[]} listeners
 * @param  {System} system
 */
async function sendAlerts(db, events, listeners, system) {
  const eventsBySchema = _.entries(_.groupBy(events, 'schema'))
  for (let [ schema, schemaEvents ] of eventsBySchema) {
    const notifications = await NotificationGenerator.generate(db, schemaEvents);
    if (_.isEmpty(notifications)) {
      continue;
    }
    const messages = [];
    const criteria = { deleted: false, disabled: false };
    const users = await User.findCached(db, 'global', criteria, '*');
    for (let notification of notifications) {
      for (let listener of listeners) {
        if (listener.user.id === notification.target_user_id) {
          const user = _.find(users, { id: notification.user_id });
          if (user) {
            const locale = listener.subscription.locale || 'en-us';
            const alert = await AlertComposer.format(system, schema, user, notification, locale);
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
  onShutdown(stop);
}

export {
  start,
  stop,
};
