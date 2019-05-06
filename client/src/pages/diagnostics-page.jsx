import _ from 'lodash';
import React, { PureComponent } from 'react';
import IndexedDBCache from 'common/data/indexed-db-cache.mjs';
import SQLIteCache from 'common/data/sqlite-cache.mjs';
import WebsocketNotifier from 'common/transport/websocket-notifier.mjs';
import PushNotifier from 'common/transport/push-notifier.mjs';

// widgets
import PageContainer from '../widgets/page-container.jsx';
import EnvironmentMonitorPanel from '../diagnostics/environment-monitor-panel.jsx';
import RemoteDataSourcePanel from '../diagnostics/remote-data-source-panel.jsx';
import IndexedDBCachePanel from '../diagnostics/indexed-db-cache-panel.jsx';
import SQLiteCachePanel from '../diagnostics/sqlite-cache-panel.jsx';
import LocaleManagerPanel from '../diagnostics/locale-manager-panel.jsx';
import WebsocketNotifierPanel from '../diagnostics/websocket-notifier-panel.jsx';
import PushNotifierPanel from '../diagnostics/push-notifier-panel.jsx';
import PayloadManagerPanel from '../diagnostics/payload-manager-panel.jsx';
import CodePushPanel from '../diagnostics/code-push-panel.jsx';
import ErrorBoundary from 'common/widgets/error-boundary.jsx';

import './diagnostics-page.scss';

/**
 * Synchronous component that actually renders the Diagnostics page.
 *
 * @extends PureComponent
 */
class DiagnosticsPage extends PureComponent {
    static displayName = 'DiagnosticsPage';
    static diagnostics = true;

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { env } = this.props;
        return (
            <PageContainer className="diagnostics-page">
                <div className="panels">
                    <ErrorBoundary env={env}>
                        {this.renderEnvironmentMonitorPanel()}
                        {this.renderRemoteDataSourcePanel()}
                        {this.renderCachePanel()}
                        {this.renderLocaleManagerPanel()}
                        {this.renderNotifierPanel()}
                        {this.renderPayloadManagerPanel()}
                        {this.renderCodePushPanel()}
                    </ErrorBoundary>
                </div>
                <div className="version">Version {process.env.VERSION}</div>
            </PageContainer>
        );
    }

    /**
     * Render diagnostics of EnvironmentMonitor
     *
     * @return {ReactElement}
     */
    renderEnvironmentMonitorPanel() {
        let { envMonitor } = this.props;
        let panelProps = { envMonitor };
        return <EnvironmentMonitorPanel {...panelProps} />;
    }

    /**
     * Render diagnostics of RemoteDataSource
     *
     * @return {ReactElement}
     */
    renderRemoteDataSourcePanel() {
        let { dataSource } = this.props;
        let panelProps = { dataSource };
        return <RemoteDataSourcePanel {...panelProps} />;
    }

    /**
     * Render diagnostics of IndexedDBCache or SQLiteCache
     *
     * @return {ReactElement}
     */
    renderCachePanel() {
        let { dataSource } = this.props;
        let panelProps = { cache: dataSource.cache };
        if (panelProps.cache instanceof IndexedDBCache) {
            return <IndexedDBCachePanel {...panelProps} />;
        } else if (panelProps.cache instanceof SQLiteCache) {
            return <SQLiteCachePanel {...panelProps} />;
        }
    }

    /**
     * Render diagnostics of LocaleManager
     *
     * @return {ReactElement}
     */
    renderLocaleManagerPanel() {
        let { localeManager } = this.props;
        let panelProps = { localeManager };
        return <LocaleManagerPanel {...panelProps} />;
    }

    /**
     * Render diagnostics of WebsocketNotifier or PushNotifier
     *
     * @return {ReactElement}
     */
    renderNotifierPanel() {
        let { notifier } = this.props;
        let panelProps = { notifier };
        if (panelProps.notifier instanceof WebsocketNotifier) {
            return <WebsocketNotifierPanel {...panelProps} />;
        } else if (panelProps.notifier instanceof PushNotifier) {
            return <PushNotifierPanel {...panelProps} />;
        }
    }

    /**
     * Render diagnostics of PayloadManager
     *
     * @return {ReactElement}
     */
    renderPayloadManagerPanel() {
        let { payloadManager } = this.props;
        let panelProps = { payloadManager };
        return <PayloadManagerPanel {...panelProps} />;
    }

    /**
     * Render diagnostics of CodePush
     *
     * @return {ReactElement|null}
     */
    renderCodePushPanel() {
        let { codePush } = this.props;
        if (!codePush) {
            return null;
        }
        let panelProps = { codePush };
        return <CodePushPanel {...panelProps} />;
    }
}

export {
    DiagnosticsPage as default,
    DiagnosticsPage,
};

import Database from 'common/data/database.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

import EnvironmentMonitor from 'common/env/environment-monitor.mjs';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import Notifier from 'common/transport/notifier.mjs';
import CodePush from 'common/transport/code-push.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DiagnosticsPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
        dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
        localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
        payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
        notifier: PropTypes.instanceOf(Notifier),
        codePush: PropTypes.instanceOf(CodePush),
    };
}
