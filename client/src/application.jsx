var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');
var AnchorFinder = require('utils/anchor-finder');
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
            subscriptionId: null,
            connectionId: null,
            pushRelay: (Notifier == PushNotifier) ? null : undefined,
            renderingStartPage: false,
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
        var options = this.state.route.component.getOptions(this.state.route);
        var topNavProps = {
            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
            hidden: !_.get(options, 'navigation.top'),
        };
        var bottomNavProps = {
            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
            hidden: !_.get(options, 'navigation.bottom'),
        };
        if (this.isShowingStartPage()) {
            // keep the navs hidden when the start page is shown
            topNavProps.hidden = bottomNavProps.hidden = true;
        }
        return (
            <div className="application">
                <TopNavigation {...topNavProps} />
                <section className="page-view-port">
                    <div className="contents">
                        {this.renderCurrentPage()}
                    </div>
                </section>
                <BottomNavigation {...bottomNavProps} />
                {this.renderStartPage()}
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
            onAuthorization: this.handleAuthorization,
            onExpiration: this.handleExpiration,
            onViolation: this.handleViolation,
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
                'columns-1': 0,
                'columns-2': 700,
                'columns-3': 1300,
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
                locale: this.props.locale,
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
     * Check state variables after update
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!this.state.subscriptionId) {
            if (this.state.canAccessServer) {
                if (this.state.connectionId) {
                    this.createSubscription();
                } else {
                    if (Notifier === PushNotifier) {
                        // PushNotifier needs the address to the relay
                        if (this.state.pushRelay === null) {
                            this.discoverPushRelay();
                        }
                    }
                }
            }
        } else if (!(this.state.subscriptionId instanceof Error)) {
            var schemaBefore = prevState.route.parameters.schema || 'global';
            var schemaAfter = this.state.route.parameters.schema || 'global';
            if (schemaBefore !== schemaAfter && this.state.locale !== prevState.locale) {
                this.updateSubscription();
            }
        }

        // hide the splash screen once app is ready
        if (!this.splashScreenHidden && this.isReady()) {
            this.splashScreenHidden = true;
            setTimeout(() => {
                this.hideSplashScreen();
            }, 100);
        }

        // see if there's a change in the URL hash
        if (prevState.route !== this.state.route) {
            if (!prevState.route || prevState.route.url !== this.state.route.url) {
                // scroll to element with id matching hash
                AnchorFinder.scrollTo(this.state.route.hash);
            }
        }
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
            var address;
            if (Notifier === WebsocketNotifier) {
                address = 'websocket';
            } else if (Notifier === PushNotifier) {
                address = this.state.pushRelay;
            }
            var subscription = {
                user_id: userId,
                address: address,
                token: this.state.connectionId,
                schema: this.state.route.parameters.schema || 'global',
                area: 'client',
                locale: this.state.locale.languageCode,
                details: {
                    user_agent: navigator.userAgent
                }
            };
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscriptionId: subscription.id })
            });
        }).catch((err) => {
            this.setState({ subscriptionId: err });
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
                schema: this.state.route.parameters.schema || 'global',
                locale: this.state.locale.languageCode,
            };
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscriptionId: subscription.id })
            });
        }).catch((err) => {
            this.setState({ subscriptionId: err });
        }).finally(() => {
            this.updatingSubscription = false;
        });
    },

    /**
     * Ask remote server for the
     *
     * @return {[type]}
     */
    discoverPushRelay: function() {
        if (this.discoveringPushRelay) {
            return;
        }
        this.discoveringPushRelay = true;

        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            return db.findOne({ table: 'system' }).then((system) => {
                var address = _.get(system, 'settings.push_relay', '');
                this.setState({ pushRelay: address });
                return null;
            });
        }).catch((err) => {
            this.setState({ pushRelay: err });
        }).finally(() => {
            this.discoveringPushRelay = false;
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
        var criteria = { key: address };
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
        this.removeCredentialsFromCache(evt.address);

        var address = this.state.route.parameters.address;
        if (evt.address === address) {
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
     * Called when media payloads changes
     *
     * @param  {Object} evt
     */
    handlePayloadsChange: function(evt) {
        var payloads = new Payloads(evt.target);
        this.setState({ payloads });
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
                case 'no': require.ensure([ './locales/no' ], () => { try { resolve(require('./locales/no')) } catch(err) { reject(err) } }); break;
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
                canAccessSchema: true,
            });
        } else {
            // see if user credentials are stored locally
            this.loadCredentialsFromCache(address).then((authorization) => {
                if (authorization) {
                    database.addAuthorization(authorization);
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
        return Promise.try(() => {
            if (evt.url === '/') {
                // go to either StartPage or NewsPage
                var db = this.state.database.use({ schema: 'local', by: this });
                return db.find({ table: 'project_link' }).then((links) => {
                    var recent = _.last(_.sortBy(links, 'atime'));
                    var url;
                    if (recent) {
                        url = routeManager.find(NewsPage, {
                            address: recent.address,
                            schema: recent.schema,
                        });
                    } else {
                        url = routeManager.find(StartPage);
                    }
                    return url;
                });
            } else {
                throw new HttpError(404);
            }
        }).catch((err) => {
            var code = err.statusCode || 500;
            console.error(err);
            var url = routeManager.find(ErrorPage, { code });
            return url;
        });
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
                    this.state.route.change(url);
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
     * Called when user clicks on alert message
     *
     * @param  {Object} evt
     */
    handleAlertClick: function(evt) {
        var alert = evt.alert;
        // redirect to news page
        this.state.route.push(require('pages/news-page'), {
            schema: alert.schema,
            story: alert.story_id,
        });

        // this is needed in Chrome
        window.focus();
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

        }
    }
});

function getAnchor(element) {
    while (element && element.tagName !== 'A') {
        element = element.parentNode;
    }
    return element;
}
