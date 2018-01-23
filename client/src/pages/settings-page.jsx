var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var KonamiCode = require('utils/konami-code');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var DiagnosticsPanel = require('panels/diagnostics-panel');
var ProjectPanel = require('panels/project-panel');
var DevicePanel = require('panels/device-panel');
var UserInfoPanel = require('panels/user-info-panel');
var UserImagePanel = require('panels/user-image-panel');
var NotificationPanel = require('panels/notification-panel');
var WebAlertPanel = require('panels/web-alert-panel');
var MobileAlertPanel = require('panels/mobile-alert-panel');
var SocialNetworkPanel = require('panels/social-network-panel');
var LanguagePanel = require('panels/language-panel');
var DiagnoisticDataPanel = require('panels/diagnostic-data-panel');

require('./settings-page.scss');

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
            var route = {
                parameters: _.pick(currentRoute.parameters, 'schema', 'user')
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
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            currentUser: null,
            currentProject: null,
            projectLinks: null,
            system: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<SettingsPageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load current user
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            return meanwhile.show(<SettingsPageSync {...props} />);
        }).then(() => {
            var criteria = {};
            return db.find({ schema: 'local', table: 'project_link', criteria });
        }).then((projectLinks) => {
            props.projectLinks = projectLinks;
            return meanwhile.show(<SettingsPageSync {...props} />);
        }).then(() => {
            var criteria = { name: params.schema };
            return db.findOne({ schema: 'global', table: 'project', criteria, required: true });
        }).then((project) => {
            props.currentProject = project;
            return meanwhile.show(<SettingsPageSync {...props} />);
        }).then(() => {
            var criteria = { user_id: props.currentUser.id };
            return db.find({ schema: 'global', table: 'device', criteria });
        }).then((devices) => {
            props.devices = devices;
            return meanwhile.show(<SettingsPageSync {...props} />);
        }).then(() => {
            var criteria = {};
            return db.findOne({ schema: 'global', table: 'system', criteria });
        }).then((system) => {
            props.system = system;
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
            user: null
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
            // TODO: might need to merge properties
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
     * @return {ReactElement}
     */
    renderSettings: function() {
        return (
            <div className="settings-page">
                <div className="panels">
                    {this.renderDiagnosticsPanel()}
                    {this.renderProjectPanel()}
                    {this.renderDevicePanel()}
                    {this.renderUserInfoPanel()}
                    {this.renderUserImagePanel()}
                    {this.renderSocialNetworkPanel()}
                    {this.renderLanguagePanel()}
                    {this.renderNotificationPanel()}
                    {this.renderWebAlertPanel()}
                    {this.renderMobileAlertPanel()}
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
                <div className="panels">
                    <DiagnoisticDataPanel type="websocket-notifier" title="Web Socket" />
                    <DiagnoisticDataPanel type="push-notifier" title="Push Notification" />
                    <DiagnoisticDataPanel type="subscription-manager" title="Data Subscription" />
                </div>
            </div>
        );
    },

    /**
     * Render diagnostics panel if it's turned on
     *
     * @return {ReactElement|null}
     */
    renderDiagnosticsPanel: function() {
        var user = this.getUser();
        var enabled = _.get(user, 'settings.diagnostics.show_panel');
        if (!enabled) {
            return null;
        }
        var panelProps = {
            currentUser: user,
            route: this.props.route,
            locale: this.props.locale,
            onChange: this.handleChange,
        };
        return <DiagnosticsPanel {...panelProps} />;
    },

    /**
     * Render project panel
     *
     * @return {ReactElement}
     */
    renderProjectPanel: function() {
        var panelProps = {
            system: this.props.system,
            currentProject: this.props.currentProject,
            projectLinks: this.props.projectLinks,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
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
        if (this.autosaveTimeout && this.state.user) {
            clearTimeout(this.autosaveTimeout);
            this.saveUser(this.state.user);
        }
        KonamiCode.removeListener(this.handleKonamiCode);
    },

    /**
     * Save changes after a delay
     *
     * @param  {User} user
     */
    autosaveUser: function(user) {
        if (this.autosaveTimeout) {
            clearTimeout(this.autosaveTimeout);
        }
        this.autosaveTimeout = setTimeout(() => {
            this.saveUser(user);
            this.autosaveTimeout = null;
        }, 2000);
    },

    /**
     * Save new user object to remote database
     *
     * @param  {User} user
     *
     * @return {Promise<User>}
     */
    saveUser: function(user) {
        var payloads = this.props.payloads;
        var schema = 'global';
        return payloads.prepare(schema, user).then(() => {
            var db = this.props.database.use({ schema, by: this });
            return db.saveOne({ table: 'user' }, user).then((user) => {
                // start file upload
                return payloads.dispatch(schema, user).return(user);
            });
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
            this.autosaveUser(user);
        });
    },

    /**
     * Called when user enters Konami code
     *
     * @param  {Object} evt
     */
    handleKonamiCode: function(evt) {
        var user = _.decoupleSet(this.getUser(), 'settings.diagnostics.show_panel', true);
        this.setState({ user }, () => {
            this.autosaveUser(user);
        });
    },
});
