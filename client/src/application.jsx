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
    }),

    getInitialState: function() {
        return {
            database: null,
            route: null,
            locale: null,
            theme: null,
        };
    },

    isReady: function() {
        return !!this.state.database
            && !!this.state.locale
            && !!this.state.route
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
            onChange: this.handleDatabaseChange,
            onAuthRequest: this.handleDatabaseAuthRequest,
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
            onChange: this.handleThemeChange,
        };
        return (
            <div>
                <RemoteDataSource {...remoteDataSourceProps} />
                <RouteManager {...routeManagerProps} />
                <LocaleManager {...localeManagerProps} />
                <ThemeManager {...themeManagerProps} />
            </div>
        );
    },

    componentDidUpdate: function() {
        if (!this.splashScreenHidden && this.isReady()) {
            this.hideSplashScreen();
            this.splashScreenHidden = true;
        }
    },

    handleDatabaseChange: function(evt) {
        var database = new Database(evt.target);
        this.setState({ database });
    },

    handleDatabaseAuthRequest: function(evt) {
        var db = this.state.database.use({ by: this, schema: 'local' });
        var criteria = { server: evt.server };
        return db.findOne({ table: 'user_credential', criteria }).then((credential) => {
            if (credential && credential.token) {
                return credential;
            } else {
                return new Promise((resolve, reject) => {
                    if (!credential) {
                        credential = { server: evt.server };
                    }
                    this.setState({
                        authRequest: { resolve, reject, credential }
                    });
                });
            }
        });
    },

    handleLocaleChange: function(evt) {
        var locale = new Locale(evt.target);
        this.setState({ locale });
        document.title = locale.translate('app-name');
    },

    handleLanguageModuleRequest: function(evt) {
        var languageCode = evt.languageCode.substr(0, 2);
        return new Promise((resolve, reject) => {
            // list the modules here so Webpack can codesplit them
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

    handleRouteChange: function(evt) {
        var route = new Route(evt.target);
        this.setState({ route });
    },

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

    handleThemeChange: function(evt) {
        var theme = new Theme(evt.target);
        this.setState({ theme });
    },

    hideSplashScreen: function() {
        var screen = document.getElementById('splash-screen');
        var style = document.getElementById('splash-screen-style');
        if (screen) {
            screen.style.opacity = 0;
            setTimeout(() => {
                screen.parentNode.removeChild(screen);
                if (style) {
                    style.parentNode.removeChild(style);
                }
            }, 1000);
        }
    }
});
