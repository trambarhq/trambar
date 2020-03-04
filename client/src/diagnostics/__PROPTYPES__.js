import PropTypes from 'prop-types';
import EnvironmentMonitor from 'common/env/environment-monitor.js';
import RemoteDataSource from 'common/data/remote-data-source.js';
import IndexedDBCache from 'common/data/indexed-db-cache.js';
import SQLiteCache from 'common/data/sqlite-cache.js';
import LocaleManager from 'common/locale/locale-manager.js';
import PayloadManager from 'common/transport/payload-manager.js';
import PushNotifier from 'common/transport/push-notifier.js';
import CodePush from 'common/transport/code-push.js';
import WebsocketNotifier from 'common/transport/websocket-notifier.js';

import { CodePushPanel } from './code-push-panel.jsx';
import { EnvironmentMonitorPanel } from './environment-monitor-panel.jsx';
import { IndexedDBCachePanel } from './indexed-db-cache-panel.jsx';
import { LocaleManagerPanel } from './locale-manager-panel.jsx';
import { PayloadManagerPanel } from './payload-manager-panel.jsx';
import { PushNotifierPanel } from './push-notifier-panel.jsx';
import { RemoteDataSourcePanel } from './remote-data-source-panel.jsx';
import { SQLiteCachePanel } from './sqlite-cache-panel.jsx';
import { WebsocketNotifierPanel } from './websocket-notifier-panel.jsx';

CodePushPanel.propTypes = {
  codePush: PropTypes.instanceOf(CodePush),
};
EnvironmentMonitorPanel.propTypes = {
  envMonitor: PropTypes.instanceOf(EnvironmentMonitor),
};
IndexedDBCachePanel.propTypes = {
  cache: PropTypes.instanceOf(IndexedDBCache),
};
LocaleManagerPanel.propTypes = {
  localeManager: PropTypes.instanceOf(LocaleManager),
};
PayloadManagerPanel.propTypes = {
  payloadManager: PropTypes.instanceOf(PayloadManager),
};
PushNotifierPanel.propTypes = {
  notifier: PropTypes.instanceOf(PushNotifier),
};
RemoteDataSourcePanel.propTypes = {
  dataSource: PropTypes.instanceOf(RemoteDataSource),
};
SQLiteCachePanel.propTypes = {
  cache: PropTypes.instanceOf(SQLiteCache),
};
WebsocketNotifierPanel.propTypes = {
  notifier: PropTypes.instanceOf(WebsocketNotifier),
};