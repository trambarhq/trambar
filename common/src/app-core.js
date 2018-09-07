import EnvironmentMonitor from 'env/environment-monitor';
import LocaleManager from 'locale/locale-manager';
import RouteManager from 'relaks-route-manager';
import PayloadManager from 'transport/payload-manager';
import PushNotifier from 'transport/push-notifier';
import WebsocketNotifier from 'transport/websocket-notifier';
import RemoteDataSource from 'data/remote-data-source';
import IndexedDBCache from 'data/indexed-db-cache';
import LocalStorageCache from 'data/local-storage-cache';
import BlobManager from 'transport/blob-manager';

function start(app) {
    let environmentMonitorOptions = {
    };
    let environmentMonitor = new EnvironmentMonitor(environmentMonitorOptions);
    let routeManagerOptions = {
    };
    let routeManager = new RouteManager(routeManagerOptions);
    let localeManagerOptions = {

    };
    let localeManager = new LocaleManager(localeManagerOptions);
    let cache;
    if (IndexedDBCache.isAvailable()) {
        cache = new IndexedDBCache()
    } else {
        cache = new LocalStorageCache();
    }
    let dataSourceOptions = {
        cache,
    };
    let dataSource = new RemoteDataSource(dataSourceOptions);
    let notifier;
    if (process.env.PLATFORM === 'cordova') {
        let pushNotifierOptions = {
        };
        notifier = new PushNotifier();
    } else {
        let pushNotifierOptions = {
        };
        notifier = new WebsocketNotifier();
    }
    let payloadManagerOptions = {
        uploadURL: getUploadURL,
        streamURL: getStreamURL,
    };
    let payloadManager = new PayloadManager(payloadManagerOptions)

    environmentMonitor.activate();
    routeManager.activate();
    if (environmentMonitor.online) {
        dataSource.activate();
        payloadManager.activate();
        notifier.activate();
    }

    environmentMonitor.addEventListener('change', (evt) => {
        if (environmentMonitor.online) {
            dataSource.activate();
            payloadManager.activate();
            notifier.activate();
        } else {
            dataSource.deactivate();
            payloadManager.deactivate();
            notifier.deactivate();
        }
    });
    routeManager.addEventListener('beforechange', (evt) => {

    });
    dataSource.addEventListener('beforeauthentication', (evt) => {

    });
    notifier.addEventListener('notify', (evt) => {
        dataSource.invalidate(evt.changes);
    });
    notifier.addEventListener('revalidation', (evt) => {

    });
    localeManager.addEventListener('change', (evt) => {
        saveLocale(localeManager.localeCode);
    });
    payloadManager.addEventListener('permission', (evt) => {
        let promise = addPayloadTasks(evt.destination, evt.payloads)
        evt.postponeDefault(promise);
    });
    payloadManager.addEventListener('update', (evt) => {
        let promise = updateBackendProgress(evt.destination, evt.payloads);
        evt.postponeDefault(promise);
    });
    payloadManager.addEventListener('uploadpart', (evt) => {        
    });

    return loadLocale().then((savedLocale) => {
        return localeManager.start(savedLocale);
    }).then(() => {
        return routeManager.start();
    }).then(() => {
        return {
            environmentMonitor,
            payloadManager,
            localeManager,
            routeManager,
            dataSource,
            notifier,
        };
    });

    function loadLocale() {

    }

    function saveLocale() {

    }

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

    function getStreamURL(destination, id) {
        let { address, schema } = destination;
        return `${address}/srv/media/stream/?id=${id}`;
    }

    function addPayloadTasks(destination, payloads) {
        let { address, schema } = destination;
        let tasks = _.map(payloads, (payload) => {
            // place the status of each part in the options column
            let status = {}
            _.each(payload.parts, (part) => {
                status[part.name] = false;
            });
            return {
                token: payload.token,
                action: `add-${payload.type}`,
                options: status,
                user_id: userId,
            };
        });
        let location = {
            address,
            schema,
            table: 'task',
        };
        return dataSource.save(location, tasks);
    }

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
                        // restore type
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
}

this.associateRemoteURL(res.url, payload.destination.address, blob);
