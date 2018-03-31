var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var CORS = require('cors');
var BodyParser = require('body-parser');
var HTTP = require('http');
var SockJS = require('sockjs');
var Request = require('request');
var Async = require('async-do-while');
var Crypto = Promise.promisifyAll(require('crypto'));
var XML2JS = require('xml2js');
var HTTPError = require('errors/http-error');
var Shutdown = require('shutdown');

// accessors
var Subscription = require('accessors/subscription');
var System = require('accessors/system');
var User = require('accessors/user');

module.exports = {
    listen,
    find,
    send,
    shutdown,
};

var server;
var sockets = [];
var heartbeatInterval = 0;

/**
 * Start listening for incoming Web Socket connection
 *
 * @return {Promise}
 */
function listen() {
    return Promise.try(() => {
        // set up endpoint for push subscription
        var app = Express();
        app.use(CORS());
        app.use(BodyParser.json());
        app.set('json spaces', 2);

        app.post('/srv/push/signature', handleSignatureValidation);

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
            return Crypto.randomBytesAsync(16).then((buffer) => {
                socket.token = buffer.toString('hex');
                socket.write(JSON.stringify({ socket: socket.token }));
                socket.lastInteractionTime = new Date;
            });
        });

        server = HTTP.createServer(app);
        sockJS.installHandlers(server, { prefix: '/srv/socket' });
        server.listen(80, '0.0.0.0');

        heartbeatInterval = setInterval(sendWebsocketHeartbeat, 10 * 1000);
    });
}

/**
 * Shutdown HTTP server
 *
 * @return {Promise}
 */
function shutdown() {
    clearInterval(heartbeatInterval);

    _.each(sockets, (socket) => {
        // for some reason socket is undefined sometimes during shutdown
        if (socket) {
            socket.end();
        }
    });
    sockets = [];
    return Shutdown.close(server);
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
            socket.lastInteractionTime = new Date;
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

function sendWebsocketHeartbeat() {
    var now = new Date;
    var message = JSON.stringify({ heartbeat: true });
    _.each(sockets, (socket) => {
        var elapsed = now - socket.lastInteractionTime;
        if (elapsed > 30 * 1000) {
            socket.write(message);
            socket.lastInteractionTime = new Date;
        }
    });
}

function sendToPushRelays(db, messages) {
    return getServerSignature().then((signature) => {
        return filterPushMessages(messages).then((messages) => {
            // in theory, it's possible to see multiple relays if it's
            // changed after subscriptions were created
            var messagesByRelay = _.groupBy(messages, 'listener.subscription.relay');
            var messageLists = _.values(messagesByRelay);
            var relays = _.keys(messagesByRelay);
            return Promise.each(messageLists, (messages, index) => {
                var relay = relays[index];
                // merge identifical messages
                var messagesByJSON = {};
                var subscriptions = [];
                _.each(messages, (message) => {
                    var subscription = message.listener.subscription;
                    var json = JSON.stringify(message.body);
                    var m = messagesByJSON[json];
                    if (m) {
                        if (!_.includes(m.tokens, subscription.token)) {
                            m.tokens.push(subscription.token);
                        }
                        if (!_.includes(m.methods, subscription.method)) {
                            m.methods.push(subscription.method);
                        }
                    } else {
                        m = messagesByJSON[json] = {
                            body: message.body,
                            tokens: [ subscription.token ],
                            methods: [ subscription.method ],
                            address: message.address,
                        };
                    }
                    if (!_.includes(subscriptions, subscription)) {
                        subscriptions.push(subscription);
                    }
                });
                var pushMessages = _.map(messagesByJSON, (message) => {
                    return packagePushMessage(message);
                });
                var url = `${relay}/dispatch`;
                var payload = {
                    address: _.get(messages, [ 0, 'address' ]),
                    signature,
                    messages: pushMessages
                };
                return post(url, payload).then((result) => {
                    var errors = result.errors;
                    if (!_.isEmpty(errors)) {
                        console.error(errors);
                    }

                    // delete subscriptions that are no longer valid
                    var expiredTokens = result.invalid_tokens;
                    var expiredSubscriptions = _.filter(subscriptions, (subscription) => {
                        if (_.includes(expiredTokens, subscription.token)) {
                            return true;
                        }
                    });
                    return Promise.each(expiredSubscriptions, (subscription) => {
                        console.log('Deleting subscription due to push relay response', subscription);
                        subscription.deleted = true;
                        return Subscription.updateOne(db, 'global', subscription);
                    });
                });
            });
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
                    console.log(`Suppressed mobile alert: user_id = ${user.id}`);
                    return false;
                }
            }
        }
        return true;
    });
}

/**
 * Package a message for delivery through different messenging networks
 *
 * @param  {Object} message
 *
 * @return {Object}
 */
function packagePushMessage(message) {
    var push = {
        tokens: message.tokens
    };
    _.each(message.methods, (method) => {
        switch (method) {
            case 'fcm':
                push.fcm = packageFirebaseMessage(message);
                break;
            case 'apns':
                push.apns = packageAppleMessage(message);
                break;
            case 'wns':
                push.wns = packageWindowsMessage(message);
                break;
        }
    });
    return push;
}

/**
 * Package a message for delivery through FCM
 *
 * @param  {Object} message
 *
 * @return {Object}
 */
function packageFirebaseMessage(message) {
    var data = { address: message.address };
    if (message.body.alert) {
        _.each(message.body.alert, (value, name) => {
            switch (name) {
                case 'title':
                    data.title = value;
                    break;
                case 'message':
                    data.body = value;
                    break;
                case 'profile_image':
                    data.image = message.address + value;
                    break;
                default:
                    data[name] = value;
            }
        });
    } else {
        _.each(message.body, (value, name) => {
            data[name] = value;
        });
        data['content-available'] = 1;
    }
    return {
        body: { data },
        attributes : {},
    };
}

var apnsNotId = 1;

/**
 * Package a message for delivery through APNS
 *
 * @param  {Object} message
 *
 * @return {Object}
 */
function packageAppleMessage(message) {
    var aps = { address: message.address };
    if (message.body.alert) {
        _.each(message.body.alert, (value, name) => {
            switch (name) {
                case 'message':
                    aps.alert = value;
                    aps.sound = 'default';
                    break;
                case 'title':
                case 'profile_image':
                    break;
                default:
                    aps[name] = value;
            }
        });
    } else {
        _.each(message.body, (value, name) => {
            aps[name] = value;
        });
        aps['content-available'] = 1;
    }
    var notId = apnsNotId++;
    if (apnsNotId >= 2147483647) {
        apnsNotId = 1;
    }
    return {
        body: { aps, notId },
        attributes: {},
    };
}

/**
 * Package a message for delivery through WNS
 *
 * @param  {Object} message
 *
 * @return {Object}
 */
function packageWindowsMessage(message) {
    var data = { address: message.address };
    if (message.body.alert) {
        var alert = message.body.alert;
        var toast = {
            $: {},
            visual: {
                binding: {
                    $: { template: 'ToastText02' },
                    text: [
                        { $: { id: 1 }, _: alert.title },
                        { $: { id: 2 }, _: alert.message },
                    ],
                },
            }
        };
        if (alert.profile_image) {
            var url = message.address + alert.profile_image;
            toast.visual.binding.$.template = 'ToastImageAndText02';
            toast.visual.binding.image = { $: { id: 1, src: url } };
        }

        // add launch data
        _.each(alert, (value, name) => {
            switch (name) {
                case 'title':
                case 'message':
                case 'profile_image':
                    break;
                default:
                    data[name] = value;
            }
        });
        toast.$.launch = JSON.stringify(data);

        var builder = new XML2JS.Builder({ headless: true });
        return {
            body: builder.buildObject({ toast }),
            attributes: {
                'AWS.SNS.MOBILE.WNS.Type': {
                    DataType: 'String',
                    StringValue: 'wns/toast'
                }
            },
        };
    } else {
        _.each(message.body, (value, name) => {
            data[name] = value;
        });
        return {
            body: JSON.stringify(data),
            attributes: {
                'AWS.SNS.MOBILE.WNS.Type': {
                    DataType: 'String',
                    StringValue: 'wns/raw'
                }
            },
        };
    }
}

var serverSignature;

/**
 * Return a randomly generated server ID
 *
 * @return {Promise<String>}
 */
function getServerSignature() {
    if (serverSignature) {
        return Promise.resolve(serverSignature);
    }
    return Crypto.randomBytesAsync(16).then((buffer) => {
        serverSignature = buffer.toString('hex');
        return serverSignature;
    });
}

/**
 * Handle validation request from push relay
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSignatureValidation(req, res) {
    var signature = req.body.signature;
    if (signature === serverSignature) {
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
}

/**
 * Post a request, retrying if a failure occurs
 *
 * @param  {String} url
 * @param  {Object} payload
 *
 * @return {Promise<Object>}
 */
function post(url, payload) {
    var options = {
        json: true,
        body: payload,
        method: 'post',
        url,
    };
    var succeeded = false;
    var attempts = 1;
    var result = null;
    var delayInterval = 500;
    var lastError;
    Async.do(() => {
        return attempt(options).then((body) => {
            result = body;
            succeeded = true;
        }).catch((err) => {
            lastError = err;
            if (err instanceof HTTPError) {
                if (err.statusCode === 429) {
                    // being rate-limited
                    delayInterval = 60 * 1000;
                } else if (err.statusCode >= 400 && err.statusCode <= 499) {
                    // something else
                    throw err;
                }
            }
        });
    });
    Async.while(() => {
        if (!succeeded) {
            if (attempts < 10) {
                // try again after a delay
                return Promise.delay(delayInterval).then(() => {
                    attempts++;
                    delayInterval *= 2;
                    return true;
                });
            } else {
                throw lastError;
            }
        }
    });
    Async.return(() => {
        return result;
    });
    return Async.end();
}

/**
 * Perform a HTTP request
 *
 * @param  {Object} options
 *
 * @return {Promise<Object>}
 */
function attempt(options) {
    return new Promise((resolve, reject) => {
        Request(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HTTPError(resp.statusCode);
            }
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

function Listener(user, subscription) {
    if (subscription.method === 'websocket') {
        this.type = 'websocket';
    } else {
        this.type = 'push';
    }
    this.user = user;
    this.subscription = subscription;
}
