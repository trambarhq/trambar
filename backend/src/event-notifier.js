var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Database = require('database');
var Shutdown = require('shutdown');
var HTTPError = require('errors/http-error');

var ListenerManager = require('event-notifier/listener-manager');
var NotificationGenerator = require('event-notifier/notification-generator');
var AlertComposer = require('event-notifier/alert-composer');

// global accessors
var Device = require('accessors/device');
var Picture = require('accessors/picture');
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Role = require('accessors/role');
var Server = require('accessors/server');
var Subscription = require('accessors/subscription');
var System = require('accessors/system');
var User = require('accessors/user');

// project accessors
var Bookmark = require('accessors/bookmark');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');

// appear in both
var Notification = require('accessors/notification');
var Task = require('accessors/task');

module.exports = {
    start,
    stop,
};

var accessors = [
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

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return ListenerManager.listen(db).then(() => {
            var tables = _.map(accessors, 'table');
            return db.listen(tables, 'change', handleDatabaseChanges, 100);
        });
    });
}

function stop() {
    return ListenerManager.shutdown().then(() => {
        database.close();
        database = null;
    });
}

function handleDatabaseChanges(events) {
    var db = this;
    // invalidate cache
    var eventsByTable = _.groupBy(events, 'table');
    _.forIn(eventsByTable, (events, table) => {
        if (table === 'user') {
            User.clearCache(events);
        } else if (table === 'subscription') {
            Subscription.clearCache(events);
        } else if (table === 'system') {
            System.clearCache(events);
        }
        console.log('Changes to table: ' + table);
    });

    System.findOne(db, 'global', { deleted: false }, '*').then((system) => {
        var address = _.trimEnd(_.get(system, 'settings.address', ''), '/');
        // see who's listening
        ListenerManager.find(db).then((listeners) => {
            if (_.isEmpty(listeners)) {
                console.log('No listeners');
            }
            var messages = [];
            // send change messages (silent) first
            _.each(listeners, (listener, index) => {
                var changes = {};
                console.log(`Listener ${index + 1}: user_id = ${listener.user.id}, type = ${listener.type}`);
                _.each(events, (event) => {
                    var accessor = _.find(accessors, { table: event.table });
                    if (accessor.isRelevantTo(event, listener.user, listener.subscription)) {
                        var table = `${event.schema}.${event.table}`;
                        var idList = changes[table];
                        if (!idList) {
                            idList = changes[table] = [ event.id ];
                        } else {
                            if (!_.includes(idList, event.id)) {
                                idList.push(event.id);
                            }
                        }
                    }
                });
                if (!_.isEmpty(changes)) {
                    messages.push(new Message('change', listener, { changes }, address));
                }
            });
            ListenerManager.send(db, messages);

            var eventsBySchema = _.groupBy(events, 'schema');
            return Promise.each(_.keys(eventsBySchema), (schema) => {
                // generate new Notification objects
                return NotificationGenerator.generate(db, eventsBySchema[schema]).then((notifications) => {
                    if (_.isEmpty(notifications)) {
                        return;
                    }
                    var criteria = { deleted: false, disabled: false };
                    return User.findCached(db, 'global', criteria, '*').then((users) => {
                        var messages = [];
                        _.each(notifications, (notification) => {
                            _.each(listeners, (listener) => {
                                if (listener.user.id === notification.target_user_id) {
                                    var user = _.find(users, { id: notification.user_id });
                                    if (user) {
                                        var locale = listener.subscription.locale || process.env.LANG || 'en-US';
                                        var lang = locale.substr(0, 2);
                                        var alert = AlertComposer.format(system, schema, user, notification, lang);
                                        messages.push(new Message('alert', listener, { alert }, address));
                                    }
                                }
                            });
                        });
                        return ListenerManager.send(db, messages);
                    });
                });
            })
        });
    });
}

function Message(type, listener, body, address) {
    this.type = type;
    this.listener = listener;
    this.body = body;
    this.address = address;
}

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
