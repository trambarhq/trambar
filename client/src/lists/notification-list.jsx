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

require('./notification-list.scss');

class NotificationList extends AsyncComponent {
    static displayName = 'NotificationList';

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            currentUser,
            notifications,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            users: null,
            stories: null,

            currentUser,
            notifications,
            database,
            route,
            env,
        };
        meanwhile.show(<NotificationListSync {...props} />);
        return db.start().then((userID) => {
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
            hiddenNotificationIDs: [],
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, notifications } = this.props;
        let notificationID = route.params.showingNotification || route.params.highlightingNotification;
        let smartListProps = {
            items: sortNotifications(notifications),
            behind: 20,
            ahead: 40,
            anchor: (notificationID) ? `notification-${notificationID}` : undefined,
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
        this.scheduleNotificationRead();
    }

    /**
     * Schedule timeout function that marks notifications as read when list changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { notifications } = this.props;
        let { hiddenNotificationIDs } = this.state;
        if (prevProps.notifications !== notifications || prevState.hiddenNotificationIDs !== hiddenNotificationIDs) {
            this.scheduleNotificationRead();
        }
    }

    /**
     * Mark unread notification as read after some time
     */
    scheduleNotificationRead() {
        let { notifications } = this.props;
        let { hiddenNotificationIDs } = this.state;
        // need a small delay here, since hiddenNotificationIDs isn't updated
        // until the SmartList's componentDidUpdate() is called
        setTimeout(() => {
            let unread = _.filter(notifications, (notification) => {
                if (!notification.seen) {
                    if (!_.includes(hiddenNotificationIDs, notification.id)) {
                        return true;
                    }
                }
            });
            if (!_.isEmpty(unread)) {
                let delay = unread.length;
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
            return <NotificationView key={notification.id} {...props} />;
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
        // TODO
        /*
        let params = {
            notification: _.get(evt.item, 'id')
        };
        let hash = NotificationList.getHash(params);
        this.props.route.reanchor(hash);
        */
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

    Notification.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NotificationListSync.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
