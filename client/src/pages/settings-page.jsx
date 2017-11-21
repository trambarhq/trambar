var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Masonry = require('react-masonry-component');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectPanel = require('panels/project-panel');
var UserPanel = require('panels/user-panel');
var NotificationPanel = require('panels/notification-panel');
var LanguagePanel = require('panels/language-panel');

require('./settings-page.scss');

module.exports = Relaks.createClass({
    displayName: 'SettingsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
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
        var masonryOptions = {
            transitionDuration: 0
        };
        return (
            <div className="settings-page">
                <Masonry options={masonryOptions}>
                    <ProjectPanel {...panelProps} />
                    <UserPanel {...panelProps} />
                    <NotificationPanel {...panelProps} />
                    <LanguagePanel {...panelProps} />
                </Masonry>
            </div>
        );
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
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, schema: 'global', by: this });
        return db.saveOne({ table: 'user' }, user).then((user) => {
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
            this.autosaveUser(user);
        });
    },
});
