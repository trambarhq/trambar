import EnvironmentMonitor from 'env/environment-monitor';
import LocaleManager from 'locale/locale-manager';
import RouteManager from 'relaks-route-manager';
import PayloadManager from 'transport/payload-manager';
import PushNotifier from 'transport/push-notifier';
import WebsocketNotifier from 'transport/websocket-notifier';
import RemoteDataSource from 'data/remote-data-source';
import IndexedDBCache from 'data/indexed-db-cache';
import LocalStorageCache from 'data/local-storage-cache';

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
    notifier.addEventListener('notify', (evt) => {
        dataSource.invalidate(evt.changes);
    });
    notifier.addEventListener('revalidation', (evt) => {

    });
    localeManager.addEventListener('change', (evt) => {
        saveLocale(localeManager.localeCode);
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
}
