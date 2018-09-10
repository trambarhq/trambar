import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'react';
import createClass from 'relaks/create-class';
Relaks.createClass = createClass;

import ComponentRefs from 'utils/component-refs';
import HTTPError from 'errors/http-error';

import { routes } from 'routing';

// proxy objects
import Database from 'data/database';
import Route from 'routing/route';
import Payloads from 'transport/payloads';
import Environment from 'env/environment';

import SignInPage from 'pages/sign-in-page';
import ErrorPage from 'pages/error-page';

// widgets
import SideNavigation from 'widgets/side-navigation';
import TaskAlertBar from 'widgets/task-alert-bar';
import UploadProgress from 'widgets/upload-progress';

import 'setimmediate';
import 'utils/lodash-extra';
import 'application.scss';
import 'colors.scss';
import 'font-awesome-webpack';

class Application extends PureComponent {
    static displayName = 'Application';
    static coreConfiguration = {
        basePath: '/admin',
        area: 'admin',
        discoveryFlags: {
            include_deleted: true,
        },
        retrievalFlags: {
            include_ctime: true,
            include_mtime: true,
        },
        routes,
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
        let { schema } = routeManager.params;
        this.state = {
            database: new Database(dataSource, { address, schema }),
            payloads: new Payloads(payloadManager),
            route: new Route(routeManager),
            env: new Environment(envMonitor, localeManager),

            showingSignInPage: false,
            showingErrorPage: false,
            showingUploadProgress: false,
        };
    }

    /**
     * Render user interface
     *
     * @return {ReactElement|null}
     */
    render() {
        let { database, route, env } = this.state;
        let navProps = { database, route, env };
        return (
            <div className="application" id="application">
                <SideNavigation {...navProps} />
                <section className="page-view-port">
                    <div className="scroll-box">
                        {this.renderCurrentPage()}
                    </div>
                    {this.renderTaskAlert()}
                    {this.renderUploadProgress()}
                </section>
            </div>
        );
    }

    /**
     * Render the current page, as indicated by the route--or the login page
     * if the server isn't accessible yet
     *
     * @return {ReactElement}
     */
    renderCurrentPage () {
        let { database, route, env, payloads } = this.state;
        let { module } = route.params;
        let CurrentPage = module.default;
        let pageProps = { database, route, env, payloads };
        if (showingErrorPage) {
            CurrentPage = ErrorPage;
        } else if (showingSignInPage) {
            CurrentPage = SignInPage;
        }
        return <CurrentPage {...pageProps} />;
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
        dataSource.addEventListener('authenication', this.handleAuthentication);
        dataSource.addEventListener('authorization', this.handleAuthorization);
        routeManager.addEventListener('change', this.handleRouteChange);
        payloadManager.addEventListener('change', this.handlePayloadsChange);
        envMonitor.addEventListener('change', this.handleEnvironmentChange);
        localeManager.addEventListener('change', this.handleLocaleChange);

        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * Called when the database queries might yield new results
     *
     * @param  {Object} evt
     */
    handleDatabaseChange = (evt) => {
        let { route } = this.state;
        let context = {
            address: route.context.address,
            schema: route.params.schema,
        };
        let database = new Database(evt.target, context);
        this.setState({ database });
    }

    /**
     * Called when sign-in is necessary
     *
     * @param  {Object} evt
     */
    handleAuthentication = (evt) => {
        this.setState({ authenticating: true });
    }

    handleAuthorization = (evt) => {
        this.setState({ authenticating: false });
    }

    /**
     * Called if a data query fails to yield the required object
     *
     * @param  {Object} evt
     */
    handleStupefaction = (evt) => {
        this.setState({ showingErrorPage: true });
    }

    /**
     * Called when upload payloads changes
     *
     * @param  {Object} evt
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
     * @param  {Object} evt
     */
    handleLocaleChange = (evt) => {
        let { envMonitor, localeManager } = this.props;
        let env = new Environment(envMonitor, localeManager);
        this.setState({ env });
        document.title = env.locale.translate('app-title');
    }

    /**
     * Called when the locale changes
     *
     * @param  {Object} evt
     */
    handleEnvironmentChange = (evt) => {
        let { envMonitor, localeManager } = this.props;
        let env = new Environment(envMonitor, localeManager);
        this.setState({ env });
    }

    /**
     * Called when the route changes
     *
     * @param  {Object} evt
     */
    handleRouteChange = (evt) => {
        let { routeManager, dataSource } = this.props;
        let route = new Route(routeManager);
        let address = route.context.address;
        let schema = route.params.schema;
        let { database } = this.state;
        if (address != database.context.address) {
            database = new Database(dataSource, { address, schema });
        }
        this.setState({ route, database, showingErrorPage: false });
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
    Application
};

import EnvironmentMonitor from 'env/environment-monitor';
import RouteManager from 'relaks-route-manager';
import RemoteDataSource from 'data/remote-data-source';
import PayloadManager from 'transport/payload-manager';
import LocaleManager from 'locale/locale-manager';
import WebsocketNotifier from 'transport/websocket-notifier';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Application.propTypes = {
        envMonitor: PropTypes.instanceOf(EnvironmentMonitor).isRequired,
        dataSource: PropTypes.instanceOf(RemoteDataSource).isRequired,
        localeManager: PropTypes.instanceOf(LocaleManager).isRequired,
        payloadManager: PropTypes.instanceOf(PayloadManager).isRequired,
        //notifier: PropTypes.instanceOf(Notifier),
    };
}
