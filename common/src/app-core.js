import _ from 'lodash';
import Promise from 'bluebird';
import EnvironmentMonitor from 'env/environment-monitor';
import LocaleManager from 'locale/locale-manager';
import RouteManager from 'relaks-route-manager';
import PayloadManager from 'transport/payload-manager';
import PushNotifier from 'transport/push-notifier';
import WebsocketNotifier from 'transport/websocket-notifier';
import CodePush from 'transport/code-push';
import RemoteDataSource from 'data/remote-data-source';
import IndexedDBCache from 'data/indexed-db-cache';
import LocalStorageCache from 'data/local-storage-cache';
import * as BlobManager from 'transport/blob-manager';

import languages from 'languages';

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

function start(cfg) {
    applicationArea = cfg.area;

    // create data sources
    envMonitor = new EnvironmentMonitor({});
    routeManager = new RouteManager({
        useHashFallback: (envMonitor.platform === 'cordova'),
        basePath: cfg.routeManager.basePath,
        routes: cfg.routeManager.routes,
        rewrites: cfg.routeManager.rewrites,
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

    envMonitor.activate();
    routeManager.activate();
    if (envMonitor.online) {
        dataSource.activate();
        payloadManager.activate();
        notifier.activate();
    }

    // set up basic plumbing
    envMonitor.addEventListener('change', (evt) => {
        if (envMonitor.online && !envMonitor.paused) {
            dataSource.activate();
            payloadManager.activate();
            notifier.activate();

            if (codePush) {
                codePush.check(1 * 60 * 60);
            }
        } else {
            dataSource.deactivate();
            payloadManager.deactivate();
            notifier.deactivate();
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
                    let promise = loadSession(address).then((session) => {
                        if (!dataSource.restoreAuthorization(location, session)) {
                            if (!route.signIn) {
                                // there was none or it's expired--show the sign-in page
                                let signInPageName = _.findKey(routeManager.routes, { signIn: true });
                                return evt.substitute(signInPageName).then(() => {
                                    // ask the data-source to request authentication
                                    return dataSource.requestAuthentication(location);
                                });
                            }
                        }
                        return true;
                    });
                    evt.postponeDefault(promise);
                }
            }
        }
    });
    routeManager.addEventListener('change', (evt) => {
        let { address, schema } = routeManager.context;
        currentLocation = { address, schema };
        changeNotification();
        changeSubscription();
    });
    dataSource.addEventListener('authorization', (evt) => {
        // save the session
        saveSession(evt.session);
    });
    dataSource.addEventListener('expiration', (evt) => {
        // remove the expired session
        removeSession(evt.session);
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
            _.each(evt.changes, (change) => {
                console.log(`Change notification: ${change.schema}.${change.table} ${change.id}`);
            });
        }

        // invalidate database queries
        dataSource.invalidate(evt.changes);
    });
    notifier.addEventListener('revalidation', (evt) => {
        // force cache revalidation
        // TODO
    });
    localeManager.addEventListener('change', (evt) => {
        // save the selected locale after it's been changed
        let { localeCode, browserLocaleCode } = localeManager;
        if (localeCode == browserLocaleCode) {
            removeLocale();
        } else {
            saveLocale(localeCode);
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
            var url = `payload:${payload.id}/${part.name}`;
            BlobManager.associate(file, url);
        }
    });
    payloadManager.addEventListener('permission', (evt) => {
        // add a task object in the backend so upload would be accepted
        let promise = addPayloadTasks(evt.destination, evt.payloads)
        evt.postponeDefault(promise);
    });
    payloadManager.addEventListener('update', (evt) => {
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

    // get saved local then load the initial page
    return loadLocale().then((savedLocale) => {
        return localeManager.start(savedLocale);
    }).then(() => {
        // on the browser the URL will be obtained from window.location
        let initialURL;
        if (envMonitor.platform === 'cordova') {
            initialURL = '/@cordova/';
        }
        return routeManager.start(initialURL);
    }).then(() => {
        return {
            envMonitor,
            routeManager,
            localeManager,
            payloadManager,
            dataSource,
            notifier,
            codePush,
        };
    });
}

/**
 * Load user-selected locale from local database
 *
 * @return {Promise<String>}
 */
function loadLocale() {
    let criteria = { key: 'language' };
    let query = Object.assign({ criteria }, settingsLocation);
    return dataSource.find(query).then((records) => {
        let record = records[0];
        if (record) {
            return record.selectedLocale;
        }
    });
}

/**
 * Save user-selected locale to local database
 *
 * @param  {String} localeCode
 *
 * @return {Promise}
 */
function saveLocale(localeCode) {
    var record = {
        key: 'language',
        selectedLocale: localeCode
    };
    return dataSource.save(settingsLocation, [ record ]).return();
}

/**
 * Remove saved locale
 *
 * @param  {String} localeCode
 *
 * @return {Promise}
 */
function removeLocale(localeCode) {
    var record = {
        key: 'language',
    };
    return dataSource.remove(settingsLocation, [ record ]).return();
}

/**
 * Load saved session from local database for a particular host
 *
 * @param  {String} address
 *
 * @return {Promise<Object>}
 */
function loadSession(address) {
    let criteria = { key: address };
    let query = Object.assign({ criteria }, sessionLocation);
    return dataSource.find(query).then((records) => {
        var record = records[0];
        if (record) {
            return {
                address: record.key,
                area: record.area,
                handle: record.handle,
                token: record.token,
                user_id: record.user_id,
                etime: record.etime,
            };
        }
    });
}

/**
 * Save session to local database
 *
 * @param  {Object} session
 *
 * @return {Promise}
 */
function saveSession(session) {
    let record = {
        key: session.address,
        area: session.area,
        handle: session.handle,
        token: session.token,
        user_id: session.user_id,
        etime: session.etime,
    };
    return dataSource.save(sessionLocation, [ record ]).return();
}

/**
 * Remove a saved session
 *
 * @param  {Object} session
 *
 * @return {Promise}
 */
function removeSession(session) {
    let record = {
        key: session.address,
    };
    return dataSource.remove(sessionLocation, [ record ]).return();
}

/**
 * Ask notifier to listen to the current location after that has changed
 */
function changeNotification() {
    let { address } = currentLocation;
    if (currentConnection.address === address) {
        return;
    }
    currentConnection = {};
    if (notifier instanceof WebsocketNotifier) {
        notifier.connect(address);
    } else if (notifier instanceof PushNotifier) {
        if (dataSource.hasAuthorization(currentLocation)) {
            // get the push relay address from the server first
            let query = {
                address,
                schema: 'global',
                table: 'system',
                criteria: {}
            };
            dataSource.find(query).get(0).then((system) => {
                let relayURL = _.get(system, 'settings.push_relay', '');
                notifier.connect(address, relayURL);
            });
        }
    }
}

/**
 * Change the change-notification subscription match the current location after
 * that has changed
 */
function changeSubscription() {
    let { address, schema } = currentLocation;
    let watch = (applicationArea === 'admin') ? '*' : schema;
    let { localeCode } = localeManager;
    let oldSubscriptionRecord;
    // see if the subscription is to the right server
    if (currentSubscription.address === address) {
        oldSubscriptionRecord = currentSubscription.record;
        // see if we're watching the right schema(s)
        if (currentSubscription.watch === watch) {
            if (currentSubscription.record) {
                // locale has to match
                if (currentSubscription.record.locale === localeCode) {
                    return;
                }
            }
        }
    }
    currentSubscription = {};
    if (!currentConnection.token) {
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
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Updating data-change subscription -> ${address}/${watch}`);
    }
    dataSource.start(currentLocation).then((currentUserID) => {
        let { method, token, relay, details } = currentConnection;
        let record = {
            user_id: currentUserID,
            area: applicationArea,
            locale: localeCode,
            schema: watch,
            method,
            token,
            relay,
            details,
        };
        if (oldSubscriptionRecord) {
            // update the existing record instead of creating a new one
            record.id = oldSubscriptionRecord.id;
        }
        let subscriptionLocation = {
            address,
            schema: 'global',
            table: 'subscription'
        };
        return dataSource.save(subscriptionLocation, [ record ]).get(0).then((record) => {
            if (record) {
                currentSubscription = { address, watch, record };
            }
        });
    });
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
    let { address, schema } = destination;
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
        case 'website':
            if (part === 'poster') {
                uri = `/srv/media/html/poster/${schema}/`;
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
    let { address, schema } = destination;
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
function addPayloadTasks(destination, payloads) {
    let { address, schema } = destination;
    return dataSource.start(destination).then((currentUserID) => {
        let location = { address, schema, table: 'task' };
        return Promise.each(payloads, (payload) => {
            let status = {}
            _.each(payload.parts, (part) => {
                status[part.name] = false;
            });
            let task = {
                token: payload.id,
                action: `add-${payload.type}`,
                options: status,
                user_id: currentUserID,
            };
            return dataSource.save(location, [ task ]).catch((err) => {
                if (process.env.NODE_ENV !== 'production') {
                    console.error(err);
                }
                if (err.statusCode !== 409) {
                    throw err;
                }
            });
        });
    });
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
function updateBackendProgress(destination, payloads) {
    let location = {
        address,
        schema,
        table: 'task',
        criteria: {
            token: _.map(payloads, 'id'),
        }
    };
    return dataSource.find(query).then((tasks) => {
        let changed = false;
        _.each(tasks, (task) => {
            let payload = _.find(payloads, { id: task.token });
            if (payload) {
                if (payload.type === 'unknown') {
                    // this is a payload from another session
                    // restore its type
                    payload.type = _.replace(this.action, /^add\-/, '');
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
        });
        return changed;
    });
}

export {
    start as default,
};
