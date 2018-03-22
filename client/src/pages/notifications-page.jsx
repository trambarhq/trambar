var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');
var UserFinder = require('objects/finders/user-finder');
var NotificationFinder = require('objects/finders/notification-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var NotificationList = require('lists/notification-list');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

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
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/notifications/:date/?',
                '/:schema/notifications/?'
            ], (params) => {
                return {
                    schema: params.schema,
                    date: Route.parseDate(params.date),
                };
            })
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/${params.schema}/notifications/`, query, hash;
            if (params.date != undefined) {
                path += `${params.date || 'date'}/`;
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
            var statistics = {
                type: 'daily-notifications',
                schema: params.schema,
                // user_id will default to current user
            };
            return {
                calendar: { route, statistics },
                navigation: { route, section: 'notifications' }
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
            notifications: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationsPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return NotificationFinder.findNotificationsForUser(db, props.currentUser).then((notifications) => {
                props.notifications = notifications;
            });
        }).then(() => {
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
                {this.renderEmptyMessage()}
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
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelectionClear: this.handleSelectionClear,
        };
        return <NotificationList {...listProps} />;
    },

    /**
     * Render a message if there're no notifications
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var notifications = this.props.notifications;
        if (!_.isEmpty(notifications)) {
            return null;
        }
        if (!notifications) {
            // props.notifications is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var params = this.props.route.parameters;
            var phrase;
            if (params.date) {
                phrase = 'notifications-no-notifications-on-date';
            } else {
                phrase = 'notifications-no-notifications-yet';
            }
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase,
            };
            return <EmptyMessage {...props} />;
        }
    },

    /**
     * Called when user has scrolled away from selected story
     */
    handleSelectionClear: function() {
        this.props.route.unanchor();
    },
});
