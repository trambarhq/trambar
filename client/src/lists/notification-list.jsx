import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import Merger from 'data/merger';
import UserFinder from 'objects/finders/user-finder';
import StoryFinder from 'objects/finders/story-finder';

// widgets
import SmartList from 'widgets/smart-list';
import NotificationView from 'views/notification-view';
import NewItemsAlert from 'widgets/new-items-alert';

require('./notification-list.scss');

class NotificationList extends AsyncComponent {
    static displayName = 'NotificationList';

    /**
     * Extract id from URL hash
     *
     * @param  {String} hash
     *
     * @return {Object}
     */
    static parseHash(hash) {
        var notification, highlighting;
        if (notification = Route.parseId(hash, /N(\d+)/)) {
            highlighting = true;
        } else if (notification = Route.parseId(hash, /n(\d+)/)) {
            highlighting = false;
        }
        return { notification, highlighting };
    }

    /**
     * Get URL hash based on given parameters
     *
     * @param  {Object} params
     *
     * @return {String}
     */
    static getHash(params) {
        if (params.notification != undefined) {
            if (params.highlighting) {
                return `N${params.notification}`;
            } else {
                return `n${params.notification}`;
            }
        }
        return '';
    }

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            users: null,
            stories: null,

            currentUser: this.props.currentUser,
            notifications: this.props.notifications,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationListSync {...props} />);
        return db.start().then((userId) => {
            return UserFinder.findNotificationTriggerers(db, props.notifications).then((users) => {
                props.users = users;
            });
        }).then(() => {
            meanwhile.show(<NotificationListSync {...props} />);
            return StoryFinder.findStoriesOfNotifications(db, props.notifications, props.currentUser).then((stories) => {
                props.stories = stories;
            });
        }).then(() => {
            return <NotificationListSync {...props} />;
        })
    }
}

class NotificationListSync extends PureComponent {
    static displayName = 'NotificationList.Sync';

    constructor(props) {
        super(props);
        this.state = {
            hiddenNotificationIds: [],
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var notifications = sortNotifications(this.props.notifications);
        var anchor;
        var hashParams = NotificationList.parseHash(this.props.route.hash);
        if (hashParams.notification) {
            anchor = `notification-${hashParams.notification}`;
        }
        var smartListProps = {
            items: notifications,
            behind: 20,
            ahead: 40,
            anchor: anchor,
            offset: 10,

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
    }

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewNotificationAlert() {
        var t = this.props.locale.translate;
        var count = _.size(this.state.hiddenNotificationIds);
        var params = {
            notification: _.first(this.state.hiddenNotificationIds)
        };
        var props = {
            hash: NotificationList.getHash(params),
            route: this.props.route,
            onClick: this.handleNewNotificationAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-notifications', count)}
            </NewItemsAlert>
        );
    }

    /**
     * Schedule timeout function that marks notifications as read on mount
     */
    componentDidMount() {
        this.scheduleNotificationRead();
    }

    /**
     * Schedule timeout function that marks notifications as read when list changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.notifications !== this.props.notifications || prevState.hiddenNotificationIds !== this.state.hiddenNotificationIds) {
            this.scheduleNotificationRead();
        }
    }

    /**
     * Mark unread notification as read after some time
     */
    scheduleNotificationRead() {
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
                var delay = unread.length;
                if (delay > 5) {
                    delay = 5;
                } else if (delay < 2) {
                    delay = 2;
                }
                clearTimeout(this.markAsSeenTimeout);
                this.markAsSeenTimeout = setTimeout(() => {
                    this.markAsSeen(unread);
                }, delay * 1000);
            }
        }, 50);
    }

    /**
     * Clear timeout on unmount
     */
    componentWillUnmount() {
        clearTimeout(this.markAsSeenTimeout);
    }

    /**
     * Return id of notification view in response to event triggered by SmartList
     *
     * @type {String}
     */
    handleNotificationIdentity = (evt) => {
        return `notification-${evt.item.id}`;
    }

    /**
     * Render a notification in response to event triggered by SmartList
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleNotificationRender = (evt) => {
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
    }

    /**
     * Set seen flag of notifications to true
     *
     * @param  {Array<Notification>} notifications
     *
     * @return {Promise<Array>}
     */
    markAsSeen(notifications) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var notificationsAfter = _.map(notifications, (notification) => {
            return { id: notification.id, seen: true };
        });
        return db.save({ table: 'notification' }, notificationsAfter);
    }

    /**
     * Called when user clicks on a notification
     *
     * @param  {Object} evt
     */
    handleNotificationClick = (evt) => {
        var notification = evt.target.props.notification;
        if (!notification.seen) {
            this.markAsSeen([ notification ]);
        }
    }

    /**
     * Called when a different notification is shown at the top of the viewport
     *
     * @return {Object}
     */
    handleNotificationAnchorChange = (evt) => {
        var params = {
            notification: _.get(evt.item, 'id')
        };
        var hash = NotificationList.getHash(params);
        this.props.route.reanchor(hash);
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleNotificationBeforeAnchor = (evt) => {
        var hiddenNotificationIds = _.map(evt.items, 'id');
        this.setState({ hiddenNotificationIds });
    }

    /**
     * Called when user clicks on new notification alert
     *
     * @param  {Event} evt
     */
    handleNewNotificationAlertClick = (evt) => {
        this.setState({ hiddenNotificationIds: [] });
    }
}

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

export {
    NotificationList as default,
    NotificationList,
    NotificationListSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Notification.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
    NotificationListSync.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
