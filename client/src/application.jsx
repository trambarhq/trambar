var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');
var HTTPError = require('errors/http-error');
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
var StartPage = require('pages/start-page');
var NewsPage = require('pages/news-page');
var PeoplePage = require('pages/people-page');
var PersonPage = require('pages/person-page');
var NotificationsPage = require('pages/notifications-page');
var BookmarksPage = require('pages/bookmarks-page');
var SettingsPage = require('pages/settings-page');
var ErrorPage = require('pages/error-page');

// widgets
var TopNavigation = require('widgets/top-navigation');
var BottomNavigation = require('widgets/bottom-navigation');
var UploadProgress = require('widgets/upload-progress');
var NotificationView = require('views/notification-view');

// cache
var IndexedDBCache = require('data/indexed-db-cache');
var SQLiteCache = require('data/sqlite-cache');
var LocalStorageCache = require('data/local-storage-cache');
var LocalCache;
if (IndexedDBCache.isAvailable()) {
    LocalCache = IndexedDBCache;
} else if (SQLiteCache.isAvailable()) {
    LocalCache = SQLiteCache;
} else if (LocalStorageCache.isAvailable()) {
    LocalCache = LocalStorageCache;
}

// notifier
var WebsocketNotifier = (process.env.PLATFORM === 'browser') ? require('transport/websocket-notifier') : null;
var PushNotifier = (process.env.PLATFORM === 'cordova') ? require('transport/push-notifier') : null;
var Notifier = WebsocketNotifier || PushNotifier;

var pageClasses = [
    StartPage,
    NewsPage,
    PeoplePage,
    PersonPage,
    NotificationsPage,
    BookmarksPage,
    SettingsPage,
    ErrorPage,
];

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
            notifier: Notifier,
        });
        return {
            database: null,
            payloads: null,
            route: null,
            locale: null,
            theme: null,

            canAccessServer: false,
            canAccessSchema: false,
            subscription: null,
            connection: null,
            searching: false,
            pushRelay: null,
            renderingStartPage: false,
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
     * Return true if the start page should be shown
     *
     * @return {Boolean}
     */
    isShowingStartPage: function() {
        if (this.state.route.component === StartPage) {
            return true;
        }
        if (this.state.route.component === ErrorPage) {
            return false;
        }
        if (!this.state.canAccessServer || !this.state.canAccessSchema) {
            return true;
        }
        return false;
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
        var settings = this.state.route.component.configureUI(this.state.route);
        var topNavProps = {
            settings: settings,
            database: this.state.database,
            payloads: this.state.payloads,
            hasConnection: true,
            searching: this.state.searching,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        var bottomNavProps = {
            settings: settings,
            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        if (this.isShowingStartPage()) {
            // keep the navs hidden when the start page is shown
            _.set(settings, 'navigation.top', false);
            _.set(settings, 'navigation.bottom', false);
        }
        var className = `application ${this.state.theme.mode}`;
        return (
            <div className={className}>
                <TopNavigation {...topNavProps} />
                <section className="page-view-port" id="page-view-port">
                    <div className="scroll-box" id="scroll-box">
                        <div className="contents">
                            {this.renderCurrentPage()}
                        </div>
                    </div>
                </section>
                <BottomNavigation {...bottomNavProps} />
                {this.renderStartPage()}
                {this.renderUploadProgress()}
            </div>
        );
    },


    /**
     * Render the current page as indicated by the route, unless it's the
     * start page
     *
     * @return {ReactElement|null}
     */
    renderCurrentPage: function() {
        var CurrentPage = this.state.route.component;
        if (this.isShowingStartPage()) {
            // page will be rendered by renderStartPage()
            return null;
        }
        var pageProps = {
            database: this.state.database,
            route: this.state.route,
            payloads: this.state.payloads,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        return <CurrentPage {...pageProps} />
    },

    /**
     * Render the start page. The start page is different from the other pages
     * because it takes up the whole screen. It can also overlay another page
     * during transition.
     *
     * @return {ReactElement}
     */
    renderStartPage: function() {
        if (!this.isShowingStartPage()) {
            // see if we still need to render the page during transition
            if (!this.state.renderingStartPage) {
                return null;
            }
        }
        var pageProps = {
            canAccessServer: this.state.canAccessServer,
            canAccessSchema: this.state.canAccessSchema,

            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,

            onEntry: this.handleStartPageEntry,
            onExit: this.handleStartPageExit,
            onAvailableSchemas: this.handleAvailableSchemas,
        };
        return <StartPage {...pageProps} />
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
            locale: this.state.locale,

            onChange: this.handleDatabaseChange,
            onSearch: this.handleDatabaseSearch,
            onAuthorization: this.handleAuthorization,
            onExpiration: this.handleExpiration,
            onViolation: this.handleViolation,
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
            rewrite: this.rewriteURL,
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
                'single-col': 0,
                'double-col': 700,
                'triple-col': 1300,
            },
            serverAddress: serverAddress,
            onChange: this.handleThemeChange,
        };
        var cacheProps = {
            ref: setters.cache,
            databaseName: 'trambar',
        };
        var notifierProps = {
            ref: setters.notifier,
            serverAddress: serverAddress,
            onConnect: this.handleConnection,
            onDisconnect: this.handleDisconnection,
            onNotify: this.handleChangeNotification,
            onAlertClick: this.handleAlertClick,
        };
        if (Notifier === WebsocketNotifier) {
            _.assign(notifierProps, {
                locale: this.state.locale,
                defaultProfileImage: require('profile-image-placeholder.png'),
            })
        } else if (Notifier === PushNotifier) {
            if (typeof(this.state.pushRelay) === 'string') {
                _.assign(notifierProps, {
                    relayAddress: this.state.pushRelay
                });
            }
        }
        return (
            <div>
                <LocalCache {...cacheProps} />
                <Notifier {...notifierProps} />
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
        // hide the splash screen once app is ready
        if (!this.splashScreenHidden && this.isReady()) {
            this.splashScreenHidden = true;
            setTimeout(() => {
                this.hideSplashScreen();
            }, 100);
        }

        this.updateRecentSearchResults(prevState);
        this.updateProjectLink(prevState);
        this.updateSubscription(prevState);
    },

    /**
     * Remove beforeUnload event handler
     */
    componentWillUnmount: function() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    },

    /**
     * Clear recent search results when we siwtch to a different location
     *
     * @param  {Object} prevState
     */
    updateRecentSearchResults: function(prevState) {
        var needUpdate = false;
        if (prevState.route !== this.props.route) {
            needUpdate = true;
        }
        if (!needUpdate) {
            return;
        }

        if (!prevState.route) {
            return;
        }
        var locationBefore = _.pick(prevState.route.parameters, 'address', 'schema');
        var locationAfter = _.pick(this.state.route.parameters, 'address', 'schema');
        if (!_.isEqual(locationBefore, locationAfter)) {
            this.components.remoteDataSource.clear(locationBefore.address, locationBefore.schema);
        }
    },

    /**
     * Add project to list of visited projects
     *
     * @param  {Object} prevState
     */
    updateProjectLink: function(prevState) {
        var needUpdate = false;
        if (prevState.route !== this.state.route) {
            needUpdate = true;
        }
        if (!needUpdate) {
            return;
        }

        if (!this.state.route) {
            return;
        }
        var params = this.state.route.parameters;
        if (!params.address || !params.schema) {
            return;
        }
        if (!this.state.canAccessServer || !this.state.canAccessSchema) {
            return;
        }
        var projectKey = `${params.address}/${params.schema}`;
        if (this.lastProjectKey === projectKey) {
            // guard against repeated effort
            return;
        }
        this.lastProjectKey = projectKey;

        // get the project object so we have the project's display name
        var db = this.state.database.use({ by: this });
        var criteria = { name: params.schema };
        db.findOne({ schema: 'global', table: 'project', criteria }).then((project) => {
            if (!project) {
                return;
            }
            var now = new Date;
            var record = {
                key: projectKey,
                address: params.address,
                schema: params.schema,
                name: project.details.title,
                atime: now.toISOString(),
            };
            return db.saveOne({ schema: 'local', table: 'project_link' }, record);
        });
    },

    /**
     * Maintain a subscription to data change notification
     *
     * @param  {Object} prevState
     */
    updateSubscription: function(prevState) {
        // see if something changed that'd require a change in the subscription
        var needUpdate = false;
        if (prevState.route !== this.state.route) {
            if (this.state.route)
            needUpdate = true;
        } else if (prevState.locale !== this.state.locale) {
            needUpdate = true;
        } else if (prevState.connection !== this.state.connection) {
            needUpdate = true;
        } else if (prevState.pushRelay !== this.state.pushRelay) {
            needUpdate = true;
        } else if (prevState.canAccessServer !== this.state.canAccessServer) {
            needUpdate = true;
        }
        if (!needUpdate) {
            return;
        }

        // make sure we have everything
        if (!this.state.route) {
            return;
        }
        var params = this.state.route.parameters;
        if (!params.address) {
            return;
        }
        if (!this.state.canAccessServer) {
            return;
        }
        var connection = this.state.connection;
        var destination;
        if (Notifier === WebsocketNotifier) {
            if (!connection || params.address !== connection.address) {
                // don't have a websocket connection to the server yet
                return;
            }
            destination = 'websocket';
        }
        if (Notifier === PushNotifier) {
            if (!connection) {
                // registration hasn't occurred
                return;
            }
            var pushRelay = this.state.pushRelay;
            if (!pushRelay || params.address !== pushRelay.address) {
                // don't know yet the address of the push relay used by the server
                this.discoverPushRelay();
                return;
            }
            destination = this.state.pushRelay.url;
            if (!destination) {
                return;
            }
        }

        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            var schema;
            if (params.schema && this.state.canAccessSchema) {
                schema = params.schema;
            } else {
                // keep an eye on changes of global objects like projects
                schema = 'global';
            }
            var subscription = {
                user_id: userId,
                address: destination,
                token: connection.token,
                schema: schema,
                area: 'client',
                locale: this.state.locale.localeCode,
                details: {
                    user_agent: navigator.userAgent
                }
            };
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscription });
            });
        });
    },

    /**
     * Ask remote server for the push relay URL
     */
    discoverPushRelay: function() {
        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            return db.findOne({ table: 'system' }).then((system) => {
                var address = db.context.address;
                var url = _.get(system, 'settings.push_relay', '');
                this.setState({
                    pushRelay: { address, url }
                });
                return null;
            });
        });
    },

    /**
     * Load user credentials (authorization token, user_id, etc.) from local cache
     *
     * @param  {String} address
     *
     * @return {Promise<Object|null>}
     */
    loadSessionFromCache: function(address) {
        var db = this.state.database.use({ schema: 'local', by: this });
        var criteria = { key: address };
        return db.findOne({ table: 'session', criteria }).then((record) => {
            if (!record) {
                return null;
            }
            return {
                address: record.key,
                handle: record.handle,
                token: record.token,
                user_id: record.user_id,
                etime: record.etime,
            };
        });
    },

    /**
     * Save session handle, authorization token, and user id to local cache
     *
     * @param  {Object} session
     *
     * @return {Promise<Object>}
     */
    saveSessionToCache: function(session) {
        // save the credentials
        var db = this.state.database.use({ schema: 'local', by: this });
        var record = {
            key: session.address,
            handle: session.handle,
            token: session.token,
            user_id: session.user_id,
            etime: session.etime,
        };
        return db.saveOne({ table: 'session' }, record);
    },

    /**
     * Remove user credentials from local cache
     *
     * @param  {Object} session
     *
     * @return {Promise<Object>}
     */
    removeSessionFromCache: function(session) {
        // save the credentials
        var db = this.state.database.use({ schema: 'local', by: this });
        var record = { key: session.address };
        return db.removeOne({ table: 'session' }, record);
    },

    /**
     * Rewrite the URL that, either extracting the server address or inserting it
     *
     * @param  {Object} urlParts
     * @param  {Object} params
     * @param  {String} op
     */
    rewriteURL: function(urlParts, params, op) {
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
     * Called when RemoteDataSource starts or finish searching
     *
     * @param  {Object} evt
     */
    handleDatabaseSearch: function(evt) {
        this.setState({ searching: evt.searching });
    },

    /**
     * Called when sign-in was successful
     *
     * @param  {Object} evt
     */
    handleAuthorization: function(evt) {
        this.saveSessionToCache(evt.session);

        var address = this.state.route.parameters.address;
        if (evt.session.address === address) {
            // it's possible to access the server now
            // assume we can access the schema too
            this.setState({
                canAccessServer: true,
                canAccessSchema: true,
            });
        }
    },

    /**
     * Called if user credentials aren't valid anymore
     *
     * @param  {Object} evt
     */
    handleExpiration: function(evt) {
        this.removeSessionFromCache(evt.session);

        var address = this.state.route.parameters.address;
        if (evt.session.address === address) {
            this.setState({
                canAccessServer: false,
                canAccessSchema: false,
            });
        }
    },

    /**
     * Called if user tries to access something he has no access to
     *
     * @param  {Object} evt
     */
    handleViolation: function(evt) {
        var address = this.state.route.parameters.address;
        var schema = this.state.route.parameters.schema;
        if (evt.address === address && evt.schema === schema) {
            this.setState({
                canAccessSchema: false,
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
        var originalURL = route.url;
        var schema = route.parameters.schema;
        if (schema) {
            // if we failed to find the project itself, then the schema isn't
            // valid and the bottom nav bar shouldn't be shown
            if (evt.query.table === 'project') {
                if (evt.query.criteria.name === schema) {
                    schema = null;
                }
            }
        }
        var url = route.find(ErrorPage, { code: 404, schema });
        route.change(url, true, originalURL);
    },

    /**
     * Called when media payloads changes
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
        document.title = locale.translate('app-name');
    },

    /**
     * Called when LocaleManager needs a language module
     *
     * @param  {Object} evt
     *
     * @return {Promise<Module>}
     */
    handleLanguageModuleRequest: function(evt) {
        var languageCode = evt.languageCode;
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
        // add server location to database context so we don't need to
        // specify it everywhere
        var route = new Route(evt.target);
        var address = route.parameters.address;
        var database = this.state.database;
        if (address != this.state.database.context.address) {
            var dataSource = this.components.remoteDataSource;
            database = new Database(dataSource, { address })
        }

        // try to restore session prior to setting the route
        if (database.hasAuthorization()) {
            // route is already accessible
            this.setState({
                route,
                database,
                canAccessServer: true,
                canAccessSchema: true,
            });
        } else {
            // see if user credentials are stored locally
            this.loadSessionFromCache(address).then((session) => {
                if (session) {
                    database.restoreSession(session);
                }
                if (database.hasAuthorization(address)) {
                    // route is now accessible
                    this.setState({
                        route,
                        database,
                        canAccessServer: true,
                        canAccessSchema: true,
                    });
                } else {
                    // show start page, where user can log in or choose another project
                    this.setState({
                        route,
                        database,
                        canAccessServer: false,
                        canAccessSchema: false,
                    });
                }
            });
        }
    },

    /**
     * Called when StartPage finds project the current user has access to
     *
     * @param  {Object} evt
     */
    handleAvailableSchemas: function(evt) {
        var schema = this.state.route.parameters.schema;
        if (_.includes(evt.schemas, schema)) {
            this.setState({
                canAccessSchema: true,
            });
        }
    },

    /**
     * Called when StartPage mounts
     *
     * @param  {Object} evt
     */
    handleStartPageEntry: function(evt) {
        this.setState({ renderingStartPage: true });
    },

    /**
     * Called when StartPage has transitioned out
     *
     * @param  {Object} evt
     */
    handleStartPageExit: function(evt) {
        this.setState({ renderingStartPage: false });
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
        var originalURL = evt.url;
        var replacing = evt.replacing;
        if (process.env.PLATFORM === 'cordova') {
            if (originalURL === '/bootstrap') {
                // look for the most recently accessed project
                var db = this.state.database.use({ by: this });
                var criteria = {};
                return db.find({ schema: 'local', table: 'project_link', criteria }).then((links) => {
                    var mostRecent = _.last(_.sortBy(links, 'atime'));
                    var url;
                    if (mostRecent) {
                        url = routeManager.find(NewsPage, {
                            cors: true,
                            address: mostRecent.address,
                            schema: mostRecent.schema,
                        });
                    } else {
                        url = routeManager.find(StartPage, {});
                    }
                    return routeManager.change(url, replacing);
                });

            }
        }

        // show error page
        var url = routeManager.find(ErrorPage, { code: 404 });
        return routeManager.change(url, replacing, originalURL);
    },

    /**
     * Called when users clicks on an element anywhere on the page
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        if (evt.button === 0) {
            // trap clicks on hyperlinks
            var target = getAnchor(evt.target);
            if (target) {
                var url = target.getAttribute('href') || target.getAttribute('data-url');
                if (url && url.indexOf(':') === -1) {
                    // relative links are handled by RouteManager
                    this.state.route.change(url).then(() => {
                        // scroll back to the top when clicking on link with no hash
                        if (!this.state.route.hash) {
                            var scrollBoxNode = document.getElementById('scroll-box');
                            scrollBoxNode.scrollTop = 0;
                        }
                    });
                    evt.preventDefault();
                    // clear focus on change
                    target.blur();
                }
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
        this.setState({
            connection: {
                address: evt.address,
                token: evt.token
            },
        });
    },

    /**
     * Called when notifier reports a lost of connection
     *
     * @param  {Object} evt
     */
    handleDisconnection: function(evt) {
        this.setState({ connection: null });
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
     * Called when user clicks on alert message
     *
     * @param  {Object} evt
     */
    handleAlertClick: function(evt) {
        var alert = evt.alert;
        // create an object take has some of Notification's properties
        var notification = {
            id: alert.notification_id,
            type: alert.type,
            user_id: alert.user_id,
            reaction_id: alert.reaction_id,
            story_id: alert.story_id,
        };
        var url = NotificationView.getNotificationURL(notification, this.state.route);
        var target = NotificationView.getNotificationTarget(notification);
        if (target) {
            // create a link and click it to open a new tab
            var a = document.createElement('A');
            a.href = url;
            a.target = target;
            a.click();
        } else {
            // handle it internally
            this.state.route.change(url);
            window.focus();
        }

        // mark as read
        var params = this.state.route.parameters;
        var db = this.state.database.use({ schema: params.schema, by: this });
        db.start().then((userId) => {
            var columns = {
                id: alert.notification_id,
                seen: true
            };
            return db.saveOne({ table: 'notification' }, columns);
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
        if (process.env.PLATFORM === 'browser') {
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
        } else if (process.env.PLATFORM === 'cordova') {
            var splashScreen = navigator.splashscreen;
            if (splashScreen) {
                splashScreen.hide();
            }
        }
    }
});

function getAnchor(element) {
    while (element && element.tagName !== 'A') {
        element = element.parentNode;
    }
    return element;
}
