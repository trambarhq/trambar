var React = require('react'), PropTypes = React.PropTypes;

var ComponentRefs = require('utils/component-refs');

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
var NewsPage = require('pages/news-page');
var UsersPage = require('pages/users-page');
var NotificationsPage = require('pages/notifications-page');
var BookmarksPage = require('pages/bookmarks-page');
var SettingsPage = require('pages/settings-page');

var pageClasses = [
    NewsPage,
    UsersPage,
    NotificationsPage,
    BookmarksPage,
    SettingsPage
];

require('application.scss');

module.exports = React.createClass({
    module: 'Application',
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
        return !!this.props.database
            && !!this.props.locale
            && !!this.props.route
            && !!this.props.theme;
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
            <div>
                <TopNavigation {...props} />
                <CurrentPage {...props} />
                <BottomNavigation {...props} />
            </div>
        );
    },

    renderConfiguration: function() {
        var setters = this.components.setters;
        var remoteDataSourceProps = {
            ref: refs.remoteDataSource,
            onChange: this.handleDatabaseChange,
        };
        var routeManagerProps = {
            ref: setters.routeManager,
            pages: pageClasses,
            database: this.state.database,
            onChange: this.handleRouteChange,
            onMissing: this.handleRouteMissing,
        };
        var localeManagerProps = {
            ref: setters.localeManager,
            database: this.state.database,
            onChange: this.handleLocaleChange,
        };
        var themeManagerProps = {
            ref: setters.themeManager,
            database: this.state.database,
            onChange: this.handleThemeChange,
        };
        return (
            <div>
                <RemoteDataSource {...remoteDataSourceProps} >
                    {this.renderLocalCache()}
                </RemoteDataSource>
                <RouteManager {...routeManagerProps} />
                <LocaleManager {...localeManagerProps} />
                <ThemeManager {...themeManagerProps} />
            </div>
        );
    },

    renderLocalCache: function() {
        if (process.env.PLATFORM === 'cordova') {
            var SQLiteCache = require('data/sqlite-cache');
            if (SQLiteCache.isAvailable()) {
                var sqliteProps = {
                };
                return <SQLiteCache {...sqliteProps} />;
            }
        } else if (process.env.PLATFORM === 'browser') {
            var IndexedDBCache = require('data/indexed-db-cache');
            if (IndexedDBCache.isAvailable()) {
                var indexedDBProps = {
                };
                return <IndexedDBCache {...indexedDBProps} />;
            }
        }
    },

    componentDidMount: function() {
    },

    componentDidUpdate: function() {
        if (!this.splashScreenHidden && this.isReady()) {
            this.hideSplashScreen();
            this.splashScreenHidden = true;
        }
    },

    handleDatabaseChange: function(evt) {
        this.setState({
            database: new Database(evt.target),
        });
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
        this.setState({
            locale: new Locale(evt.target),
        });
    },

    handleLanguageModuleRequest: function(evt) {
        var languageCode = _.substr(evt.languageCode, 0, 2);
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
        this.setState({
            route: new Route(evt.target),
        });
    },

    handleRouteMissing: function(evt) {
        if (evt.url === '/') {
            // go either to StartPage or NewsPage
            var db = this.state.database.use({ by: this, schema: 'local' });
            return db.find({ table: 'project_link' }).then((links) => {
                var recent = _.last(_.sortBy(links, 'atime'));
                var url;
                if (!recent) {
                    url = StartPage.getUrl({});
                } else {
                    url = NewsPage.getUrl({
                        server: recent.server,
                        schema: recent.schema,
                    });
                }
                return evt.target.change(url, evt.replacing);
            });
        } else {
            var url = MissingPage.getUrl({});
            return evt.target.change(url, evt.replacing);
        }
    },

    handleThemeChange: function(evt) {
        this.setState({
            theme: new Theme(evt.target),
        });
    },

    hideSplashScreen: function() {
    }
});
