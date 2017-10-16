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
var ProjectListPage = require('pages/project-list-page');
var ProjectSummaryPage = require('pages/project-summary-page');
var MemberListPage = require('pages/member-list-page');
var RoleListPage = require('pages/role-list-page');
var RolePage = require('pages/role-summary-page');
var RepoListPage = require('pages/repo-list-page');
var RepoSummaryPage = require('pages/repo-summary-page');
var RobotListPage = require('pages/robot-list-page');
var RobotSummaryPage = require('pages/robot-summary-page');
var ServerListPage = require('pages/server-list-page');
var ServerSummaryPage = require('pages/server-summary-page');
var SettingsPage = require('pages/settings-page');
var UserListPage = require('pages/user-list-page');
var UserSummaryPage = require('pages/user-summary-page');

var SignInPage = require('pages/sign-in-page');

// widgets
var SideNavigation = require('widgets/side-navigation');

var pageClasses = [
    ProjectListPage,
    ProjectSummaryPage,
    MemberListPage,
    RoleListPage,
    RolePage,
    RepoListPage,
    RepoSummaryPage,
    RobotListPage,
    RobotSummaryPage,
    ServerListPage,
    ServerSummaryPage,
    SettingsPage,
    UserListPage,
    UserSummaryPage,
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
        });
        return {
            database: null,
            payloads: null,
            route: null,
            locale: null,
            theme: null,

            canAccessServer: false,
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
                    {this.renderCurrentPage()}
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
            CurrentPage = SignInPage;
        }
        return <CurrentPage {...pageProps} />;
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
            cacheName: 'trambar-admin',
            urlPrefix: '/admin',
            retrievalFlags: {
                include_ctime: true,
                include_mtime: true,
            },
            onChange: this.handleDatabaseChange,
            onAuthorization: this.handleAuthorization,
            onExpiration: this.handleExpiration,
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
            route: this.state.route,
            onChange: this.handleThemeChange,
        };
        return (
            <div>
                <RemoteDataSource {...remoteDataSourceProps} />
                <PayloadManager {...payloadManagerProps} />
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

        var server = window.location.hostname;
        if (evt.server === server) {
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
        this.removeCredentialsFromCache(evt.server);

        var server = window.location.hostname;
        if (evt.server === server) {
            this.setState({
                canAccessServer: false
            });
        }
    },

    /**
     * Called when upload payloads changes
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
                    });
                } else {
                    // show login page
                    this.setState({
                        route,
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
        return Promise.try(() => {
            if (evt.url === '/') {
                return ProjectListPage.getUrl({});
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
