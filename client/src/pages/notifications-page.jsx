import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as DateTracker from 'utils/date-tracker';
import * as UserFinder from 'objects/finders/user-finder';
import * as NotificationFinder from 'objects/finders/notification-finder';

// widgets
import PageContainer from 'widgets/page-container';
import NotificationList from 'lists/notification-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

require('./notifications-page.scss');

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
        let { database, route, env } = this.props;
        let db = database.use({ by: this });
        let props = {
            currentUser: null,
            notifications: null,

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
            if (route.params.date) {
                return NotificationFinder.findNotificationsForUserOnDate(db, props.currentUser, route.params.date).then((notifications) => {
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
            notification,
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
        let { route, notifications } = this.props;
        if (!_.isEmpty(notifications)) {
            return null;
        }
        if (!notifications) {
            // props.notifications is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            let phrase;
            if (params.date) {
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
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NotificationsPageSync.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
