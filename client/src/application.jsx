var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');

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

    getInitialState: function() {
        return {
            database: null,
            payloads: null,
            route: null,
            locale: null,
            theme: null,

            authenticationDetails: null,
        };
    },

    isReady: function() {
        return !!this.state.database
            && !!this.state.payloads
            && !!this.state.route
            && !!this.state.locale
            && !!this.state.theme;
    },

    render: function() {
        return (
            <div>
                {this.renderUserInterface()}
                {this.renderConfiguration()}
            </div>
        );
    },

    renderUserInterface: function() {
        if (!this.isReady()) {
            return null;
        }
        var CurrentPage = this.state.route.component;
        var props = {
            database: this.state.database,
            route: this.state.route,
            payloads: this.state.payloads,
            locale: this.state.locale,
            theme: this.state.theme,
        };
        return (
            <div className="application">
                <TopNavigation {...props} />
                <section className="page-view-port">
                    <CurrentPage {...props} />
                </section>
                <BottomNavigation {...props} />
            </div>
        );
    },

    renderConfiguration: function() {
        var setters = this.components.setters;
        var remoteDataSourceProps = {
            ref: setters.remoteDataSource,
            locale: this.state.locale,
            onChange: this.handleDatabaseChange,
            onAuthRequest: this.handleDatabaseAuthRequest,
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
     * Hide the splash screen once app is ready
     */
    componentDidUpdate: function() {
        if (!this.splashScreenHidden && this.isReady()) {
            this.splashScreenHidden = true;
            setTimeout(() => {
                this.hideSplashScreen();
            }, 100);
        }
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
     * Called when RemoteDataSource needs credentials for accessing a server
     *
     * @param  {Object} evt
     *
     * @return {Promise<Object>}
     */
    handleDatabaseAuthRequest: function(evt) {
        var server = evt.server
        if (this.authRequest) {
            if (this.authRequest.server === server) {
                return this.authRequest.promise;
            }
            this.authRequest.reject(new Error('Request cancelled'));
            this.authRequest = null;
        }

        this.authRequest = {};
        this.authRequest.server = server;
        this.authRequest.promise = new Promise((resolve, reject) => {
            this.authRequest.resolve = resolve;
            this.authRequest.reject = reject;
        });

        // retrieve credential from database
        var db = this.state.database.use({ by: this, schema: 'local' });
        var criteria = { server };
        db.findOne({ table: 'user_credential', criteria }).then((credential) => {
            if (credential && credential.token) {
                this.authRequest.resolve(credential)
            } else {
                if (!credential) {
                    credential = { server };
                }
                this.setState({ authenticationDetails: credential }, () => {
                    // TODO: retrieve info from dialog box
                    setTimeout(() => {
                        var credential = {
                            server,
                            username: 'tester',
                            password: 'qwerty'
                        };
                        this.authRequest.resolve(credential);
                    }, 10);
                });
            }
        }).catch((err) => {
            this.authRequest.reject(err);
        })
        return this.authRequest.promise;
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
                case 'pl': require.ensure([ './locales/pl' ], () => { try { resolve(require('./locales/pl')) } catch(err) { reject(err) } }); break;
                case 'ru': require.ensure([ './locales/ru' ], () => { try { resolve(require('./locales/ru')) } catch(err) { reject(err) } }); break;
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
        this.setState({ route });
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
     * Called when the UI theme changes
     *
     * @param  {Object} evt
     */
    handleThemeChange: function(evt) {
        var theme = new Theme(evt.target);
        this.setState({ theme });
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
