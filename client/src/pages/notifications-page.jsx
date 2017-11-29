var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var NotificationList = require('lists/notification-list');

require('./notifications-page.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationsPage',
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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/notifications/:date/?',
                '/:schema/notifications/?'
            ], (params) => {
                params.search = query.search;
                return params;
            })
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/${params.schema}/notifications/`, query, hash;
            if (params.date) {
                path += `${params.date}/`;
            }
            if (params.search) {
                query = { search: params.search };
            }
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
                    top: {
                        dateSelection: true,
                        roleSelection: false,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'notifications'
                    }
                },
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
            notifications: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationsPageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load current user
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            return meanwhile.show(<NotificationsPageSync {...props} />);
        }).then(() => {
            // load notifications
            var criteria = {};
            criteria.target_user_id = props.currentUser.id;
            if (params.date) {
                var s = Moment(params.date);
                var e = s.clone().endOf('day');
                var rangeStart = s.toISOString();
                var rangeEnd = e.toISOString();
                var range = `[${rangeStart},${rangeEnd}]`;
                criteria.time_range = range;
            }
            if (params.search) {
                criteria.search = {
                    lang: this.props.locale.lang,
                    text: params.search,
                };
                criteria.limit = 100;
            } else {
                criteria.limit = 500;
            }
            return db.find({ table: 'notification', criteria });
        }).then((notifications) => {
            props.notifications = notifications;
            return <NotificationsPageSync {...props} />;
        });
    }
});

var NotificationsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationsPage.Sync',
    propTypes: {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="notifications-page">
                {this.renderList()}
            </div>
        );
    },

    /**
     * Render list of notifications
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var listProps = {
            notifications: this.props.notifications,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NotificationList {...listProps} />;
    },
});
