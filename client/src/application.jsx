import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import AppCore from 'app-core';
import { routes } from 'routing';
import CORSRewriter from 'routing/cors-rewriter';
import SchemaRewriter from 'routing/schema-rewriter';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectLinkFinder from 'objects/finders/project-link-finder';

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
        let { address, schema } = routeManager.context;
        let locale = new Locale(localeManager);
        this.state = {
            database: new Database(dataSource, { address, schema }),
            payloads: new Payloads(payloadManager, { address, schema }),
            route: new Route(routeManager),
            env: new Environment(envMonitor, { locale, address, widthDefinitions }),

            showingUploadProgress: false,
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
        if (!this.state.theme.touch) {
            className += ' no-touch';
        }
        */
        return className;
    }

    /**
     * Render the application
     *
     * @return {ReactElement}
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
        let settings = route.params.ui;
        let topNavProps = {
            searching: false, // TODO
            settings,
            database,
            route,
            payloads,
            env,
        };
        let bottomNavProps = {
            settings,
            database,
            route,
            env,
        };
        let pageProps = _.assign({
            database,
            route,
            payloads,
            env,
        }, route.params);
        let className = this.getClassName();
        let key = route.path + route.search;
        return (
            <div className={className} id="application">
                <TopNavigation {...topNavProps} />
                <section className="page-view-port">
                    <ErrorBoundary env={env}>
                        <CurrentPage key={key} {...pageProps} />
                    </ErrorBoundary>
                </section>
                <BottomNavigation {...bottomNavProps} />
                {this.renderUploadProgress()}
            </div>
        );
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
            return db.remove({ schema: 'local', table: 'project_link' }, defunct);
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
        let { envMonitor, localeManager, routeManager } = this.props;
        let { address } = routeManager.context;
        let locale = new Locale(localeManager);
        let env = new Environment(envMonitor, { locale, address, widthDefinitions });
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
        let { route: prevRoute } = this.state;
        let route = new Route(routeManager);
        let { address, schema } = route.context;
        let { database, payloads, env } = this.state;
        if (address !== database.context.address || schema !== database.context.schema) {
            // change database and payloads the server address changes
            database = new Database(dataSource, { address, schema });
            payloads = new Payloads(payloadManager, { address, schema });
        }
        if (address !== env.address) {
            env = new Environment(envMonitor, { locale, address, widthDefinitions });
        }
        this.setState({ route, database, env });

        let { address: prevAddress, schema: prevSchema } = (prevRoute) ? prevRoute.context : {};
        if (prevAddress !== address || prevSchema !== schema) {
            this.saveLocation(address, schema);
        }
        if (prevAddress !== address) {
            this.removeDefunctLocations();
        }
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

// pull in all widgets for the same reason
require.context('widgets', true);

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
