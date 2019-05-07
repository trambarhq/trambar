import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import FrontEndCore from 'common/front-end-core.mjs';
import CORSRewriter from 'common/routing/cors-rewriter.mjs';

import ComponentRefs from 'common/utils/component-refs.mjs';
import HTTPError from 'common/errors/http-error.mjs';

import { routes } from './routing.mjs';

// proxy objects
import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Locale from 'common/locale/locale.mjs';
import Environment from 'common/env/environment.mjs';

// widgets
import SideNavigation from './widgets/side-navigation.jsx';
import TaskAlertBar from './widgets/task-alert-bar.jsx';
import UploadProgress from 'common/widgets/upload-progress.jsx';
import ErrorBoundary from 'common/widgets/error-boundary.jsx';

import 'setimmediate';
import 'common/utils/lodash-extra.mjs';
import 'font-awesome-webpack';
import './front-end.scss';
import './colors.scss';

const widthDefinitions = {
    'narrow': 700,
    'standard': 1000,
    'wide': 1400,
    'super-wide': 1700,
    'ultra-wide': 2000,
};

class FrontEnd extends PureComponent {
    static displayName = 'FrontEnd';
    static coreConfiguration = {
        area: 'admin',
        routeManager: {
            basePath: '/admin',
            routes,
            rewrites: [ CORSRewriter ],
        },
        dataSource: {
            basePath: '/srv/admin-data',
            discoveryFlags: {
                include_deleted: true,
            },
            retrievalFlags: {
                include_ctime: true,
                include_mtime: true,
            },
        },
        cache: {
            name: 'trambar-admin'
        },
    };

    constructor(props) {
        super(props);
        let {
            dataSource,
            routeManager,
            payloadManager,
            envMonitor,
            localeManager,
        } = this.props;
        let { address } = routeManager.context;
        let locale = new Locale(localeManager);
        this.state = {
            database: new Database(dataSource, { address }),
            payloads: new Payloads(payloadManager, { address, schema: 'global' }),
            route: new Route(routeManager),
            env: new Environment(envMonitor, { locale, address, widthDefinitions }),

            showingUploadProgress: false,
        };
    }

    /**
     * Render user interface
     *
     * @return {ReactElement|null}
     */
    render() {
        let { database, route, env, payloads } = this.state;
        let CurrentPage = route.page;
        let navProps = {
            database,
            route,
            env,
            disabled: route.public,
        };
        let pageProps = _.assign({
            database,
            route,
            env,
            payloads,
        }, route.pageParams);
        return (
            <div className="front-end">
                <SideNavigation {...navProps} />
                <section className="page-view-port">
                    <div className="scroll-box">
                        <ErrorBoundary env={env}>
                            <CurrentPage {...pageProps} />
                        </ErrorBoundary>
                    </div>
                    {this.renderTaskAlert()}
                    {this.renderUploadProgress()}
                </section>
            </div>
        );
    }

    /**
     * Render alert message in pop-up bar at bottom of page
     *
     * @return {ReactElement|null}
     */
    renderTaskAlert () {
        let { database, route, env } = this.state;
        let props = { database, route, env };
        return <TaskAlertBar {...props} />;
    }

    /**
     * Render upload progress pop-up if it's activated
     *
     * @return {ReactElement|null}
     */
    renderUploadProgress () {
        let { env, payloads, showingUploadProgress } = this.state;
        if (!showingUploadProgress) {
            return null;
        }
        let props = {
            payloads,
            env,
        };
        return <UploadProgress {...props} />;
    }

    /**
     * Attach beforeUnload event handler
     */
    componentDidMount () {
        let {
            dataSource,
            routeManager,
            payloadManager,
            envMonitor,
            localeManager,
            notifier,
        } = this.props;
        dataSource.addEventListener('change', this.handleDatabaseChange);
        dataSource.addEventListener('stupefaction', this.handleStupefaction);
        routeManager.addEventListener('beforechange', this.handleRouteBeforeChange, true);
        routeManager.addEventListener('change', this.handleRouteChange);
        payloadManager.addEventListener('change', this.handlePayloadsChange);
        envMonitor.addEventListener('change', this.handleEnvironmentChange);
        localeManager.addEventListener('change', this.handleLocaleChange);
        notifier.addEventListener('alert', this.handleAlertClick);

        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * Called when the database queries might yield new results
     *
     * @param  {RemoteDataSourceEvent} evt
     */
    handleDatabaseChange = (evt) => {
        let { route } = this.state;
        let { address } = route.context;
        let database = new Database(evt.target, { address });
        this.setState({ database });
    }

    /**
     * Called when data source fails to find an expected object
     *
     * @param  {RemoteDataSourceEvent} evt
     */
    handleStupefaction = (evt) => {
        let { routeManager } = this.props;
        routeManager.substitute('error-page');
    }

    /**
     * Called when upload payloads changes
     *
     * @param  {PayloadManagerEvent} evt
     */
    handlePayloadsChange = (evt) => {
        let { route, showingUploadProgress } = this.state;
        let { address } = route.context;
        let payloads = new Payloads(evt.target, { address, schema: 'global' });
        if (!payloads.uploading) {
            // stop showing it once it's done
            showingUploadProgress = false;
        }
        this.setState({ payloads, showingUploadProgress });
    }

    /**
     * Called when the locale changes
     *
     * @param  {LocaleManagerEvent} evt
     */
    handleLocaleChange = (evt) => {
        let { envMonitor, localeManager, routeManager } = this.props;
        let { address } = routeManager.context;
        let locale = new Locale(localeManager);
        let env = new Environment(envMonitor, { locale, address, widthDefinitions });
        this.setState({ env });
        document.title = locale.t('app-title');
    }

    /**
     * Called when the locale changes
     *
     * @param  {EnvironmentMonitorEvent} evt
     */
    handleEnvironmentChange = (evt) => {
        let { envMonitor, routeManager } = this.props;
        let { address } = routeManager.context;
        let { locale } = this.state.env;
        let env = new Environment(envMonitor, { locale, address, widthDefinitions });
        this.setState({ env });
    }

    /**
     * Called before a route change occurs
     *
     * @param  {RelaksRouteManagerEvent} evt
     */
    handleRouteBeforeChange = (evt) => {
        let { route } = this.state;
        if (!_.isEmpty(route.callbacks)) {
            // postpone the route change until each callbacks has been called;
            // if one returns false, then cancel the change
            let promise = Promise.reduce(route.callbacks, (proceed, callback) => {
                if (proceed === false) {
                    return false;
                }
                return callback();
            }, true);
            evt.postponeDefault(promise);
        }
    }

    /**
     * Called when the route changes
     *
     * @param  {RelaksRouteManagerEvent} evt
     */
    handleRouteChange = (evt) => {
        let { routeManager, dataSource, payloadManager } = this.props;
        let route = new Route(routeManager);
        let { address } = route.context;
        let { database, payloads, env } = this.state;
        if (address !== database.context.address) {
            // change database and payloads the server address changes
            database = new Database(dataSource, { address });
            payloads = new Payloads(payloadManager, { address, schema: 'global' });
        }
        if (address !== env.address) {
            env = new Environment(envMonitor, { locale, address, widthDefinitions });
        }
        this.setState({ route, database, env });
    }

    /**
     * Called when user clicks on an alert message
     *
     * @param  {NotifierAlert} evt
     */
    handleAlertClick = (evt) =>{

    }

    /**
     * Called when user navigate to another site or hit refresh
     *
     * @param  {Event} evt
     */
    handleBeforeUnload = (evt) => {
        let { payloads } = this.state;
        if (payloads.uploading) {
            // Chrome will repaint only after the modal dialog is dismissed
            this.setState({ showingUploadProgress: true });
            return (evt.returnValue = 'Are you sure?');
        }
    }
}

export {
    FrontEnd as default,
    FrontEnd,
    FrontEndCore,
};

import EnvironmentMonitor from 'common/env/environment-monitor.mjs';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'common/data/remote-data-source.mjs';
import PayloadManager from 'common/transport/payload-manager.mjs';
import LocaleManager from 'common/locale/locale-manager.mjs';
import Notifier from 'common/transport/notifier.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    FrontEnd.propTypes = {
        envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
        dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
        localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
        payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
        notifier: PropTypes.instanceOf(Notifier),
    };
}
