import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import HTTP from 'http';
import SockJS from 'sockjs';
import Request from 'request';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import XML2JS from 'xml2js';
import HTTPError from 'errors/http-error';
import * as Shutdown from 'shutdown';

// accessors
import Subscription from 'accessors/subscription';
import System from 'accessors/system';
import User from 'accessors/user';

let server;
let sockets = [];

/**
 * Start listening for incoming Web Socket connection
 *
 * @return {Promise}
 */
async function listen() {
    // set up endpoint for push subscription
    let app = Express();
    app.use(CORS());
    app.use(BodyParser.json());
    app.set('json spaces', 2);

    app.post('/srv/push/signature', handleSignatureValidation);

    // set up SockJS server
    let sockJS = SockJS.createServer({
        sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.2/sockjs.min.js',
        log: (severity, message) => {
            if (severity === 'error') {
                console.error(message);
            }
        },
    });
    sockJS.on('connection', async (socket) => {
        if (socket) {
            sockets.push(socket);
            socket.on('close', () => {
                _.pull(sockets, socket);
            });

            // assign a random id to socket

            let buffer = await Crypto.randomBytesAsync(16);
            socket.token = buffer.toString('hex');
            socket.write(JSON.stringify({ socket: socket.token }));
        }
    });

    server = HTTP.createServer(app);
    sockJS.installHandlers(server, { prefix: '/srv/socket' });
    server.listen(80, '0.0.0.0');
}

/**
 * Shutdown HTTP server
 *
 * @return {Promise}
 */
async function shutdown() {
    for (let socket of sockets) {
        // for some reason socket is undefined sometimes during shutdown
        if (socket) {
            socket.end();
        }
    }
    sockets = [];
    await Shutdown.close(server);
}

/**
 * Retrieve a list of listeners
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Listener>>}
 */
async function find(db, schema) {
    let subscriptionCriteria = { deleted: false };
    let subscriptions = await Subscription.findCached(db, 'global', subscriptionCriteria, '*');
    let userCriteria = {
        id: _.map(subscriptions, 'user_id'),
        deleted: false,
    };
    let users = await User.findCached(db, 'global', userCriteria, '*');
    let listeners = [];
    for (let subscription of subscriptions) {
        let user = _.find(users, { id: subscription.user_id });
        if (user) {
            listeners.push(new Listener(user, subscription));
        }
    }
    return listeners;
}

/**
 * Send notifications to listeners
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise}
 */
async function send(db, messages) {
    await sendToWebsockets(db, messages);
    await sendToPushRelays(db, messages);
}

/**
 * Send messages intended for websockets
 *
 * @param  {Database} db
 * @param  {Array<Message>} messages
 *
 * @return {Promise}
 */
async function sendToWebsockets(db, messages) {
    let desiredMessages = await filterWebsocketMessages(messages);
    for (let message of desiredMessages) {
        // dispatch web-socket messages
        let listener = message.listener;
        let subscription = listener.subscription;
        let socket = _.find(sockets, { token: subscription.token });
        if (socket) {
            let messageType = _.first(_.keys(message.body));
            console.log(`Sending message (${messageType}) to socket ${socket.token} (${listener.user.username})`);
            socket.write(JSON.stringify(message.body));
        } else {
            subscription.deleted = true;
            await Subscription.updateOne(db, 'global', subscription);
        }
    }
}

/**
 * Remove messages that aren't intended for web-socket and those the users do
 * not wish to receive
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise<Array<Message>>}
 */
async function filterWebsocketMessages(messages) {
    return _.filter(messages, (message) => {
        if (message.listener.type !== 'websocket') {
            return false;
        }
        if (message.body.alert) {
            let user = message.listener.user;
            let name = _.snakeCase(message.body.alert.type);
            let receiving = _.get(user, `settings.web_alert.${name}`, false);
            if (!receiving) {
                return false;
            }
        }
        return true;
    });
}

async function sendToPushRelays(db, messages) {
    let signature = await getServerSignature();
    let desiredMessages = await filterPushMessages(messages);
    // in theory, it's possible to see multiple relays if a different relay is
    // selected after subscriptions were created
    let messagesByRelay = _.entries(_.groupBy(desiredMessages, 'listener.subscription.relay'));
    for (let [ relay, messages ] of messagesByRelay) {
        // merge identifical messages
        let messagesByJSON = {};
        let subscriptions = [];
        for (let message of messages) {
            let subscription = message.listener.subscription;
            let json = JSON.stringify(message.body);
            let m = messagesByJSON[json];
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
        }
        let pushMessages = _.map(messagesByJSON, (message) => {
            return packagePushMessage(message);
        });
        let url = `${relay}/dispatch`;
        let payload = {
            address: _.get(messages, [ 0, 'address' ]),
            signature,
            messages: pushMessages
        };
        let result = await post(url, payload);
        let errors = result.errors;
        if (!_.isEmpty(errors)) {
            console.error(errors);
        }

        // delete subscriptions that are no longer valid
        let expiredTokens = result.invalid_tokens;
        for (let subscription of subscriptions) {
            if (_.includes(expiredTokens, subscription.token)) {
                subscription.deleted = true;
                await Subscription.updateOne(db, 'global', subscription);
            }
        }
    }
}

/**
 * Remove messages that aren't push or if the user is already receiving
 * over websocket
 *
 * @param  {Array<Message>} messages
 *
 * @return {Promise<Array<Message>>}
 */
async function filterPushMessages(messages) {
    return _.filter(messages, (message) => {
        if (message.listener.type !== 'push') {
            return false;
        }
        if (message.body.alert) {
            let user = message.listener.user;
            let name = _.snakeCase(message.body.alert.type);
            let receiving = _.get(user, `settings.mobile_alert.${name}`, false);
            if (!receiving) {
                return false;
            }
            let hasWebSession = _.some(messages, (m) => {
                if (m.listener.type === 'websocket') {
                    if (m.listener.user.id === user.id) {
                        return true;
                    }
                }
            });
            if (hasWebSession) {
                let sendToBoth = _.get(user, `settings.mobile_alert.web_session`, false);
                if (!sendToBoth) {
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
                push['fcm'] = packageFirebaseMessage(message);
                break;
            case 'apns':
                push['apns'] = packageAppleMessage(message);
                break;
            case 'apns-sb':
                push['apns-sb'] = packageAppleMessage(message);
                break;
            case 'wns':
                push['wns'] = packageWindowsMessage(message);
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

let apnsNotID = 1;

/**
 * Package a message for delivery through APNS
 *
 * @param  {Object} message
 *
 * @return {Object}
 */
function packageAppleMessage(message) {
    let aps = { address: message.address };
    if (message.body.alert) {
        let alert = _.transform(message.body.alert, (alert, value, key) => {
            switch (key) {
                case 'message':
                    aps.alert = value;
                    aps.sound = 'default';
                    break;
                case 'title':
                case 'profile_image':
                    break;
                default:
                    aps[key] = value;
            }
        });
        _.assign(aps, alert);
    } else {
        _.assign(aps, message.body, { 'content-available': 1 });
    }
    let notID = apnsNotID++;
    if (apnsNotID >= 2147483647) {
        apnsNotID = 1;
    }
    return {
        // push notification looks for "notId"
        body: { aps, notId: notID },
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
    if (message.body.alert) {
        let alert = message.body.alert;
        let toast = {
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
            let url = message.address + alert.profile_image;
            toast.visual.binding.$.template = 'ToastImageAndText02';
            toast.visual.binding.image = { $: { id: 1, src: url } };
        }

        // add launch data
        let launchData = _.omit(alert, 'title', 'message', 'profile_image');
        _.assign(launchData, { address: message.address });
        toast.$.launch = JSON.stringify(launchData);

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
        let data = _.assign({ address: message.address }, message.body);
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

let serverSignature;

/**
 * Return a randomly generated server ID
 *
 * @return {Promise<String>}
 */
async function getServerSignature() {
    if (!serverSignature) {
        let buffer = await Crypto.randomBytesAsync(16);
        serverSignature = buffer.toString('hex');
    }
    return serverSignature;
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
async function post(url, payload) {
    let canceled = false;
    let attempts = 1;
    let delayInterval = 500;
    while (true) {
        try {
            let options = {
                json: true,
                body: payload,
                method: 'post',
                url,
            };
            return attempt(options);
        } catch (err) {
            if (err instanceof HTTPError) {
                if (err.statusCode === 429) {
                    // being rate-limited
                    delayInterval = 60 * 1000;
                } else if (err.statusCode >= 400 && err.statusCode <= 499) {
                    // something else
                    throw err;
                }
            }
            if (attempts < 10) {
                await Bluebird.delay(delayInterval);
                attempts++;
                delayInterval *= 2;
            } else {
                throw err;
            }
        }
    }
}

/**
 * Perform a HTTP request
 *
 * @param  {Object} options
 *
 * @return {Promise<Object>}
 */
async function attempt(options) {
    let body = await new Promise((resolve, reject) => {
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
    return body;
}

class Listener {
    constructor(user, subscription) {
        if (subscription.method === 'websocket') {
            this.type = 'websocket';
        } else {
            this.type = 'push';
        }
        this.user = user;
        this.subscription = subscription;
    }
}

export {
    listen,
    find,
    send,
    shutdown,
};
