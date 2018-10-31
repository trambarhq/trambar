import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import AppCore from 'app-core';
import { routes } from 'routing';
import CORSRewriter from 'routing/cors-rewriter';
import SchemaRewriter from 'routing/schema-rewriter';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectLinkFinder from 'objects/finders/project-link-finder';
import { codePushDeploymentKeys } from 'keys';

// non-visual components
import Database from 'data/database';
import Route from 'routing/route';
import Payloads from 'transport/payloads';
import Locale from 'locale/locale';
import Environment from 'env/environment';

// widgets
import TopNavigation from 'widgets/top-navigation';
import BottomNavigation from 'widgets/bottom-navigation';
import UploadProgress from 'widgets/upload-progress';
import NotificationView from 'views/notification-view';
import ErrorBoundary from 'widgets/error-boundary';

import 'utils/lodash-extra';
import 'application.scss';
import 'font-awesome-webpack';

const widthDefinitions = {
    'single-col': 0,
    'double-col': 700,
    'triple-col': 1300,
};

class Application extends PureComponent {
    static displayName = 'Application';
    static coreConfiguration = {
        routeManager: {
            routes,
            rewrites: [ CORSRewriter, SchemaRewriter ],
        },
        dataSource: {
            area: 'client',
            discoveryFlags: {
                include_uncommitted: true,
            },
        },
        codePush: {
            keys: codePushDeploymentKeys
        },
        cache: {
            name: 'trambar'
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
            codePush,
        } = props;
        let { address, schema } = routeManager.context;
        let locale = new Locale(localeManager);
        let extra = { locale, address, widthDefinitions, codePush };
        this.state = {
            database: new Database(dataSource, { address, schema }),
            payloads: new Payloads(payloadManager, { address, schema }),
            route: new Route(routeManager),
            env: new Environment(envMonitor, extra),

            showingUploadProgress: false,
            makingRequests: false,
        };
    }

    getClassName() {
        let { env } = this.state;
        let mode;
        if (env.isWiderThan('triple-col')) {
            mode = 'triple-col';
        } else if (env.isWiderThan('double-col')) {
            mode = 'double-col';
        } else {
            mode = 'single-col';
        }
        let className = `application ${mode}`;
        // TODO
        /*
        if (this.state.theme.keyboard) {
            className += ` keyboard`;
        }
        */
        if (env.pointingDevice === 'mouse') {
            className += ' no-touch';
        }
        return className;
    }

    /**
     * Render the application
     *
     * @return {ReactElement}
     */
    render() {
        let { database, route, env, payloads, makingRequests } = this.state;
        let settings = route.params.ui;
        let topNavProps = {
            searching: false, // TODO
            settings,
            database,
            route,
            payloads,
            makingRequests,
            env,
        };
        let bottomNavProps = {
            settings,
            database,
            route,
            env,
        };
        let className = this.getClassName();
        return (
            <div className={className} id="application">
                <TopNavigation {...topNavProps} />
                <section className="page-view-port">
                    <ErrorBoundary env={env}>
                        {this.renderCurrentPage()}
                        {this.renderPreviousPage()}
                    </ErrorBoundary>
                </section>
                <BottomNavigation {...bottomNavProps} />
                {this.renderUploadProgress()}
            </div>
        );
    }

    renderCurrentPage() {
        let { database, route, env, payloads } = this.state;
        let CurrentPage = getRouteClass(route);
        if (!CurrentPage) {
            return null;
        }
        let pageProps = _.assign({
            database,
            route,
            payloads,
            env,
        }, _.omit(route.params, 'module'));
        if (CurrentPage.diagnostics) {
            _.assign(pageProps, this.props);
        }
        return <CurrentPage {...pageProps} />;
    }

    renderPreviousPage() {
        let { database, prevRoute, env, payloads } = this.state;
        let PreviousPage = getRouteClass(prevRoute);
        if (!PreviousPage) {
            return null;
        }
        let pageProps = _.assign({
            database,
            route: prevRoute,
            payloads,
            env,
            transitionOut: true,
            onTransitionOut: this.handlePageTransitionOut,
        }, _.omit(prevRoute.params, 'module'));
        return <PreviousPage {...pageProps} />;
    }

    /**
     * Render upload progress pop-up if it's activated
     *
     * @return {ReactElement|null}
     */
    renderUploadProgress() {
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
     * Attach event handlers
     */
    componentDidMount() {
        let {
            dataSource,
            routeManager,
            payloadManager,
            envMonitor,
            localeManager,
            notifier,
            codePush,
        } = this.props;
        dataSource.addEventListener('change', this.handleDatabaseChange);
        dataSource.addEventListener('requeststart', this.handleRequestStart);
        dataSource.addEventListener('requestend', this.handleRequestEnd);
        routeManager.addEventListener('beforechange', this.handleRouteBeforeChange, true);
        routeManager.addEventListener('change', this.handleRouteChange);
        payloadManager.addEventListener('change', this.handlePayloadsChange);
        envMonitor.addEventListener('change', this.handleEnvironmentChange);
        localeManager.addEventListener('change', this.handleLocaleChange);
        notifier.addEventListener('alert', this.handleAlertClick);
        if (codePush) {
            codePush.addEventListener('change', this.handleCodePushChange);
        }

        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    componentDidUpdate(prevProps, prevState) {
        let { database } = this.state;
        let { database: databaseBefore } = prevState;
        if (database !== databaseBefore) {
            let { authorized: authorized } = database;
            let { address, schema } = database.context;
            let { authorized: authorizedBefore } = databaseBefore;
            let { address: addressBefore, schema: schemaBefore } = databaseBefore.context;
            if (authorizedBefore !== authorized || addressBefore !== address || schemaBefore !== schema) {
                if (authorized && address && schema) {
                    this.saveLocation(address, schema);
                }
            }
            if (addressBefore !== address) {
                if (authorized && address) {
                    this.removeDefunctLocations();
                }
            }
        }
    }

    /**
     * Save a location to cache
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<Object>}
     */
    saveLocation(address, schema) {
        // get the project object so we have the project's display name
        let { database } = this.state;
        let db = database.use({ by: this });
        return ProjectFinder.findProjectByName(db, schema).then((project) => {
            let name = project.details.title;
            let atime = (new Date).toISOString();
            let key = `${address}/${schema}`;
            let record = { key, address, schema, name, atime };
            return db.saveOne({ schema: 'local', table: 'project_link' }, record);
        });
    }

    /**
     * Remove all links to address
     *
     * @param  {String} address
     *
     * @return {Promise<Array>}
     */
    removeLocations(address) {
        let { database } = this.state;
        let db = database.use({ by: this });
        return ProjectLinkFinder.findLinksToServer(db, address).then((links) => {
            return db.remove({ schema: 'local', table: 'project_link' }, links);
        });
    }

    /**
     * Remove links that to projects that no longer exist
     *
     * @param  {String} address
     *
     * @return {Promise<Array>}
     */
    removeDefunctLocations(address) {
        let { database } = this.state;
        let db = database.use({ by: this });
        return ProjectLinkFinder.findDefunctLinks(db).then((links) => {
            return db.remove({ schema: 'local', table: 'project_link' }, links);
        });
    }

    /**
     * Called when the database queries might yield new results
     *
     * @param  {RemoteDataSourceEvent} evt
     */
    handleDatabaseChange = (evt) => {
        let { route } = this.state;
        let { address, schema } = route.context;
        let database = new Database(evt.target, { address, schema });
        this.setState({ database });
    }

    /**
     * Called when a request to remote server starts
     *
     * @param  {RemoteDataSourceEvent} evt
     */
    handleRequestStart = (evt) => {
        let { makingRequests } = this.state;
        if (!makingRequests) {
            this.setState({ makingRequests: true });
        }
    }

    /**
     * Called when a request to remote server finishes
     *
     * @param  {RemoteDataSourceEvent} evt
     */
    handleRequestEnd = (evt) => {
        // use a timeout function to reduce the number of toggles
        setTimeout(() => {
            let { makingRequests } = this.state;
            if (makingRequests) {
                let { requestCount } = evt.target;
                if (requestCount === 0) {
                    this.setState({ makingRequests: false });
                }
            }
        }, 300);
    }

    /**
     * Called when upload payloads changes
     *
     * @param  {PayloadManagerEvent} evt
     */
    handlePayloadsChange = (evt) => {
        let { route, showingUploadProgress } = this.state;
        let { address, schema } = route.context;
        let payloads = new Payloads(evt.target, { address, schema });
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
        let { envMonitor, localeManager, routeManager, codePush } = this.props;
        let { address } = routeManager.context;
        let locale = new Locale(localeManager);
        let extra = { locale, address, widthDefinitions, codePush };
        let env = new Environment(envMonitor, extra);
        this.setState({ env });
        document.title = locale.t('app-name');
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
        let extra = { locale, address, widthDefinitions, codePush };
        let env = new Environment(envMonitor, extra);
        this.setState({ env });
    }

    /**
     * Called when CodePush has changed
     *
     * @param  {CodePushEvent} evt
     */
    handleCodePushChange = (evt) => {
        this.handleEnvironmentChange();
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
        let { routeManager, dataSource, envMonitor, payloadManager, codePush } = this.props;
        let { database, payloads, env, route: prevRoute } = this.state;
        let route = new Route(routeManager);
        let { address, schema } = route.context;
        if (address !== database.context.address || schema !== database.context.schema) {
            // change database and payloads the server address changes
            database = new Database(dataSource, { address, schema });
            payloads = new Payloads(payloadManager, { address, schema });
        }
        if (address !== env.address) {
            let locale = env.locale;
            let extra = { locale, address, widthDefinitions, codePush };
            env = new Environment(envMonitor, extra);
        }
        let transitionOut = false;
        let PreviousPage = getRouteClass(prevRoute);
        if (PreviousPage && PreviousPage.useTransition) {
            if (prevRoute.params.key !== route.params.key) {
                transitionOut = true;
            }
        }
        if (!transitionOut) {
            // don't retain the previous route when there's no transition effect
            prevRoute = null;
        }
        this.setState({ route, prevRoute, database, env });
    }

    /**
     * Called when user clicks on alert message
     *
     * @param  {Object} evt
     */
    handleAlertClick = (evt) => {
        let { database } = this.props;
        let alert = evt.alert;
        // create an object take has some of Notification's properties
        let notification = {
            id: alert.notification_id,
            type: alert.type,
            user_id: alert.user_id,
            reaction_id: alert.reaction_id,
            story_id: alert.story_id,
        };
        let url = NotificationView.getNotificationURL(notification, this.state.route);
        let target = NotificationView.getNotificationTarget(notification);
        if (target) {
            // create a link and click it to open a new tab
            let a = document.createElement('A');
            a.href = url;
            a.target = target;
            a.click();
        } else {
            // handle it internally
            this.state.route.change(url);
            window.focus();
        }

        // mark as read
        let db = database.use({ by: this });
        db.start().then((userId) => {
            let columns = {
                id: alert.notification_id,
                seen: true
            };
            return db.saveOne({ table: 'notification' }, columns);
        });
    }

    /**
     * Called when page transition is done
     *
     * @param  {Objet} evt
     */
    handlePageTransitionOut = (evt) => {
        this.setState({ prevRoute: null });
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

function getRouteClass(route) {
    if (!route) {
        return null;
    }
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
    return module.default;
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

// pull in all widgets for the same reason
require.context('widgets', true);

// pull in shims
require.context('shims', true);

import EnvironmentMonitor from 'env/environment-monitor';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'data/remote-data-source';
import PayloadManager from 'transport/payload-manager';
import LocaleManager from 'locale/locale-manager';
import Notifier from 'transport/notifier';
import CodePush from 'transport/code-push';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Application.propTypes = {
        envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
        dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
        localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
        payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
        notifier: PropTypes.instanceOf(Notifier),
        codePush: PropTypes.instanceOf(CodePush),
    };
}
