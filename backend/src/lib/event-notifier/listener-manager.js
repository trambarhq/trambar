var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Http = require('http');
var SockJS = require('sockjs');
var Crypto = Promise.promisifyAll(require('crypto'));
var HttpError = require('errors/http-error');

// accessors
var Subscription = require('accessors/subscription');
var User = require('accessors/user');

exports.listen = listen;
exports.find = find;
exports.send = send;
exports.shutdown = shutdown;

var server;
var sockets = [];

/**
 * Start listening for incoming Web Socket connection
 *
 * @return {Promise}
 */
function listen() {
    return Promise.try(() => {
        // set up endpoint for push subscription
        var app = Express();
        app.use(BodyParser.json());
        app.set('json spaces', 2);

        // set up SockJS server
        var sockJS = SockJS.createServer({
            sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.2/sockjs.min.js'
        });
        sockJS.on('connection', (socket) => {
            sockets.push(socket);
            socket.on('close', () => {
                _.pull(sockets, socket);
            });

            // assign a random id to socket
            return Crypto.randomBytesAsync(24).then((buffer) => {
                socket.token = buffer.toString('hex');
                socket.write(JSON.stringify({ socket: socket.token }));
            });
        });

        server = Http.createServer(app);
        sockJS.installHandlers(server, { prefix:'/socket' });
        server.listen(80, '0.0.0.0');
    });
}

/**
 * Shutdown HTTP server
 *
 * @return {Promise}
 */
function shutdown() {
    return new Promise((resolve, reject) => {
        _.each(sockets, (socket) => {
            socket.end();
        });
        sockets = [];

        if (server) {
            var resolved = false;
            server.on('close', () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
            server.close();
            setTimeout(() => {
                // just in case close isn't firing
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, 1000);
        } else {
            resolve();
        }
    });
}

/**
 * Retrieve a list of listeners
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Listener>>}
 */
function find(db, schema) {
    var criteria = {
        deleted: false
    };
    return Subscription.findCached(db, 'global', criteria, '*').then((subscriptions) => {
        var criteria = {
            id: _.map(subscriptions, 'user_id'),
            deleted: false,
        };
        return User.findCached(db, 'global', criteria, '*').then((users) => {
            var listeners = [];
            _.each(subscriptions, (subscription) => {
                var user = _.find(users, { id: subscription.user_id });
                if (user) {
                    listeners.push(new Listener(user, subscription));
                }
            });
            return listeners;
        });
    });
}

/**
 * Send notifications to listeners
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise}
 */
function send(db, messages) {
    return sendToWebsockets(db, messages).then(() => {
        return sendToPushRelays(db, messages);
    });
}

/**
 * Send messages intended for websockets
 *
 * @param  {Database} db
 * @param  {Array<Message>} messages
 *
 * @return {Promise}
 */
function sendToWebsockets(db, messages) {
    return filterWebsocketMessages(messages).each((message) => {
        // dispatch web-socket messages
        var listener = message.listener;
        var subscription = listener.subscription;
        var socket = _.find(sockets, { token: subscription.token });
        if (socket) {
            var messageType = _.first(_.keys(message.body));
            console.log(`Sending message (${messageType}) to socket ${subscription.token}`);
            console.log(message.body);
            socket.write(JSON.stringify(message.body));
        } else {
            console.log('Deleting subscription due to missing socket', subscription);
            subscription.deleted = true;
            return Subscription.updateOne(db, 'global', subscription);
        }
    });
}

/**
 * Remove messages that aren't intended for web-socket and those the users do
 * not wish to receive
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise<Array<Message>>}
 */
function filterWebsocketMessages(messages) {
    return Promise.filter(messages, (message) => {
        if (message.listener.type !== 'websocket') {
            return false;
        }
        if (message.body.alert) {
            var user = message.listener.user;
            var alertType = message.body.alert.type;
            var receiving = _.get(user.settings, [ 'web_alert', alertType ], false);
            if (!receiving) {
                return false;
            }
        }
        return true;
    });
}

function sendToPushRelays(db, messages) {
    return filterPushMessages(messages).then((messages) => {
        var messagesByRelay = _.groupBy(messages, 'listener.relay');
        _.forIn(messagesByRelay, (messages, relay) => {
            // merge identifical messages
            var messagesByJSON = {};
            _.each(messages, (message) => {
                var subscription = message.listener.subscription;
                var json = JSON.stringify(message.body);
                var m = messagesByJSON[json];
                if (m) {
                    m.tokens.push(subscription.token);
                } else {
                    m = messagesByJSON[json] = {
                        body: message.body,
                        tokens: [ subscription.token ]
                    };
                }
            });
            var pushMessages = formatPushMessages(db, _.values(messagesByJSON));
            console.log(relay, pushMessages);
        });
    });
}

/**
 * Remove messages that aren't push or if the user is already receiving
 * over websocket
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise<Array<Message>>}
 */
function filterPushMessages(messages) {
    return Promise.filter(messages, (message) => {
        if (message.listener.type !== 'push') {
            return false;
        }
        if (message.body.alert) {
            var user = message.listener.user;
            var alertType = message.body.alert.type;
            var receiving = _.get(user.settings, [ 'mobile_alert', alertType ], false);
            if (!receiving) {
                return false;
            }
            var hasWebSession = _.some(messages, (m) => {
                if (m.type === 'websocket') {
                    if (m.user.id === user.id) {
                        return true;
                    }
                }
            });
            if (hasWebSession) {
                var sendToBoth = _.get(user.settings, [ 'mobile_alert', 'web_session' ], false);
                if (!sendToBoth) {
                    console.log(`Suppression mobile alert: user_id = ${user.id}`);
                    return false;
                }
            }
        }
        return true;
    });
}

function formatPushMessages(db, messages) {
    // TODO
}

function Listener(user, subscription) {
    if (/^websocket\b/.test(subscription.address)) {
        this.type = 'websocket';
    } else if (/^https?\b/.test(subscription.address)) {
        this.type = 'push';
        this.relay = subscription.address;
    }
    this.user = user;
    this.subscription = subscription;
}
