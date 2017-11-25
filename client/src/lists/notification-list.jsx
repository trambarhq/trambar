var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var NotificationView = require('views/notification-view');

require('./notification-list.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationList',
    propTypes: {
        notifications: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            users: null,

            notifications: this.props.notifications,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationListSync {...props} />, 250);
        return db.start().then((userId) => {
            // load authors of comments
            var criteria = {};
            criteria.id = _.uniq(_.map(props.notifications, 'user_id'));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<NotificationListSync {...props} />);
        }).then(() => {
            // load stories
            var criteria = {};
            criteria.id = _.uniq(_.map(props.notifications, 'story_id'));
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.stories = stories;
            return <NotificationListSync {...props} />;
        })
    },
});

var NotificationListSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        notifications: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

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
        var notifications = sortNotifications(this.props.notifications);
        return (
            <div className="notification-list">
                {_.map(notifications, this.renderNotification)}
            </div>
        );
    },

    /**
     * Render a notification
     *
     * @param  {Object} notification
     *
     * @return {ReactElement}
     */
    renderNotification: function(notification) {
        var user = findUser(this.props.users, notification);
        var props = {
            notification,
            user,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onClick: this.handleNotificationClick,
        };
        return <NotificationView key={notification.id} {...props} />;
    },

    /**
     * Set seen flag of notifications to true
     *
     * @param  {Array<Notification>} notifications
     *
     * @return {Promise<Array>}
     */
    markAsSeen: function(notifications) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var notificationsAfter = _.map(notifications, (notification) => {
            return { id: notification.id, seen: true };
        });
        return db.save({ table: 'notification' }, notificationsAfter);
    },

    /**
     * Mark unread notification as seen after some time
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.notifications !== this.props.notifications) {
            var unread = _.filter(this.props.notifications, { seen: false });
            if (!_.isEmpty(unread)) {
                var delay = Math.min(10, unread.length * 2);
                clearTimeout(this.markAsSeenTimeout);
                this.markAsSeenTimeout = setTimeout(() => {
                    this.markAsSeen(unread);
                }, delay * 1000);
            }
        }
    },

    /**
     * Clear timeout on unmount
     */
    componentWillUnmount: function() {
        clearTimeout(this.markAsSeenTimeout);
    },

    /**
     * Called when user clicks on a notification
     *
     * @param  {Object} evt
     */
    handleNotificationClick: function(evt) {
        var notification = evt.target.props.notification;
        if (!notification.seen) {
            this.markAsSeen([ notification ]);
        }
    }
});

var sortNotifications = Memoize(function(notifications) {
    return _.orderBy(notifications, [ 'ctime' ], [ 'desc' ]);
});

var findUser = Memoize(function(users, notification) {
    if (notification) {
        return _.find(users, { id: notification.user_id });
    } else {
        return null;
    }
});
