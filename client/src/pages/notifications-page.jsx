import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as NotificationFinder from 'common/objects/finders/notification-finder.mjs';

// widgets
import PageContainer from '../widgets/page-container.jsx';
import NotificationList from '../lists/notification-list.jsx';
import LoadingAnimation from '../widgets/loading-animation.jsx';
import EmptyMessage from '../widgets/empty-message.jsx';

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
    async renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            date,
            scrollToNotificationID,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            date,
            scrollToNotificationID,
            database,
            route,
            env,
        };
        meanwhile.show(<NotificationsPageSync {...props} />);
        let currentUserID = await db.start();
        props.currentUser = await UserFinder.findUser(db, currentUserID);
        if (date) {
            props.notifications = await NotificationFinder.findNotificationsForUserOnDate(db, props.currentUser, date);
        } else {
            props.notifications = await NotificationFinder.findNotificationsForUser(db, props.currentUser);
        }
        return <NotificationsPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Notifications page.
 *
 * @extends PureComponent
 */
class NotificationsPageSync extends PureComponent {
    static displayName = 'NotificationsPageSync';

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
            scrollToNotificationID,
        } = this.props;
        let listProps = {
            notifications,
            currentUser,
            database,
            route,
            env,
            scrollToNotificationID,
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

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationsPage.propTypes = {
        date: PropTypes.string,
        scrollToNotificationID: PropTypes.number,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NotificationsPageSync.propTypes = {
        date: PropTypes.string,
        scrollToNotificationID: PropTypes.number,
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
