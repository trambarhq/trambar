import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import AppCore from 'app-core';
import CORSRewriter from 'routing/cors-rewriter';

import ComponentRefs from 'utils/component-refs';
import HTTPError from 'errors/http-error';

import { routes } from 'routing';

// proxy objects
import Database from 'data/database';
import Route from 'routing/route';
import Payloads from 'transport/payloads';
import Locale from 'locale/locale';
import Environment from 'env/environment';

// widgets
import SideNavigation from 'widgets/side-navigation';
import TaskAlertBar from 'widgets/task-alert-bar';
import UploadProgress from 'widgets/upload-progress';
import ErrorBoundary from 'widgets/error-boundary';

import 'setimmediate';
import 'utils/lodash-extra';
import 'font-awesome-webpack';
import 'application.scss';
import 'colors.scss';

const widthDefinitions = {
    'narrow': 700,
    'standard': 1000,
    'wide': 1400,
    'super-wide': 1700,
    'ultra-wide': 2000,
};

class Application extends PureComponent {
    static displayName = 'Application';
    static coreConfiguration = {
        routeManager: {
            basePath: '/admin',
            routes,
            rewrites: [ CORSRewriter ],
        },
        dataSource: {
            basePath: '/srv/admin-data',
            area: 'admin',
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
        notifier: {
            global: true,
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
        let { module } = route.params;
        if (process.env.NODE_ENV !== 'production') {
            if (!module) {
                if (!route.name) {
                    console.log('No routing information');
                } else {
                    console.log('No component for route: ' + route.name);
                }
                return null;
            } else if (!module.default) {
                console.log('Component not exported as default: ' + route.name);
                return null;
            }
        }
        let CurrentPage = module.default;
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
        }, route.params);
        let key = route.path;
        return (
            <div className="application" id="application">
                <SideNavigation {...navProps} />
                <section className="page-view-port">
                    <div className="scroll-box">
                        <ErrorBoundary env={env}>
                            <CurrentPage key={key} {...pageProps} />
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
     * Called when upload payloads changes
     *
     * @param  {PayloadManagerEvent} evt
     */
    handlePayloadsChange = (evt) => {
        let { showingUploadProgress } = this.state;
        let payloads = new Payloads(evt.target);
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
    Application as default,
    Application,
    AppCore,
};

// pull in modules here so they won't be placed in the JS files of the pages
import 'chartist';
import 'diff';
import 'hammerjs';
import 'mark-gor';
import 'memoizee';
import 'moment';
import 'octicons';
import 'sockjs-client';
import 'react-dom';
import 'relaks';

// pull in all widgets and dialogs for the same reason
require.context('widgets', true);
require.context('dialogs', true);

import EnvironmentMonitor from 'env/environment-monitor';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'data/remote-data-source';
import PayloadManager from 'transport/payload-manager';
import LocaleManager from 'locale/locale-manager';
import Notifier from 'transport/notifier';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Application.propTypes = {
        envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
        dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
        localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
        payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
        notifier: PropTypes.instanceOf(Notifier),
    };
}
