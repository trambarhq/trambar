import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import HTTP from 'http';
import SockJS from 'sockjs';
import CrossFetch from 'cross-fetch';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import XML2JS from 'xml2js';
import { HTTPError } from '../errors.mjs';
import { TaskLog } from '../task-log.mjs';
import * as Shutdown from '../shutdown.mjs';

// accessors
import { Subscription } from '../accessors/subscription.mjs';
import { System } from '../accessors/system.mjs';
import { User } from '../accessors/user.mjs';

let server;
let sockets = [];

/**
 * Start listening for incoming Web Socket connection
 *
 * @return {Promise}
 */
async function listen() {
  // set up endpoint for push subscription
  const app = Express();
  app.use(CORS());
  app.use(BodyParser.json());
  app.set('json spaces', 2);

  app.post('/srv/push/signature', handleSignatureValidation);

  // set up SockJS server
  const sockJS = SockJS.createServer({
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

      const buffer = await Crypto.randomBytesAsync(16);
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
  const subscriptionCriteria = { deleted: false };
  const subscriptions = await Subscription.findCached(db, 'global', subscriptionCriteria, '*');
  const userCriteria = {
    id: _.map(subscriptions, 'user_id'),
    deleted: false,
  };
  const users = await User.findCached(db, 'global', userCriteria, '*');
  const listeners = [];
  for (let subscription of subscriptions) {
    const user = _.find(users, { id: subscription.user_id });
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
  const desiredMessages = await filterWebsocketMessages(messages);
  if (_.isEmpty(desiredMessages)) {
    return;
  }
  const taskLog = TaskLog.start('websocket-notify');
  try {
    const messageCount = _.size(desiredMessages);
    let messageNumber = 1;
    for (let message of desiredMessages) {
      // dispatch web-socket messages
      const listener = message.listener;
      const subscription = listener.subscription;
      const socket = _.find(sockets, { token: subscription.token });
      if (socket) {
        const messageType = _.first(_.keys(message.body));
        taskLog.describe(`sending ${messageType} to websocket: ${listener.user.username}`);
        socket.write(JSON.stringify(message.body));
        taskLog.append('sent', listener.user.username);
      } else {
        subscription.deleted = true;
        await Subscription.updateOne(db, 'global', subscription);
      }
      taskLog.report(messageNumber++, messageCount);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
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
      const user = message.listener.user;
      const name = _.snakeCase(message.body.alert.type);
      const receiving = _.get(user, `settings.web_alert.${name}`, false);
      if (!receiving) {
        return false;
      }
    }
    return true;
  });
}

async function sendToPushRelays(db, messages) {
  const signature = await getServerSignature();
  const desiredMessages = await filterPushMessages(messages);
  // in theory, it's possible to see multiple relays if a different relay is
  // selected after subscriptions were created
  const messagesByRelay = _.entries(_.groupBy(desiredMessages, 'listener.subscription.relay'));
  for (let [ relay, messages ] of messagesByRelay) {
    const taskLog = TaskLog.start('push-notify', { relay });
    try {
      // merge identifical messages
      const messagesByJSON = {};
      const subscriptions = [];
      for (let message of messages) {
        const subscription = message.listener.subscription;
        const json = JSON.stringify(message.body);
        const m = messagesByJSON[json];
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
        taskLog.append('sent', message.listener.user.username);
      }
      const pushMessages = _.map(messagesByJSON, (message) => {
        return packagePushMessage(message);
      });
      const url = `${relay}/dispatch`;
      const payload = {
        address: _.get(messages, [ 0, 'address' ]),
        signature,
        messages: pushMessages
      };
      taskLog.describe(`sending payload: ${pushMessages.length} message(s)`);
      const result = await post(url, payload);
      const errors = result.errors;

      // delete subscriptions that are no longer valid
      const expiredTokens = result.invalid_tokens;
      for (let subscription of subscriptions) {
        if (_.includes(expiredTokens, subscription.token)) {
          subscription.deleted = true;
          await Subscription.updateOne(db, 'global', subscription);
        }
      }
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
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
      const user = message.listener.user;
      const name = _.snakeCase(message.body.alert.type);
      const receiving = _.get(user, `settings.mobile_alert.${name}`, false);
      if (!receiving) {
        return false;
      }
      const hasWebSession = _.some(messages, (m) => {
        if (m.listener.type === 'websocket') {
          if (m.listener.user.id === user.id) {
            return true;
          }
        }
      });
      if (hasWebSession) {
        const sendToBoth = _.get(user, `settings.mobile_alert.web_session`, false);
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
  const push = {
    tokens: message.tokens
  };
  for (let method of message.methods) {
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
  }
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
  const data = { address: message.address };
  if (message.body.alert) {
    for (let [ name, value ] of _.entries(message.body.alert)) {
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
    }
  } else {
    for (let [ name, value ] of _.entries(message.body)) {
      data[name] = value;
    }
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
  const aps = { address: message.address };
  if (message.body.alert) {
    for (let [ key, value ] of _.entries(message.body.alert)) {
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
    }
  } else {
    aps['content-available'] = 1;
    for (let [ key, value ] of _.entries(message.body)) {
      aps[key] = value;
    }
  }
  const notID = apnsNotID++;
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
    const alert = message.body.alert;
    const toast = {
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
      const url = message.address + alert.profile_image;
      toast.visual.binding.$.template = 'ToastImageAndText02';
      toast.visual.binding.image = { $: { id: 1, src: url } };
    }

    // add launch data
    const launchData = {
      address: message.address,
      ..._.omit(alert, 'title', 'message', 'profile_image')
    };
    toast.$.launch = JSON.stringify(launchData);

    const builder = new XML2JS.Builder({ headless: true });
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
    const data = { address: message.address, ...message.body };
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
    const buffer = await Crypto.randomBytesAsync(16);
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
  const signature = req.body.signature;
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
  const method = 'post';
  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify(payload);

  let delayInterval = 500;
  let chances = 10;
  while (chances-- >= 0) {
    const response = await CrossFetch(url, { method, headers, body });
    const { status } = response;
    if (status >= 200 && status <= 299) {
      if (status === 204) {
        return null;
      } else {
        const json = await response.json();
        return json;
      }
    } else if (status === 429) {
      // being rate-limited
      await Bluebird.delay(60 * 1000);
    } else if ((status >= 400 && status <= 499) || chances === 0) {
      // throw if it's 4xx or we've tried enough times
      throw new HTTPError(status);
    }
    await Bluebird.delay(delayInterval);
    delayInterval *= 2;
  }
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
