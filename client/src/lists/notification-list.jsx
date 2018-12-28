import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import Merger from 'data/merger';
import * as UserFinder from 'objects/finders/user-finder';
import * as StoryFinder from 'objects/finders/story-finder';

// widgets
import SmartList from 'widgets/smart-list';
import NotificationView from 'views/notification-view';
import NewItemsAlert from 'widgets/new-items-alert';
import ErrorBoundary from 'widgets/error-boundary';

import './notification-list.scss';

const minimumSeenDelay = 3000;
const maximumSeenDelay = 5000;
const delayPerNotification = 1500;

/**
 * Asynchronous component that retrieves data needed by a notification list
 * (in addition to the notifications given to it)
 *
 * @extends AsyncComponent
 */
class NotificationList extends AsyncComponent {
    static displayName = 'NotificationList';

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { currentUser, notifications } = this.props;
        let { scrollToNotificationID } = this.props;
        let db = database.use({ by: this });
        let props = {
            currentUser,
            notifications,
            database,
            route,
            env,
            scrollToNotificationID,
        };
        meanwhile.show(<NotificationListSync {...props} />);
        let currentUserID = await db.start();
        props.users = await UserFinder.findNotificationTriggerers(db, props.notifications);
        meanwhile.show(<NotificationListSync {...props} />);
        props.stories = await StoryFinder.findStoriesOfNotifications(db, props.notifications, props.currentUser);
        return <NotificationListSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the list, with the help of
 * SmartList.
 *
 * @extends PureComponent
 */
class NotificationListSync extends PureComponent {
    static displayName = 'NotificationListSync';

    constructor(props) {
        super(props);
        this.state = {
            hiddenNotificationIDs: [],
        };
        this.notificationViewDurations = {};
        this.notificationViewInterval = 0;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, notifications, scrollToNotificationID } = this.props;
        let anchorNotificationID = scrollToNotificationID;
        let smartListProps = {
            items: sortNotifications(notifications),
            behind: 20,
            ahead: 40,
            anchor: (anchorNotificationID) ? `notification-${anchorNotificationID}` : undefined,
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
        let { route, env } = this.props;
        let { hiddenNotificationIDs } = this.state;
        let { t } = env.locale;
        let count = _.size(hiddenNotificationIDs);
        let url;
        if (!_.isEmpty(hiddenNotificationIDs)) {
            url  = route.find(route.name, {
                highlightingNotification: _.first(hiddenNotificationIDs)
            });
        }
        let props = { url, onClick: this.handleNewNotificationAlertClick };
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
        this.notificationViewInterval = setInterval(this.updateNotificationView.bind(this), 250);
    }

    /**
     * Clear timeout on unmount
     */
    componentWillUnmount() {
        clearInterval(this.notificationViewInterval);
    }

    /**
     * Mark unread notification as read after some time
     */
    updateNotificationView() {
        let { env, notifications } = this.props;
        let { hiddenNotificationIDs } = this.state;
        if (!env.focus || !env.visible)  {
            return;
        }
        let unread = _.filter(notifications, (notification) => {
            if (!notification.seen) {
                if (!_.includes(hiddenNotificationIDs, notification.id)) {
                    return true;
                }
            }
        });

        // remove the one that have appeared recently
        let maximumDuration = 0;
        _.remove(unread, (notification) => {
            let viewDuration = this.notificationViewDurations[notification.id] || 0;
            viewDuration += 250;
            this.notificationViewDurations[notification.id] = viewDuration;
            if (viewDuration < minimumSeenDelay) {
                return true;
            }
        });
        if (_.isEmpty(unread)) {
            return;
        }

        // what the require view duration ought to be--the more notifications
        // there are, the longer it is
        let requiredDuration = unread.length * delayPerNotification;
        if (requiredDuration < minimumSeenDelay) {
            requiredDuration = minimumSeenDelay;
        } else if (requiredDuration > maximumSeenDelay) {
            requiredDuration = maximumSeenDelay;
        }
        let allReady = _.every(unread, (notification) => {
            let viewDuration = this.notificationViewDurations[notification.id] || 0;
            return (viewDuration > requiredDuration);
        })
        if (allReady) {
            this.markAsSeen(unread);
        }
    }

    /**
     * Change the URL hash so page is anchor at given notification
     *
     * @param  {Number|undefined} scrollToNotificationID
     */
    reanchorAtNotification(scrollToNotificationID) {
        let { route } = this.props;
        let params = {
            scrollToNotificationID
        };
        route.reanchor(params);
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
        let { database, route, env, users } = this.props;
        if (evt.needed) {
            let notification = evt.item;
            let user = findUser(users, notification);
            let props = {
                notification,
                user,
                database,
                route,
                env,
                onClick: this.handleNotificationClick,
            };
            return (
                <ErrorBoundary env={env}>
                    <NotificationView key={notification.id} {...props} />
                </ErrorBoundary>
            );
        } else {
            let height = evt.previousHeight || evt.estimatedHeight || 25;
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
        let { database } = this.props;
        let db = database.use({ by: this });
        let notificationsAfter = _.map(notifications, (notification) => {
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
        let notification = evt.target.props.notification;
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
        this.reanchorAtNotification((evt.item) ? evt.item.id : undefined)
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleNotificationBeforeAnchor = (evt) => {
        let hiddenNotificationIDs = _.map(evt.items, 'id');
        this.setState({ hiddenNotificationIDs });
    }

    /**
     * Called when user clicks on new notification alert
     *
     * @param  {Event} evt
     */
    handleNewNotificationAlertClick = (evt) => {
        this.setState({ hiddenNotificationIDs: [] });
    }
}

const sortNotifications = memoizeWeak(null, function(notifications) {
    return _.orderBy(notifications, [ 'ctime' ], [ 'desc' ]);
});

const findUser = memoizeWeak(null, function(users, notification) {
    if (notification) {
        return _.find(users, { id: notification.user_id });
    }
});

export {
    NotificationList as default,
    NotificationList,
    NotificationListSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationList.propTypes = {
        scrollToNotificationID: PropTypes.number,
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NotificationListSync.propTypes = {
        scrollToNotificationID: PropTypes.number,
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
