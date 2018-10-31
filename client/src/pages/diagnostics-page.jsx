import _ from 'lodash';
import React, { PureComponent } from 'react';
import IndexedDBCache from 'data/indexed-db-cache';
import SQLIteCache from 'data/sqlite-cache';
import WebsocketNotifier from 'transport/websocket-notifier';
import PushNotifier from 'transport/push-notifier';

// widgets
import PageContainer from 'widgets/page-container';
import EnvironmentMonitorPanel from 'diagnostics/environment-monitor-panel';
import RemoteDataSourcePanel from 'diagnostics/remote-data-source-panel';
import IndexedDBCachePanel from 'diagnostics/indexed-db-cache-panel';
import SQLiteCachePanel from 'diagnostics/sqlite-cache-panel';
import LocaleManagerPanel from 'diagnostics/locale-manager-panel';
import WebsocketNotifierPanel from 'diagnostics/websocket-notifier-panel';
import PushNotifierPanel from 'diagnostics/push-notifier-panel';
import PayloadManagerPanel from 'diagnostics/payload-manager-panel';
import CodePushPanel from 'diagnostics/code-push-panel';
import ErrorBoundary from 'widgets/error-boundary';

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

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

import EnvironmentMonitor from 'env/environment-monitor';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'data/remote-data-source';
import PayloadManager from 'transport/payload-manager';
import LocaleManager from 'locale/locale-manager';
import Notifier from 'transport/notifier';
import CodePush from 'transport/code-push';

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
