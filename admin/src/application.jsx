var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');
var CorsRewriter = require('routing/cors-rewriter');

// non-visual components
var RemoteDataSource = require('data/remote-data-source');
var Database = require('data/database');
var RouteManager = require('routing/route-manager');
var Route = require('routing/route');
var PayloadManager = require('transport/payload-manager');
var Payloads = require('transport/payloads');
var LocaleManager = require('locale/locale-manager');
var Locale = require('locale/locale');
var ThemeManager = require('theme/theme-manager');
var Theme = require('theme/theme');

// pages
var ProjectListPage = require('pages/project-list-page');
var ProjectSummaryPage = require('pages/project-summary-page');
var MemberListPage = require('pages/member-list-page');
var RoleListPage = require('pages/role-list-page');
var RolePage = require('pages/role-summary-page');
var RepoListPage = require('pages/repo-list-page');
var RepoSummaryPage = require('pages/repo-summary-page');
var ServerListPage = require('pages/server-list-page');
var ServerSummaryPage = require('pages/server-summary-page');
var SettingsPage = require('pages/settings-page');
var StartPage = require('pages/start-page');
var UserListPage = require('pages/user-list-page');
var UserSummaryPage = require('pages/user-summary-page');

var SignInPage = require('pages/sign-in-page');
var ErrorPage  = require('pages/error-page');

// widgets
var SideNavigation = require('widgets/side-navigation');
var TaskAlertBar = require('widgets/task-alert-bar');
var UploadProgress = require('widgets/upload-progress');

// cache
var IndexedDBCache = require('data/indexed-db-cache');
var LocalStorageCache = require('data/local-storage-cache');
var LocalCache;
if (IndexedDBCache.isAvailable()) {
    LocalCache = IndexedDBCache;
} else if (LocalStorageCache.isAvailable()) {
    LocalCache = LocalStorageCache;
}

// notifier
var WebsocketNotifier = require('transport/websocket-notifier');

var pageClasses = [
    ProjectListPage,
    ProjectSummaryPage,
    MemberListPage,
    RoleListPage,
    RolePage,
    RepoListPage,
    RepoSummaryPage,
    ServerListPage,
    ServerSummaryPage,
    SettingsPage,
    StartPage,
    UserListPage,
    UserSummaryPage,
    ErrorPage,
];

require('setimmediate');
require('utils/lodash-extra');
require('application.scss');
require('font-awesome-webpack');

module.exports = React.createClass({
    displayName: 'Application',

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            remoteDataSource: RemoteDataSource,
            routeManager: RouteManager,
            localeManager: LocaleManager,
            themeManager: ThemeManager,
            payloadManager: PayloadManager,
            cache: LocalCache,
            notifier: WebsocketNotifier,
        });
        return {
            database: null,
            payloads: null,
            route: null,
            locale: null,
            theme: null,

            canAccessServer: false,
            subscriptionId: null,
            connectionId: null,
            showingUploadProgress: false,
        };
    },

    /**
     * Return true once all plumbings are ready
     *
     * @return {Boolean}
     */
    isReady: function() {
        return !!this.state.database
            && !!this.state.payloads
            && !!this.state.route
            && !!this.state.locale
            && !!this.state.theme;
    },

    /**
     * Render the application
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div onClick={this.handleClick}>
                {this.renderUserInterface()}
                {this.renderConfiguration()}
            </div>
        );
    },

    /**
     * Render user interface
     *
     * @return {ReactElement|null}
     */
    renderUserInterface: function() {
        if (!this.isReady()) {
            return null;
        }
        var navProps = {
            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
            disabled: !this.state.canAccessServer,
        };
        return (
            <div className="application">
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
    },

    /**
     * Render the current page, as indicated by the route--or the login page
     * if the server isn't accessible yet
     *
     * @return {ReactElement}
     */
    renderCurrentPage: function() {
        var CurrentPage = this.state.route.component;
        var pageProps = {
            database: this.state.database,
            route: this.state.route,
            payloads: this.state.payloads,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        if (!this.state.canAccessServer) {
            if (CurrentPage !== ErrorPage) {
                CurrentPage = SignInPage;
            }
        }
        return <CurrentPage {...pageProps} />;
    },

    /**
     * Render alert message in pop-up bar at bottom of page
     *
     * @return {[type]}
     */
    renderTaskAlert: function() {
        var props = {
            database: this.state.database,
            route: this.state.route,
            payloads: this.state.payloads,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        return <TaskAlertBar {...props} />;
    },

    /**
     * Render non-visual components
     *
     * @return {ReactElement}
     */
    renderConfiguration: function() {
        var setters = this.components.setters;
        var route = this.state.route;
        var serverAddress = (route) ? route.parameters.address : null;
        var remoteDataSourceProps = {
            ref: setters.remoteDataSource,
            basePath: '/admin',
            retrievalFlags: {
                include_ctime: true,
                include_mtime: true,
            },
            discoveryFlags: {
                include_deleted: true,
            },
            onChange: this.handleDatabaseChange,
            onAuthorization: this.handleAuthorization,
            onExpiration: this.handleExpiration,
            onStupefaction: this.handleStupefaction,
        };
        var payloadManagerProps = {
            ref: setters.payloadManager,
            database: this.state.database,
            route: this.state.route,
            onChange: this.handlePayloadsChange,
        };
        var routeManagerProps = {
            ref: setters.routeManager,
            pages: pageClasses,
            database: this.state.database,
            rewrite: this.rewriteUrl,
            onChange: this.handleRouteChange,
            onRedirectionRequest: this.handleRedirectionRequest,
        };
        var localeManagerProps = {
            ref: setters.localeManager,
            database: this.state.database,
            directory: require('locales'),
            onChange: this.handleLocaleChange,
            onModuleRequest: this.handleLanguageModuleRequest,
        };
        var themeManagerProps = {
            ref: setters.themeManager,
            database: this.state.database,
            modes: {
                'ultra-narrow': 0,
                'narrow': 700,
                'standard': 1000,
                'wide': 1400,
                'ultra-wide': 1700,
            },
            serverAddress: serverAddress,
            onChange: this.handleThemeChange,
        };
        var cacheProps = {
            ref: setters.cache,
            databaseName: 'trambar-admin',
        };
        var notifierProps = {
            ref: setters.notifier,
            serverAddress: serverAddress,
            locale: this.state.locale,
            onNotify: this.handleChangeNotification,
            onConnect: this.handleConnection,
            onDisconnect: this.handleDisconnection,
        };
        return (
            <div>
                <LocalCache {...cacheProps} />
                <WebsocketNotifier {...notifierProps} />
                <RemoteDataSource {...remoteDataSourceProps} cache={this.components.cache} />
                <PayloadManager {...payloadManagerProps} />
                <RouteManager {...routeManagerProps} />
                <LocaleManager {...localeManagerProps} />
                <ThemeManager {...themeManagerProps} />
            </div>
        );
    },

    /**
     * Render upload progress pop-up if it's activated
     *
     * @return {ReactElement|null}
     */
    renderUploadProgress: function() {
        if (!this.state.showingUploadProgress) {
            return null;
        }
        var props = {
            payloads: this.state.payloads,
            locale: this.state.locale,
        };
        return <UploadProgress {...props} />;
    },

    /**
     * Attach beforeUnload event handler
     */
    componentDidMount: function() {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    },

    /**
     * Check state variables after update
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!this.state.subscriptionId) {
            if (this.state.canAccessServer && this.state.connectionId) {
                this.createSubscription();
            }
        } else {
            if (this.state.locale !== prevState.locale) {
                this.updateSubscription();
            }
        }

        // Hide the splash screen once app is ready
        if (!this.splashScreenHidden && this.isReady()) {
            this.splashScreenHidden = true;
            setTimeout(() => {
                this.hideSplashScreen();
            }, 100);
        }
    },

    /**
     * Remove beforeUnload event handler
     */
    componentWillUnmount: function() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    },

    /**
     * Create a subscription to data monitoring service
     */
    createSubscription: function() {
        if (this.creatingSubscription) {
            return;
        }
        this.creatingSubscription = true;

        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            var subscription = {
                user_id: userId,
                address: 'websocket',
                token: this.state.connectionId,
                schema: '*',
                area: 'admin',
                locale: this.state.locale.languageCode,
                details: {
                    user_agent: navigator.userAgent
                }
            };
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscriptionId: subscription.id })
            });
        }).finally(() => {
            this.creatingSubscription = false;
        });
    },

    /**
     * Update subscription
     */
    updateSubscription: function() {
        if (this.updatingSubscription) {
            return;
        }
        this.updatingSubscription = true;

        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            var subscription = {
                id: this.state.subscriptionId,
                locale: this.state.locale.languageCode,
            };
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscriptionId: subscription.id })
            });
        }).finally(() => {
            this.updatingSubscription = false;
        });
    },

    /**
     * Load user credentials (authorization token, user_id, etc.) from local cache
     *
     * @param  {String} address
     *
     * @return {Promise<Object|null>}
     */
    loadCredentialsFromCache: function(address) {
        var db = this.state.database.use({ schema: 'local', by: this });
        var criteria = { address };
        return db.findOne({ table: 'user_credentials', criteria });
    },

    /**
     * Save user credentials to local cache
     *
     * @param  {String} address
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    saveCredentialsToCache: function(address, credentials) {
        // save the credentials
        var db = this.state.database.use({ schema: 'local', by: this });
        var record = _.extend({
            key: address,
        }, credentials);
        return db.saveOne({ table: 'user_credentials' }, record);
    },

    /**
     * Remove user credentials from local cache
     *
     * @param  {String} address
     *
     * @return {Promise<Object>}
     */
    removeCredentialsFromCache: function(address) {
        // save the credentials
        var db = this.state.database.use({ schema: 'local', by: this });
        var record = { key: address };
        return db.removeOne({ table: 'user_credentials' }, record);
    },

    /**
     * Rewrite the URL that, either extracting the server address or inserting it
     *
     * @param  {Object} urlParts
     * @param  {Object} params
     * @param  {String} op
     */
    rewriteUrl: function(urlParts, params, op) {
        if (op === 'parse') {
            CorsRewriter.extract(urlParts, params);
        } else {
            if (this.state.route) {
                params = _.defaults(params, this.state.route.parameters);
            }
            CorsRewriter.insert(urlParts, params);
        }
    },

    /**
     * Called when the database queries might yield new results
     *
     * @param  {Object} evt
     */
    handleDatabaseChange: function(evt) {
        var context;
        if (this.state.route) {
            context = {
                address: this.state.route.parameters.address,
                schema: this.state.route.parameters.schema,
            };
        }
        var database = new Database(evt.target, context);
        this.setState({ database });
    },

    /**
     * Called when sign-in was successful
     *
     * @param  {Object} evt
     */
    handleAuthorization: function(evt) {
        this.saveCredentialsToCache(evt.address, evt.credentials);
        var address = this.state.route.parameters.address;
        if (evt.address === address) {
            this.setState({
                canAccessServer: true
            });
        }
    },

    /**
     * Called if user credentials aren't valid anymore
     *
     * @param  {Object} evt
     */
    handleExpiration: function(evt) {
        this.removeCredentialsFromCache(evt.address);
        var address = this.state.route.parameters.address;
        if (evt.address === address) {
            this.setState({
                canAccessServer: false
            });
        }
    },

    /**
     * Called if a data query fails to yield the required object
     *
     * @param  {Object} evt
     */
    handleStupefaction: function(evt) {
        var route = this.state.route;
        route.replace(require('pages/error-page'), { code: 404 });
    },

    /**
     * Called when upload payloads changes
     *
     * @param  {Object} evt
     */
    handlePayloadsChange: function(evt) {
        var payloads = new Payloads(evt.target);
        var showingUploadProgress = this.state.showingUploadProgress;
        if (!payloads.uploading) {
            // stop showing it once it's done
            showingUploadProgress = false;
        }
        this.setState({ payloads, showingUploadProgress });
    },

    /**
     * Called when the locale changes
     *
     * @param  {Object} evt
     */
    handleLocaleChange: function(evt) {
        var locale = new Locale(evt.target);
        this.setState({ locale });
        document.title = locale.translate('app-title');
    },

    /**
     * Called when LocaleManager needs a language module
     *
     * @param  {Object} evt
     *
     * @return {Promise<Module>}
     */
    handleLanguageModuleRequest: function(evt) {
        var languageCode = evt.languageCode.substr(0, 2);
        return new Promise((resolve, reject) => {
            // list the modules here so Webpack can code-split them
            //
            // require.ensure() will become a "new Promise(...)" statement
            // use native Promise instead of Bluebird to avoid warning of
            // null getting passed to then()
            var Promise = window.Promise || require('bluebird');
            switch (languageCode) {
                case 'en': require.ensure([ './locales/en' ], () => { try { resolve(require('./locales/en')) } catch(err) { reject(err) } }); break;
                case 'fi': require.ensure([ './locales/fi' ], () => { try { resolve(require('./locales/fi')) } catch(err) { reject(err) } }); break;
                case 'nb': require.ensure([ './locales/nb' ], () => { try { resolve(require('./locales/nb')) } catch(err) { reject(err) } }); break;
                case 'pl': require.ensure([ './locales/pl' ], () => { try { resolve(require('./locales/pl')) } catch(err) { reject(err) } }); break;
                case 'ru': require.ensure([ './locales/ru' ], () => { try { resolve(require('./locales/ru')) } catch(err) { reject(err) } }); break;
                case 'zh': require.ensure([ './locales/zh' ], () => { try { resolve(require('./locales/zh')) } catch(err) { reject(err) } }); break;
                default: reject(new Error('No module for language: ' + languageCode));
            }
        });
    },

    /**
     * Called when the route changes
     *
     * @param  {Object} evt
     */
    handleRouteChange: function(evt) {
        var route = new Route(evt.target);
        var address = route.parameters.address;
        var database = this.state.database;
        if (address != this.state.database.context.address) {
            var dataSource = this.components.remoteDataSource;
            database = new Database(dataSource, { address })
        }
        if (database.hasAuthorization()) {
            // route is accessible
            this.setState({
                route,
                database,
                canAccessServer: true,
            });
        } else {
            // see if user credentials are stored locally
            this.loadCredentialsFromCache(address).then((authorization) => {
                if (authorization) {
                    database.addAuthorization(authorization);
                }
                if (database.hasAuthorization()) {
                    // route is now accessible
                    this.setState({
                        route,
                        database,
                        canAccessServer: true,
                    });
                } else {
                    // show login page
                    this.setState({
                        route,
                        database,
                        canAccessServer: false,
                    });
                }
            });
        }
    },

    /**
     * Called when RouteManager fails to find a route
     *
     * @param  {Object} evt
     *
     * @return {Promise<String>}
     */
    handleRedirectionRequest: function(evt) {
        var routeManager = evt.target;
        var url = routeManager.find(ErrorPage, { code: 404 });
        return Promise.resolve(url);
    },

    /**
     * Called when users clicks on an element anywhere on the page
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        // trap clicks on hyperlinks
        var target = evt.target;
        while (target && target.tagName !== 'A') {
            target = target.parentNode;
        }
        if (target) {
            var url = target.getAttribute('href');
            if (url && url.indexOf(':') === -1) {
                // relative links are handled by RouteManager
                this.state.route.change(url);
                evt.preventDefault();
            }
        }
    },

    /**
     * Called when the UI theme changes
     *
     * @param  {Object} evt
     */
    handleThemeChange: function(evt) {
        var theme = new Theme(evt.target);
        this.setState({ theme });
    },

    /**
     * Called when notifier has made a connection
     *
     * @param  {Object} evt
     */
    handleConnection: function(evt) {
        this.setState({ connectionId: evt.token });
    },

    /**
     * Called when notifier reports a lost of connection
     *
     * @param  {Object} evt
     */
    handleDisconnection: function(evt) {
        this.setState({ connectionId: null });
    },

    /**
     * Called upon the arrival of a notification message, delivered through
     * websocket or push
     *
     * @param  {Object} evt
     */
    handleChangeNotification: function(evt) {
        var dataSource = this.components.remoteDataSource;
        dataSource.invalidate(evt.address, evt.changes);

        _.forIn(evt.changes, (idList, name) => {
             console.log('Change notification: ', name, idList);
        });
    },

    /**
     * Called when user navigate to another site or hit refresh
     *
     * @param  {Event} evt
     */
    handleBeforeUnload: function(evt) {
        if (this.state.payloads && this.state.payloads.uploading) {
            // Chrome will repaint only after the modal dialog is dismissed
            this.setState({ showingUploadProgress: true });
            return (evt.returnValue = 'Are you sure?');
        }
    },

    /**
     * Fade out and then remove splash screen
     */
    hideSplashScreen: function() {
        var screen = document.getElementById('splash-screen');
        var style = document.getElementById('splash-screen-style');
        if (screen) {
            screen.className = 'transition-out';
            setTimeout(() => {
                if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }
                if (style && style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 1000);
        }
    }
});
