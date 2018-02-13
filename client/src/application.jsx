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
var ConnectivityMonitor = require('transport/connectivity-monitor');
var LocaleManager = require('locale/locale-manager');
var Locale = require('locale/locale');
var ThemeManager = require('theme/theme-manager');
var Theme = require('theme/theme');
var SubscriptionManager = require('data/subscription-manager');
var SessionManager = require('data/session-manager');
var LinkManager = require('routing/link-manager');

// pages
var StartPage = require('pages/start-page');
var NewsPage = require('pages/news-page');
var PeoplePage = require('pages/people-page');
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
            subscriptionManager: SubscriptionManager,
            sessionManager: SessionManager,
            linkManager: LinkManager,
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
            connection: null,
            searching: false,
            paused: false,
            pushRelay: null,
            renderingStartPage: false,
            showingUploadProgress: false,
            online: true,
            networkType: 'unknown',
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
            hasConnection: this.state.online,
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
            <div className={className} id="application">
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
        var selectedSchema = (route) ? route.parameters.schema : null;
        var remoteDataSourceProps = {
            ref: setters.remoteDataSource,
            inForeground: !this.state.paused,
            hasConnection: this.state.online,
            committedResultsOnly: false,
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
            hasConnection: this.state.online,
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
            directory: require('languages'),
            onChange: this.handleLocaleChange,
        };
        var themeManagerProps = {
            ref: setters.themeManager,
            database: this.state.database,
            modes: {
                'single-col': 0,
                'double-col': 700,
                'triple-col': 1300,
            },
            networkType: this.state.networkType,
            serverAddress: serverAddress,
            onChange: this.handleThemeChange,
        };
        var cacheProps = {
            ref: setters.cache,
            databaseName: 'trambar',
        };
        var connectivityMonitorProps = {
            onChange: this.handleConnectivityChange,
        };
        var notifierProps = {
            ref: setters.notifier,
            serverAddress: serverAddress,
            hasConnection: this.state.online,
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
            if (this.state.pushRelay) {
                _.assign(notifierProps, {
                    relayAddress: this.state.pushRelay.url,
                    searching: this.state.searching,
                });
            }
        }
        if (!selectedSchema || !this.state.canAccessSchema) {
            // keep an eye on changes of global objects like projects
            selectedSchema = 'global';
        }
        var subscriptionManagerProps = {
            ref: setters.subscriptionManager,
            area: 'client',
            connection: this.state.connection,
            schema: selectedSchema,
            database: this.state.database,
            locale: this.state.locale,
        };
        var sessionManagerProps = {
            ref: setters.sessionManager,
            database: this.state.database,
        };
        var linkManagerProps = {
            ref: setters.linkManager,
            database: this.state.database,
            route: this.state.route,
        };
        return (
            <div>
                <LocalCache {...cacheProps} />
                <Notifier {...notifierProps} />
                <RemoteDataSource {...remoteDataSourceProps} cache={this.components.cache} />
                <PayloadManager {...payloadManagerProps} />
                <RouteManager {...routeManagerProps} />
                <LocaleManager {...localeManagerProps} />
                <ThemeManager {...themeManagerProps} />
                <SubscriptionManager {...subscriptionManagerProps} />
                <SessionManager {...sessionManagerProps} />
                <LinkManager {...linkManagerProps} />
                <ConnectivityMonitor {...connectivityMonitorProps} />
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
     * Attach event handlers
     */
    componentDidMount: function() {
        if (process.env.PLATFORM === 'browser') {
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        }
        if (process.env.PLATFORM === 'cordova') {
            document.addEventListener('pause', this.handlePause, false);
            document.addEventListener('resume', this.handleResume, false);
        }
        if (process.env.NODE_ENV !== 'production') {
            window.addEventListener('keydown', this.handleDebugKeydown);
        }
    },

    /**
     * Hide the splash screen once app is ready
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!this.splashScreenHidden && this.isReady()) {
            this.splashScreenHidden = true;
            setTimeout(() => {
                this.hideSplashScreen();
            }, 100);
        }
    },

    /**
     * Remove event handlers
     */
    componentWillUnmount: function() {
        if (process.env.PLATFORM === 'browser') {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
        }
        if (process.env.PLATFORM === 'cordova') {
            document.removeEventListener('pause', this.handlePause, false);
            document.removeEventListener('resume', this.handleResume, false);
        }
        if (process.env.NODE_ENV !== 'production') {
            window.removeEventListener('keydown', this.handleDebugKeydown);
        }
    },

    /**
     * Ask remote server for the push relay URL
     */
    discoverPushRelay: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var db = this.state.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            return db.findOne({ table: 'system' }).then((system) => {
                var address = db.context.address;
                var url = _.get(system, 'settings.push_relay', '');
                var pushRelay = { address, url };
                if (!_.isEqual(pushRelay, this.state.pushRelay)) {
                    this.setState({ pushRelay });
                }
                return null;
            });
        });
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
        var database = new Database(evt.target, context, this.state.online);
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
        this.components.sessionManager.saveToCache(evt.session);

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
        this.components.sessionManager.removeFromCache(evt.session);

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
     * Called when the route changes
     *
     * @param  {Object} evt
     */
    handleRouteChange: function(evt) {
        var route = new Route(evt.target);
        var dataSource = this.components.remoteDataSource;

        // add server location to database context so we don't need to
        // specify it everywhere
        var database = this.state.database;
        var address = route.parameters.address;
        if (address != database.context.address) {
            database = new Database(dataSource, { address }, this.state.online);
        }

        // clear recent searches when we switch to a different project
        if (this.state.route) {
            var schemaBefore = this.state.route.parameters.schema;
            var schemaAfter = route.parameters.schema;
            if (address != database.context.address || schemaBefore !== schemaAfter) {
                dataSource.clear(address, schemaBefore);
            }
        }

        // set the route after we've determined whether we can access the data source
        var setRoute = (accessible) => {
            this.setState({
                route,
                database,
                canAccessServer: accessible,
                canAccessSchema: accessible,
            }, () => {
                // for mobile notification, we need to know which push relay
                // the server is employing
                if (accessible) {
                    if (Notifier === PushNotifier) {
                        this.discoverPushRelay();
                    }
                }
            });
        };

        // try to restore session prior to setting the route
        if (database.hasAuthorization()) {
            // route is already accessible
            setRoute(true);
        } else {
            // see if user credentials are stored locally
            this.components.sessionManager.loadFromCache(address).then((session) => {
                if (session) {
                    database.restoreSession(session);
                }
                if (database.hasAuthorization(address)) {
                    // route is now accessible
                    setRoute(true);
                } else {
                    // show start page, where user can log in or choose another project
                    setRoute(false);
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
                return this.components.linkManager.findRecentLocation().then((mostRecent) => {
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
        this.setState({ connection: evt.connection });
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
        if (process.env.PLATFORM !== 'browser') return;
        if (this.state.payloads && this.state.payloads.uploading) {
            // Chrome will repaint only after the modal dialog is dismissed
            this.setState({ showingUploadProgress: true });
            return (evt.returnValue = 'Are you sure?');
        }
    },

    /**
     * Called when Cordova application goes into background
     *
     * @param  {Event} evt
     */
    handlePause: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return;
        this.setState({ paused: true });
    },

    /**
     * Called when Cordova application comes into foreground again
     *
     * @param  {Event} evt
     */
    handleResume: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return;
        this.setState({ paused: false });

        // while we still receive push notification while the app is in
        // background, it's always possible that some of the messages are
        // missed due to lack of Internet access
        //
        // invalidate all queries just in case
        var dataSource = this.components.remoteDataSource;
        dataSource.invalidate();
    },

    /**
     * Called when connectivity changes
     *
     * @param  {Event} evt
     */
    handleConnectivityChange: function(evt) {
        var nextState = {
            online: evt.online,
            networkType: evt.type,
        };
        var database = this.state.database;
        if (database) {
            // change the online flag of database
            nextState.database = new Database(database.remoteDataSource, database.context, evt.online);
        }
        this.setState(nextState);
    },

    /**
     * Called when user press a key in dev environment
     *
     * @param  {Event} evt
     */
    handleDebugKeydown: function(evt) {
        if (evt.keyCode === 68 && evt.ctrlKey) {    // ctrl-D
            var params = this.state.route.parameters;
            if (params.schema) {
                this.state.route.push(require('pages/settings-page'), {
                    diagnostics: true,
                    schema: params.schema
                });
            }
            evt.preventDefault();
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
