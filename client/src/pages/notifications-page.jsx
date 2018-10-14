import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'objects/finders/user-finder';
import * as NotificationFinder from 'objects/finders/notification-finder';

// widgets
import PageContainer from 'widgets/page-container';
import NotificationList from 'lists/notification-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './notifications-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Notifications page.
 *
 * @extends AsyncComponent
 */
class NotificationsPage extends AsyncComponent {
    static displayName = 'NotificationsPage';

    /**
     * Render the component asynchronously
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
            date,
            highlightNotificationID,
            scrollToNotificationID,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            currentUser: null,
            notifications: null,

            date,
            highlightNotificationID,
            scrollToNotificationID,
            database,
            route,
            env,
        };
        meanwhile.show(<NotificationsPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            if (date) {
                return NotificationFinder.findNotificationsForUserOnDate(db, props.currentUser, date).then((notifications) => {
                    props.notifications = notifications;
                });
            } else {
                return NotificationFinder.findNotificationsForUser(db, props.currentUser).then((notifications) => {
                    props.notifications = notifications;
                });
            }
        }).then(() => {
            return <NotificationsPageSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the Notifications page.
 *
 * @extends PureComponent
 */
class NotificationsPageSync extends PureComponent {
    static displayName = 'NotificationsPage.Sync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <PageContainer className="notifications-page">
                {this.renderList()}
                {this.renderEmptyMessage()}
            </PageContainer>
        );
    }

    /**
     * Render list of notifications
     *
     * @return {ReactElement}
     */
    renderList() {
        let {
            database,
            route,
            env,
            notifications,
            currentUser,
        } = this.props;
        let listProps = {
            notifications,
            currentUser,
            database,
            route,
            env,
        };
        return <NotificationList {...listProps} />;
    }

    /**
     * Render a message if there're no notifications
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        let { env, notifications, date } = this.props;
        if (!_.isEmpty(notifications)) {
            return null;
        }
        if (!notifications) {
            // props.notifications is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            let phrase;
            if (date) {
                phrase = 'notifications-no-notifications-on-date';
            } else {
                phrase = 'notifications-no-notifications-yet';
            }
            let props = { phrase, env };
            return <EmptyMessage {...props} />;
        }
    }
}

export {
    NotificationsPage as default,
    NotificationsPage,
    NotificationsPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationsPage.propTypes = {
        date: PropTypes.string,
        highlightNotificationID: PropTypes.number,
        scrollToNotificationID: PropTypes.number,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NotificationsPageSync.propTypes = {
        date: PropTypes.string,
        highlightNotificationID: PropTypes.number,
        scrollToNotificationID: PropTypes.number,
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
