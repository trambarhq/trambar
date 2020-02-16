import React from 'react';
import IndexedDBCache from 'common/data/indexed-db-cache.mjs';
import SQLIteCache from 'common/data/sqlite-cache.mjs';
import WebsocketNotifier from 'common/transport/websocket-notifier.mjs';
import PushNotifier from 'common/transport/push-notifier.mjs';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { EnvironmentMonitorPanel } from '../diagnostics/environment-monitor-panel.jsx';
import { RemoteDataSourcePanel } from '../diagnostics/remote-data-source-panel.jsx';
import { IndexedDBCachePanel } from '../diagnostics/indexed-db-cache-panel.jsx';
import { SQLiteCachePanel } from '../diagnostics/sqlite-cache-panel.jsx';
import { LocaleManagerPanel } from '../diagnostics/locale-manager-panel.jsx';
import { WebsocketNotifierPanel } from '../diagnostics/websocket-notifier-panel.jsx';
import { PushNotifierPanel } from '../diagnostics/push-notifier-panel.jsx';
import { PayloadManagerPanel } from '../diagnostics/payload-manager-panel.jsx';
import { CodePushPanel } from '../diagnostics/code-push-panel.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './diagnostics-page.scss';

/**
 * Synchronous component that actually renders the Diagnostics page.
 */
function DiagnosticsPage(props) {
  const { env, envMonitor, dataSource, localeManager, notifier, payloadManager, codePush } = props;

  return (
    <PageContainer className="diagnostics-page">
      <div className="panels">
        <ErrorBoundary env={env}>
          {renderEnvironmentMonitorPanel()}
          {renderRemoteDataSourcePanel()}
          {renderCachePanel()}
          {renderLocaleManagerPanel()}
          {renderNotifierPanel()}
          {renderPayloadManagerPanel()}
          {renderCodePushPanel()}
        </ErrorBoundary>
      </div>
      <div className="version">Version {process.env.VERSION}</div>
    </PageContainer>
  );

  function renderEnvironmentMonitorPanel() {
    const panelProps = { envMonitor };
    return <EnvironmentMonitorPanel {...panelProps} />;
  }

  function renderRemoteDataSourcePanel() {
    const panelProps = { dataSource };
    return <RemoteDataSourcePanel {...panelProps} />;
  }

  function renderCachePanel() {
    const panelProps = { cache: dataSource.cache };
    if (panelProps.cache instanceof IndexedDBCache) {
      return <IndexedDBCachePanel {...panelProps} />;
    } else if (panelProps.cache instanceof SQLiteCache) {
      return <SQLiteCachePanel {...panelProps} />;
    }
  }

  function renderLocaleManagerPanel() {
    const panelProps = { localeManager };
    return <LocaleManagerPanel {...panelProps} />;
  }

  function renderNotifierPanel() {
    const panelProps = { notifier };
    if (panelProps.notifier instanceof WebsocketNotifier) {
      return <WebsocketNotifierPanel {...panelProps} />;
    } else if (panelProps.notifier instanceof PushNotifier) {
      return <PushNotifierPanel {...panelProps} />;
    }
  }

  function renderPayloadManagerPanel() {
    const panelProps = { payloadManager };
    return <PayloadManagerPanel {...panelProps} />;
  }

  function renderCodePushPanel() {
    if (!codePush) {
      return null;
    }
    const panelProps = { codePush };
    return <CodePushPanel {...panelProps} />;
  }
}

DiagnosticsPage.diagnostics = true;

export {
  DiagnosticsPage as default,
  DiagnosticsPage,
};
