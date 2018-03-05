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
var SmartList = require('widgets/smart-list');
var NotificationView = require('views/notification-view');
var NewItemsAlert = require('widgets/new-items-alert');

require('./notification-list.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationList',
    propTypes: {
        refreshList: PropTypes.bool,
        notifications: PropTypes.arrayOf(PropTypes.object),
        selectedNotificationId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelectionClear: PropTypes.func,
    },

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            users: null,

            selectedNotificationId: this.props.selectedNotificationId,
            notifications: this.props.notifications,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            refreshList: this.props.refreshList,

            onSelectionClear: this.props.onSelectionClear,
        };
        meanwhile.show(<NotificationListSync {...props} />, 100);
        return db.start().then((userId) => {
            // load authors of comments
            var criteria = {};
            criteria.id = _.uniq(_.map(props.notifications, 'user_id'));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return meanwhile.show(<NotificationListSync {...props} />);
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
        selectedNotificationId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelectionClear: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hiddenNotificationIds: [],
            selectedNotificationId: null,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var notifications = sortNotifications(this.props.notifications);
        var selectedNotificationId = this.state.selectedNotificationId || this.props.selectedNotificationId;
        var smartListProps = {
            items: notifications,
            behind: 20,
            ahead: 40,
            anchor: (selectedNotificationId) ? `notification-${selectedNotificationId}` : undefined,
            offset: 10,
            fresh: this.props.refreshList,

            onIdentity: this.handleNotificationIdentity,
            onRender: this.handleNotificationRender,
            onAnchorChange: this.handleNotificationAnchorChange,
            onBeforeAnchor: this.handleNotificationBeforeAnchor,
        };
        return (
            <div className="notification-list">
                <SmartList {...smartListProps} />
                {this.renderNewNotificationAlert()}
            </div>
        );
    },

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewNotificationAlert: function() {
        var t = this.props.locale.translate;
        var count = _.size(this.state.hiddenNotificationIds);
        var show = (count > 0);
        if (count) {
            this.previousHiddenNotificationCount = count;
        } else {
            // show the previous count as the alert transitions out
            count = this.previousHiddenNotificationCount || 0;
        }
        var props = {
            show: show,
            onClick: this.handleNewNotificationAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-notifications', count)}
            </NewItemsAlert>
        );
    },

    /**
     * Mark unread notification as seen after some time
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.notifications !== this.props.notifications || prevState.hiddenNotificationIds !== this.state.hiddenNotificationIds) {
            // need a small delay here, since hiddenNotificationIds isn't updated
            // until the SmartList's componentDidUpdate() is called
            setTimeout(() => {
                var unread = _.filter(this.props.notifications, (notification) => {
                    if (!notification.seen) {
                        if (!_.includes(this.state.hiddenNotificationIds, notification.id)) {
                            return true;
                        }
                    }
                });
                if (!_.isEmpty(unread)) {
                    var delay = Math.min(10, unread.length * 2);
                    clearTimeout(this.markAsSeenTimeout);
                    this.markAsSeenTimeout = setTimeout(() => {
                        this.markAsSeen(unread);
                    }, delay * 1000);
                }
            }, 50);
        }
    },

    /**
     * Clear timeout on unmount
     */
    componentWillUnmount: function() {
        clearTimeout(this.markAsSeenTimeout);
    },

    /**
     * Return id of notification view in response to event triggered by SmartList
     *
     * @type {String}
     */
    handleNotificationIdentity: function(evt) {
        return `notification-${evt.item.id}`;
    },

    /**
     * Render a notification in response to event triggered by SmartList
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleNotificationRender: function(evt) {
        if (evt.needed) {
            var notification = evt.item;
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
        } else {
            var height = evt.previousHeight || evt.estimatedHeight || 25;
            return <div className="notification-view" style={{ height }} />
        }
    },

    /**
     * Set seen flag of notifications to true
     *
     * @param  {Array<Notification>} notifications
     *
     * @return {Promise<Array>}
     */
    markAsSeen: function(notifications) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var notificationsAfter = _.map(notifications, (notification) => {
            return { id: notification.id, seen: true };
        });
        return db.save({ table: 'notification' }, notificationsAfter);
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
    },

    /**
     * Called when a different notification is shown at the top of the viewport
     *
     * @return {Object}
     */
    handleNotificationAnchorChange: function(evt) {
        var notificationId = _.get(evt.item, 'id');
        if (!notificationId || _.includes(this.state.hiddenNotificationIds, notificationId)) {
            this.setState({ hiddenNotificationIds: [] });
        }
        if (this.props.selectedNotificationId && notificationId !== this.props.selectedNotificationId) {
            if (this.props.onSelectionClear) {
                this.props.onSelectionClear({
                    type: 'selectionclear',
                    target: this,
                });
            }
        }
    },

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleNotificationBeforeAnchor: function(evt) {
        var notificationIds = _.map(evt.items, 'id');
        var hiddenNotificationIds = _.union(notificationIds, this.state.hiddenNotificationIds);
        this.setState({ hiddenNotificationIds });
    },

    /**
     * Called when user clicks on new notification alert
     *
     * @param  {Event} evt
     */
    handleNewNotificationAlertClick: function(evt) {
        this.setState({
            hiddenNotificationIds: [],
            selectedNotificationId: _.first(this.state.hiddenNotificationIds),
        });
    },
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
