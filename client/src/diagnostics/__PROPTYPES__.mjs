import PropTypes from 'prop-types';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import IndexedDBCache from 'common/data/indexed-db-cache.mjs';
import SQLiteCache from 'common/data/sqlite-cache.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import CodePush from 'common/transport/code-push.mjs';
import WebsocketNotifier from 'common/transport/websocket-notifier.mjs';

import { CodePushPanel } from './code-push-panel.jsx';
import { EnvironmentMonitorPanel } from './environment-monitor-panel.jsx';
import { IndexedDBCachePanel } from './indexed-db-ache-panel.jsx';
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
