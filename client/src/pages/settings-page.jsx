var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectPanel = require('panels/project-panel');
var UserInfoPanel = require('panels/user-info-panel');
var UserImagePanel = require('panels/user-image-panel');
var NotificationPanel = require('panels/notification-panel');
var WebAlertPanel = require('panels/web-alert-panel');
var MobileAlertPanel = require('panels/mobile-alert-panel');
var SocialNetworkPanel = require('panels/social-network-panel');
var LanguagePanel = require('panels/language-panel');

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
        parseUrl: function(path, query, url) {
            return Route.match(path, [
                '/global/settings/?',
                '/:schema/settings/?',
            ], (params) => {
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/${params.schema || 'global'}/settings/`, query, hash;
            return { path, query, hash };
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getOptions: function(route) {
            return {
                navigation: {
                    top: {},
                    bottom: {
                        section: 'settings',
                    }
                },
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

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<SettingsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            this.props.payloads.reattach('global', user);
            props.currentUser = user;
            return <SettingsPageSync {...props} />;
        });
    },
});

var SettingsPageSync = module.exports.Sync = React.createClass({
    displayName: 'SettingsPage.Sync',
    propTypes: {
        currentUser: PropTypes.object,

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
        var panelProps = {
            currentUser: this.getUser(),
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.handleChange,
        };
        return (
            <div className="settings-page">
                <div className="panels">
                    <ProjectPanel {...panelProps} />
                    <UserInfoPanel {...panelProps} />
                    <UserImagePanel {...panelProps} />
                    <SocialNetworkPanel {...panelProps} />
                    <NotificationPanel {...panelProps} />
                    <WebAlertPanel {...panelProps} />
                    <MobileAlertPanel {...panelProps} />
                    <LanguagePanel {...panelProps} />
                </div>
            </div>
        );
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
});
