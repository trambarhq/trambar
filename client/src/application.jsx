var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');
var AnchorFinder = require('utils/anchor-finder');

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
    propTypes: {

    },
    components: ComponentRefs({
        remoteDataSource: RemoteDataSource,
        routeManager: RouteManager,
        localeManager: LocaleManager,
        themeManager: ThemeManager,
        uploadManager: PayloadManager,
    }),

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            database: null,
            payloads: null,
            route: null,
            locale: null,
            theme: null,

            canAccessServer: false,
            canAccessSchema: false,
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
        var navProps = {
            database: this.state.database,
            route: this.state.route,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        if (this.isShowingStartPage()) {
            navProps.hidden = true;
        }
        return (
            <div className="application">
                <TopNavigation {...navProps} />
                <section className="page-view-port">
                    <div className="contents">
                        {this.renderCurrentPage()}
                    </div>
                </section>
                <BottomNavigation {...navProps} />
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
        var remoteDataSourceProps = {
            ref: setters.remoteDataSource,
            locale: this.state.locale,
            cacheName: 'trambar',
            onChange: this.handleDatabaseChange,
            onAuthorization: this.handleAuthorization,
            onExpiration: this.handleExpiration,
            onViolation: this.handleViolation,
            onAlertClick: this.handleAlertClick,
        };
        var uploadManagerProps = {
            ref: setters.uploadManager,
            database: this.state.database,
            route: this.state.route,
            onChange: this.handlePayloadsChange,
        };
        var routeManagerProps = {
            ref: setters.routeManager,
            baseUrls: [ '', '/trambar' ],
            pages: pageClasses,
            database: this.state.database,
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
            route: this.state.route,
            onChange: this.handleThemeChange,
        };
        return (
            <div>
                <RemoteDataSource {...remoteDataSourceProps} />
                <PayloadManager {...uploadManagerProps} />
                <RouteManager {...routeManagerProps} />
                <LocaleManager {...localeManagerProps} />
                <ThemeManager {...themeManagerProps} />
            </div>
        );
    },

    /**
     * Called after application has rerendered
     */
    componentDidUpdate: function(prevProps, prevState) {
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
     * Load user credentials (authorization token, user_id, etc.) from local cache
     *
     * @param  {String} server
     *
     * @return {Promise<Object|null>}
     */
    loadCredentialsFromCache: function(server) {
        var db = this.state.database.use({ by: this, schema: 'local' });
        var criteria = { server };
        return db.findOne({ table: 'user_credentials', criteria });
    },

    /**
     * Save user credentials to local cache
     *
     * @param  {String} server
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    saveCredentialsToCache: function(server, credentials) {
        // save the credentials
        var db = this.state.database.use({ by: this, schema: 'local' });
        var record = _.extend({
            key: server,
        }, credentials);
        return db.saveOne({ table: 'user_credentials' }, record);
    },

    /**
     * Remove user credentials from local cache
     *
     * @param  {String} server
     *
     * @return {Promise<Object>}
     */
    removeCredentialsFromCache: function(server) {
        // save the credentials
        var db = this.state.database.use({ by: this, schema: 'local' });
        var record = { key: server };
        return db.removeOne({ table: 'user_credentials' }, record);
    },

    /**
     * Called when the database queries might yield new results
     *
     * @param  {Object} evt
     */
    handleDatabaseChange: function(evt) {
        var database = new Database(evt.target);
        this.setState({ database });
    },

    /**
     * Called when sign-in was successful
     *
     * @param  {Object} evt
     */
    handleAuthorization: function(evt) {
        this.saveCredentialsToCache(evt.server, evt.credentials);

        var server = this.state.route.server || window.location.hostname;
        if (server === evt.server) {
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
        this.removeCredentialsFromCache(evt.server);

        var server = this.state.route.server || window.location.hostname;
        if (evt.server === server) {
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
        var server = this.state.route.server || window.location.hostname;
        var schema = this.state.route.parameters.schema;
        if (evt.server === server && evt.schema === schema) {
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
        var dataSource = this.components.remoteDataSource;
        var server = route.parameters.server || location.hostname;
        if (dataSource.hasAuthorization(server)) {
            // route is accessible
            this.setState({
                route,
                canAccessServer: true,
                canAccessSchema: true,
            });
        } else {
            // see if user credentials are stored locally
            this.loadCredentialsFromCache(server).then((authorization) => {
                if (authorization) {
                    dataSource.addAuthorization(server, authorization);
                }
                if (dataSource.hasAuthorization(server)) {
                    // route is now accessible
                    this.setState({
                        route,
                        canAccessServer: true,
                        canAccessSchema: true,
                    });
                } else {
                    // show start page, where user can log in or choose another project
                    this.setState({
                        route,
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
        return Promise.try(() => {
            if (evt.url === '/') {
                // go to either StartPage or NewsPage
                var db = this.state.database.use({ by: this, schema: 'local' });
                return db.find({ table: 'project_link' }).then((links) => {
                    var recent = _.last(_.sortBy(links, 'atime'));
                    if (recent) {
                        return NewsPage.getUrl({
                            server: recent.server,
                            schema: recent.schema,
                        });
                    } else {
                        return StartPage.getUrl({});
                    }
                    return url;
                });
            } else {
                throw new HttpError(404);
            }
        }).catch((err) => {
            var errorCode = err.statusCode || 500;
            console.error(err);
            return ErrorPage.getUrl({ errorCode });
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
     * Called when user clicks on alert message
     *
     * @param  {Object} evt
     */
    handleAlertClick: function(evt) {
        var alert = evt.alert;
        // redirect to news page
        var route = this.state.route;
        var url = require('pages/news-page').getUrl({
            server: route.parameters.server,
            schema: alert.schema,
            storyId: alert.story_id,
        });
        route.change(url);

        // this is needed in Chrome
        window.focus();
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

function getAnchor(element) {
    while (element && element.tagName !== 'A') {
        element = element.parentNode;
    }
    return element;
}
