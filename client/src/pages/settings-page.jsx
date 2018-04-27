var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var KonamiCode = require('utils/konami-code');
var DeviceFinder = require('objects/finders/device-finder');
var ProjectFinder = require('objects/finders/project-finder');
var RepoFinder = require('objects/finders/repo-finder');
var SystemFinder = require('objects/finders/system-finder');
var UserFinder = require('objects/finders/user-finder');
var UserUtils = require('objects/utils/user-utils');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var DevelopmentPanel = require('panels/development-panel');
var ProjectPanel = require('panels/project-panel');
var DevicePanel = require('panels/device-panel');
var UserInfoPanel = require('panels/user-info-panel');
var UserImagePanel = require('panels/user-image-panel');
var NotificationPanel = require('panels/notification-panel');
var WebAlertPanel = require('panels/web-alert-panel');
var MobileAlertPanel = require('panels/mobile-alert-panel');
var SocialNetworkPanel = require('panels/social-network-panel');
var LanguagePanel = require('panels/language-panel');
var DiagnoisticsPanel = require('panels/diagnostics-panel');

require('./settings-page.scss');

var AUTOSAVE_DURATION = 2000;

module.exports = Relaks.createClass({
    displayName: 'SettingsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, url) {
            return Route.match(path, [
                '/global/settings/?',
                '/:schema/settings/?',
            ], (params) => {
                return {
                    schema: params.schema,
                    diagnostics: !!query.diagnostics,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/${params.schema || 'global'}/settings/`, query = {}, hash;
            if (params.diagnostics) {
                query.diagnostics = 1;
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
            var params = currentRoute.parameters;
            var route = {
                schema: params.schema,
            };
            return {
                navigation: { route, section: 'settings' }
            };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            currentUser: null,
            currentProject: null,
            projectLinks: null,
            repos: null,
            devices: null,
            system: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<SettingsPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findProjectLinks(db).then((links) => {
                props.projectLinks = links;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.currentProject = project;
            });
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return DeviceFinder.findUserDevices(db, props.currentUser, 1).then((devices) => {
                props.devices = devices;
            });
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return RepoFinder.findProjectRepos(db, props.currentProject).then((repos) => {
                props.repos = repos;
            })
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            return <SettingsPageSync {...props} />;
        });
    },
});

var SettingsPageSync = module.exports.Sync = React.createClass({
    displayName: 'SettingsPage.Sync',
    propTypes: {
        currentUser: PropTypes.object,
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        devices: PropTypes.arrayOf(PropTypes.object),
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            user: null,
            original: null,
        };
    },

    /**
     * Return current user, possibility with unsaved modifications
     *
     * @return {User}
     */
    getUser: function() {
        return this.state.user || this.props.currentUser;
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.currentUser !== nextProps.currentUser) {
            var state = { user: null };
            if (nextProps.currentUser && !nextProps.currentUser.uncommitted) {
                state.original = nextProps.currentUser;
            }
            this.setState({ user: null });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var params = this.props.route.parameters;
        if (params.diagnostics) {
            return this.renderDiagnostics();
        } else {
            return this.renderSettings();
        }
    },

    /**
     * Render settings panels
     *
     * @return {ReactElement|null}
     */
    renderSettings: function() {
        if (!this.props.currentUser) {
            return null;
        }
        return (
            <div className="settings-page">
                <div className="panels">
                    {this.renderDevelopmentPanel()}
                    {this.renderProjectPanel()}
                    {this.renderDevicePanel()}
                    {this.renderNotificationPanel()}
                    {this.renderWebAlertPanel()}
                    {this.renderMobileAlertPanel()}
                    {this.renderUserInfoPanel()}
                    {this.renderUserImagePanel()}
                    {this.renderSocialNetworkPanel()}
                    {this.renderLanguagePanel()}
                </div>
            </div>
        );
    },

    /**
     * Render diagnostics panels
     *
     * @return {ReactElement}
     */
    renderDiagnostics: function() {
        return (
            <div className="settings-page">
                <div className="panels diagnostics">
                    <DiagnoisticsPanel type="connectivity-monitor" title="Network" />
                    <DiagnoisticsPanel type="websocket-notifier" title="Web Socket" />
                    <DiagnoisticsPanel type="push-notifier" title="Push Notification" />
                    <DiagnoisticsPanel type="subscription-manager" title="Data Subscription" />
                    <DiagnoisticsPanel type="session-manager" title="Sessions" />
                    <DiagnoisticsPanel type="link-manager" title="Project Links" />
                    <DiagnoisticsPanel type="locale-manager" title="Locale Manager" />
                    <DiagnoisticsPanel type="indexed-db-cache" title="IndexedDB Cache" />
                    <DiagnoisticsPanel type="sqlite-cache" title="SQLite Cache" />
                    <DiagnoisticsPanel type="remote-data-source" title="Remote Data Source" />
                    <DiagnoisticsPanel type="payload-manager" title="Payload Manager" />
                </div>
            </div>
        );
    },

    /**
     * Render diagnostics panel if it's turned on
     *
     * @return {ReactElement|null}
     */
    renderDevelopmentPanel: function() {
        var user = this.getUser();
        var enabled = _.get(user, 'settings.development.show_panel');
        if (!enabled) {
            return null;
        }
        var panelProps = {
            currentUser: user,
            route: this.props.route,
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <DevelopmentPanel {...panelProps} />;
    },

    /**
     * Render project panel
     *
     * @return {ReactElement}
     */
    renderProjectPanel: function() {
        var panelProps = {
            system: this.props.system,
            currentUser: this.getUser(),
            currentProject: this.props.currentProject,
            projectLinks: this.props.projectLinks,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.handleChange,
        };
        return <ProjectPanel {...panelProps} />;
    },

    /**
     * Render device panel
     *
     * @return {ReactElement}
     */
    renderDevicePanel: function() {
        if (process.env.PLATFORM === 'cordova') {
            return null;
        }
        if (_.isEmpty(this.props.devices)) {
            return null;
        }
        var panelProps = {
            devices: this.props.devices,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <DevicePanel {...panelProps} />;
    },

    /**
     * Render user info panel
     *
     * @return {ReactElement}
     */
    renderUserInfoPanel: function() {
        var panelProps = {
            currentUser: this.getUser(),
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <UserInfoPanel {...panelProps} />;
    },

    /**
     * Render user image panel
     *
     * @return {ReactElement}
     */
    renderUserImagePanel: function() {
        var panelProps = {
            currentUser: this.getUser(),
            payloads: this.props.payloads,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.handleChange,
        };
        return <UserImagePanel {...panelProps} />;
    },

    /**
     * Render social network panel
     *
     * @return {ReactElement}
     */
    renderSocialNetworkPanel: function() {
        var panelProps = {
            currentUser: this.getUser(),
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <SocialNetworkPanel {...panelProps} />;
    },

    /**
     * Render notification panel
     *
     * @return {ReactElement}
     */
    renderNotificationPanel: function() {
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <NotificationPanel {...panelProps} />;
    },

    /**
     * Render web alert panel
     *
     * @return {ReactElement|null}
     */
    renderWebAlertPanel: function() {
        if (process.env.PLATFORM === 'cordova') {
            return null;
        }
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <WebAlertPanel {...panelProps} />;
    },

    /**
     * Render mobile alert panel
     *
     * @return {ReactElement|null}
     */
    renderMobileAlertPanel: function() {
        if (_.isEmpty(this.props.devices)) {
            return null;
        }
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <MobileAlertPanel {...panelProps} />;
    },

    /**
     * Render language panel
     *
     * @return {ReactElement}
     */
    renderLanguagePanel: function() {
        var panelProps = {
            locale: this.props.locale,
        };
        return <LanguagePanel {...panelProps} />;
    },

    /**
     * Add Konami code listener
     */
    componentDidMount: function() {
        KonamiCode.addListener(this.handleKonamiCode);
    },

    /**
     * Save immediately on unmount
     *
     * @return {[type]}
     */
    componentWillUnmount: function() {
        KonamiCode.removeListener(this.handleKonamiCode);
    },

    /**
     * Save new user object to remote database
     *
     * @param  {User} user
     * @param  {Boolean} immediate
     *
     * @return {Promise<User>}
     */
    saveUser: function(user, immediate) {
        var schema = 'global';
        var original = this.state.original;
        var options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (UserUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        var db = this.props.database.use({ schema, by: this });
        return db.saveOne({ table: 'user' }, user, options).then((user) => {
            // start file upload
            this.props.payloads.dispatch(user);
            return user;
        });
    },

    /**
     * Called when the user is changed by one of the panels
     *
     * @param  {Object} evt
     */
    handleChange: function(evt) {
        var user = evt.user;
        this.setState({ user }, () => {
            this.saveUser(user, evt.immediate || false);
        });
    },

    /**
     * Called when user enters Konami code
     *
     * @param  {Object} evt
     */
    handleKonamiCode: function(evt) {
        var user = _.decoupleSet(this.getUser(), 'settings.development.show_panel', true);
        this.setState({ user }, () => {
            this.saveUser(user, true);
        });
    },
});
