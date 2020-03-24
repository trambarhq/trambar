import { EnvironmentMonitor } from './env/environment-monitor.js';
import { LocaleManager } from './locale/locale-manager.js';
import { RouteManager } from 'relaks-route-manager';
import { PayloadManager } from './transport/payload-manager.js';
import { PushNotifier } from './transport/push-notifier.js';
import { WebsocketNotifier } from './transport/websocket-notifier.js';
import { CodePush } from './transport/code-push.js';
import { RemoteDataSource } from './data/remote-data-source.js';
import { IndexedDBCache } from './data/indexed-db-cache.js';
import { LocalStorageCache } from './data/local-storage-cache.js';
import { BlobManager } from './transport/blob-manager.js';
import { isEqual, isMatch } from './utils/object-utils.js';

import languages from './languages.js';

const settingsLocation = {
  schema: 'local',
  table: 'settings'
};

const sessionLocation = {
  schema: 'local',
  table: 'session',
}

let applicationArea;

let dataSource;
let routeManager;
let payloadManager;
let envMonitor;
let localeManager;
let cache;
let notifier;
let codePush;

let currentLocation = {};
let currentConnection = {};
let currentSubscription = {};

let signInPageName;
let startPageName;

async function start(cfg) {
  applicationArea = cfg.area;

  // create data sources
  envMonitor = new EnvironmentMonitor({});
  routeManager = new RouteManager({
    useHashFallback: (envMonitor.platform === 'cordova'),
    basePath: cfg.routeManager.basePath,
    routes: cfg.routeManager.routes,
    rewrites: cfg.routeManager.rewrites,
    preloadingDelay: (envMonitor.platform === 'browser') ? 3000 : NaN,
    reloadFaultyScript: true,
  });
  localeManager = new LocaleManager({
    directory: languages
  });
  if (IndexedDBCache.isAvailable()) {
    cache = new IndexedDBCache({ databaseName: cfg.cache.name })
  } else {
    cache = new LocalStorageCache();
  }
  dataSource = new RemoteDataSource({
    basePath: cfg.dataSource.basePath,
    area: applicationArea,
    discoveryFlags: cfg.dataSource.discoveryFlags,
    retrievalFlags: cfg.dataSource.retrievalFlags,
    cache,
  });
  if (envMonitor.platform === 'cordova') {
    notifier = new PushNotifier({
    });
  } else {
    notifier = new WebsocketNotifier({
      basePath: '/srv/socket',
    });
  }
  payloadManager = new PayloadManager({
    uploadURL: getUploadURL,
    streamURL: getStreamURL,
  });
  if (cfg.codePush && envMonitor.platform === 'cordova') {
    codePush = new CodePush({
      keys: cfg.codePush.keys,
    });
    codePush.check();
  }
  for (let [ name, route ] of Object.entries(routeManager.routes)) {
    if (route.signIn) {
      signInPageName = name;
    } else if (route.start) {
      startPageName = name;
    }
  }

  // set up basic plumbing
  envMonitor.addEventListener('change', (evt) => {
    if (envMonitor.online && !envMonitor.paused) {
      dataSource.activate();
      payloadManager.activate();
      notifier.activate();
      changeNotification();

      if (codePush) {
        codePush.check(1 * 60 * 60);
      }
    } else {
      dataSource.deactivate();
      payloadManager.deactivate();

      // push notifier stays on when app is inactive
      if (!(notifier instanceof PushNotifier)) {
        notifier.deactivate();
      }
    }
  });
  routeManager.addEventListener('beforechange', (evt) => {
    // see if a page requires authentication
    let { name, context, route } = evt;
    if (route && route.public !== true) {
      // page requires authorization--see if it's been acquired already
      let { address } = context;
      if (address) {
        let location = { address };
        if (!dataSource.hasAuthorization(location)) {
          // nope, we need to postpone the page switch
          // first, see if there's a saved session
          let f = async () => {
            let session = await loadSession(address);
            if (!dataSource.restoreAuthorization(location, session)) {
              // there was none or it's expired--show the sign-in page
              if (!route.signIn) {
                await evt.substitute(signInPageName);
                // ask the data-source to request authentication
                await dataSource.requestAuthentication(location);
              }
            }
            return true;
          };
          evt.postponeDefault(f());
        }
      }
    }
  });
  routeManager.addEventListener('change', (evt) => {
    let { address, schema } = routeManager.context;
    currentLocation = { address, schema };
    changeNotification();
    changeSubscription();

    if (envMonitor.platform === 'cordova') {
      let url = routeManager.url;
      if (url === '/') {
        removeSetting('location');
      } else {
        saveSetting('location', url);
      }
    }
  });
  dataSource.addEventListener('authorization', (evt) => {
    // save the session
    saveSession(evt.session);
  });
  dataSource.addEventListener('expiration', async (evt) => {
    // remove the expired session
    await removeSession(evt.session);
    // redirect to start page
    await routeManager.push(startPageName, {}, { schema: undefined });
  });
  notifier.addEventListener('connection', (evt) => {
    currentConnection = evt.connection;
    changeSubscription();
  });
  notifier.addEventListener('disconnect', (evt) => {
    currentConnection = {};
  });
  notifier.addEventListener('notify', (evt) => {
    if (process.env.NODE_ENV !== 'production') {
      for (let change of evt.changes) {
        console.log(`Change notification: ${change.schema}.${change.table} ${change.id}`);
      }
    }

    // invalidate database queries
    dataSource.invalidate(evt.changes);

    for (let change of evt.changes) {
      if (change.table === 'task') {
        const { address, schema } = change;
        payloadManager.updatePayloadsBackendProgress({ address, schema });
      }
    }
  });
  notifier.addEventListener('revalidation', (evt) => {
    dataSource.revalidate(evt.revalidation);
    dataSource.invalidate();
  });
  localeManager.addEventListener('change', (evt) => {
    // save the selected locale after it's been changed
    let { localeCode, browserLocaleCode } = localeManager;
    if (localeCode == browserLocaleCode) {
      removeSetting('language');
    } else {
      saveSetting('language', localeCode);
    }
    // alert messages are language-specific, so we need to update the data
    // subscription when the language changes
    changeSubscription();
  });
  payloadManager.addEventListener('attachment', (evt) => {
    // associate file with payload id so we can find it again
    let { payload, part } = evt;
    let file = part.blob || part.cordovaFile;
    if (file) {
      let url = `payload:${payload.id}/${part.name}`;
      BlobManager.associate(file, url);
    }
  });
  payloadManager.addEventListener('permission', (evt) => {
    // add a task object in the backend so upload would be accepted
    let promise = addPayloadTasks(evt.destination, evt.payloads)
    evt.postponeDefault(promise);
  });
  payloadManager.addEventListener('backendprogress', (evt) => {
    // update payloads using information from the backend
    let promise = updateBackendProgress(evt.destination, evt.payloads);
    evt.postponeDefault(promise);
  });
  payloadManager.addEventListener('uploadpart', (evt) => {
    // associate a remote URL with a blob after it's been uploaded, so we
    // don't need to download the file again when the need arises
    let { destination, part, response } = evt;
    if (response && response.url) {
      let file = part.blob || part.cordovaFile;
      if (file) {
        let { address } = destination;
        let url = address + response.url;
        BlobManager.associate(file, url);
      }
    }
  });

  envMonitor.activate();
  routeManager.activate();
  if (envMonitor.online) {
    dataSource.activate();
    payloadManager.activate();
    notifier.activate();
  }

  // get saved local then load the initial page
  let savedLocale = await loadSetting('language');
  await localeManager.start(savedLocale);
  if (envMonitor.platform === 'cordova') {
    // get the last visited page
    let url = await loadSetting('location');
    // make sure the URL is still valid
    if (!url || !routeManager.match(url)) {
      url = '/';
    }
    await routeManager.start(url);
  } else {
    // on the browser the URL will be obtained from window.location
    await routeManager.start();
  }
  return {
    envMonitor,
    routeManager,
    localeManager,
    payloadManager,
    dataSource,
    notifier,
    codePush,
  };
}

/**
 * Load user-selected locale from local database
 *
 * @param  {String} key
 *
 * @return {Promise<*>}
 */
async function loadSetting(key) {
  let criteria = { key };
  let query = Object.assign({ criteria }, settingsLocation);
  let records = await dataSource.find(query);
  let record = records[0];
  if (record) {
    return record.value;
  }
}

/**
 * Save user-selected locale to local database
 *
 * @param  {String} key
 * @param  {*} value
 *
 * @return {Promise}
 */
async function saveSetting(key, value) {
  let record = { key, value };
  await dataSource.save(settingsLocation, [ record ]);
}

/**
 * Remove saved setting
 *
 * @param  {String} key
 *
 * @return {Promise}
 */
async function removeSetting(key) {
  let record = { key };
  await dataSource.remove(settingsLocation, [ record ]);
}

/**
 * Load saved session from local database for a particular host
 *
 * @param  {String} address
 *
 * @return {Promise<Object|undefined>}
 */
async function loadSession(address) {
  const criteria = { key: address };
  const query = Object.assign({ criteria }, sessionLocation);
  const records = await dataSource.find(query);
  const record = records[0];
  if (record) {
    return {
      address: record.key,
      area: record.area,
      handle: record.handle,
      token: record.token,
      user_id: record.user_id,
      etime: record.etime,
      atime: record.atime,
    };
  }
}

/**
 * Save session to local database
 *
 * @param  {Object} session
 *
 * @return {Promise}
 */
async function saveSession(session) {
  const now = (new Date).toISOString();
  const record = {
    key: session.address,
    area: session.area,
    handle: session.handle,
    token: session.token,
    user_id: session.user_id,
    etime: session.etime,
    atime: now,
  };
  await dataSource.save(sessionLocation, [ record ]);
}

/**
 * Remove a saved session
 *
 * @param  {Object} session
 *
 * @return {Promise}
 */
async function removeSession(session) {
  const record = {
    key: session.address,
  };
  await dataSource.remove(sessionLocation, [ record ]);
}

/**
 * Ask notifier to listen to the current location after that has changed
 */
async function changeNotification() {
  const { address } = currentLocation;
  if (currentConnection.address === address) {
    return;
  }
  currentConnection = {};
  if (notifier instanceof WebsocketNotifier) {
    notifier.connect(address);
  } else if (notifier instanceof PushNotifier) {
    if (dataSource.hasAuthorization(currentLocation)) {
      // get the push relay address from the server first
      const query = {
        address,
        schema: 'global',
        table: 'system',
        criteria: {}
      };
      const [ system ] = await dataSource.find(query);
      const relayURL = system?.settings.push_relay;
      if (relayURL) {
        notifier.connect(address, relayURL);
      }
    }
  }
}

/**
 * Change the change-notification subscription match the current location after
 * that has changed
 */
async function changeSubscription() {
  const { address, schema } = currentLocation;
  const watch = (applicationArea === 'admin') ? '*' : (schema || 'global');
  const { localeCode } = localeManager;
  const { method, token, relay, details } = currentConnection;
  if (!token) {
    // notifier hasn't establshed a connection yet
    return;
  }
  if (!dataSource.hasAuthorization(currentLocation)) {
    // we don't have access yet
    return;
  }
  if (!watch) {
    // not watching anything
    return;
  }
  const currentUserID = await dataSource.start(currentLocation);
  const record = {
    user_id: currentUserID,
    area: applicationArea,
    locale: localeCode,
    schema: watch,
    method,
    token,
    relay: relay || null,
    details,
  };
  if (currentSubscription.record) {
    if (isMatch(currentSubscription.record, record)) {
      // no need to update
      return;
    }
    // update the existing record instead of creating a new one
    record.id = currentSubscription.record.id;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Updating data-change subscription -> ${address}/${watch}`);
  }
  const subscriptionLocation = {
    address,
    schema: 'global',
    table: 'subscription'
  };
  const recordsSaved = await dataSource.save(subscriptionLocation, [ record ]);
  if (recordsSaved[0]) {
    currentSubscription = { address, record: recordsSaved[0] };

    // dispatch items in change queue once subscription is
    // reestablished, so that we don't miss the notification
    // caused by the changes
    dataSource.dispatchPending();
  }
}

/**
 * Return the destination URL for file upload
 *
 * @param  {Object} destination
 * @param  {String} id
 * @param  {String} type
 * @param  {String} part
 *
 * @return {String}
 */
function getUploadURL(destination, id, type, part) {
  const { address, schema } = destination;
  let uri;
  switch (type) {
    case 'image':
      if (part === 'main') {
        uri = `/srv/media/images/upload/${schema}/`;
      }
      break;
    case 'video':
      if (part === 'main') {
        uri = `/srv/media/videos/upload/${schema}/`;
      } else if (part === 'poster') {
        uri = `/srv/media/videos/poster/${schema}/`;
      }
      break;
    case 'audio':
      if (part === 'main') {
        uri = `/srv/media/audios/upload/${schema}/`;
      } else if (part === 'poster') {
        uri = `/srv/media/audios/poster/${schema}/`;
      }
      break;
  }
  return (uri) ? `${address}${uri}?token=${id}` : null;
}

/**
 * Return the URL for uploading a stream
 *
 * @param  {Object} destination
 * @param  {String} id
 *
 * @return {String}
 */
function getStreamURL(destination, id) {
  const { address, schema } = destination;
  return `${address}/srv/media/stream/?id=${id}`;
}

/**
 * Add a upload tasks to remote database
 *
 * @param {Object} destination
 * @param {Array<Object>} payloads
 *
 * @return {Promise}
 */
async function addPayloadTasks(destination, payloads) {
  const { address, schema } = destination;
  const currentUserID = await dataSource.start(destination);
  const location = { address, schema, table: 'task' };
  for (let payload of payloads) {
    try {
      const status = {}
      for (let part of payload.parts) {
        status[part.name] = false;
      }
      const task = {
        token: payload.id,
        action: `add-${payload.type}`,
        options: status,
        user_id: currentUserID,
      };
      await dataSource.save(location, [ task ]);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(err);
      }
      if (err.statusCode !== 409) {
        throw err;
      }
    }
  }
}

/**
 * Retrieve status of backend processing of uploaded media files (e.g.
 * video transcoding progress)
 *
 * @param  {Object} destination
 * @param  {Array<Object>} payloads
 *
 * @return {Promise<Boolean>}
 */
async function updateBackendProgress(destination, payloads) {
  const query = {
    address: destination.address,
    schema: destination.schema,
    table: 'task',
    criteria: {
      token: payloads.map(p => p.id),
    }
  };
  const tasks = await dataSource.find(query);
  let changed = false;
  for (let task of tasks) {
    const payload = payloads.find(p => p.id === task.token);
    if (payload) {
      if (payload.type === 'unknown') {
        // this is a payload from another session
        // restore its type
        payload.type = this.action?.replace(/^add\-/, '');
        payload.sent = (task.completion > 0);
        changed = true;
      }
      if (payload.processed !== payload.completion) {
        payload.processed = task.completion;
        changed = true;
      }
      if (payload.processEndTime !== task.etime) {
        payload.processEndTime = task.etime;
        if (task.etime && !task.failed) {
          payload.completed = true;
        }
        changed = true;
      }
      if (task.failed && !payload.failed) {
        payload.failed = true;
        changed = true;
      }
    }
  }
  return changed;
}

export {
  start as default,
  start as FrontEndCore,
};
