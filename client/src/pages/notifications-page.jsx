import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import DateTracker from 'utils/date-tracker';
import UserFinder from 'objects/finders/user-finder';
import NotificationFinder from 'objects/finders/notification-finder';

// widgets
import PageContainer from 'widgets/page-container';
import NotificationList from 'lists/notification-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

require('./notifications-page.scss');

class NotificationsPage extends AsyncComponent {
    static displayName = 'NotificationsPage';

    /**
     * Match current URL against the page's
     *
     * @param  {String} path
     * @param  {Object} query
     *
     * @return {Object|null}
     */
    static parseURL(path, query) {
        return Route.match(path, [
            '/:schema/notifications/:date/?',
            '/:schema/notifications/?'
        ], (params) => {
            return {
                schema: params.schema,
                date: Route.parseDate(params.date),
            };
        })
    }

    /**
     * Generate a URL of this page based on given parameters
     *
     * @param  {Object} params
     *
     * @return {Object}
     */
    static getURL(params) {
        var path = `/${params.schema}/notifications/`, query;
        if (params.date != undefined) {
            path += `${params.date || 'date'}/`;
        }
        return { path, query };
    }

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        var params = currentRoute.parameters;
        var route = {
            schema: params.schema,
        };
        var statistics = {
            type: 'daily-notifications',
            schema: params.schema,
            user_id: 'current'
        };
        return {
            calendar: { route, statistics },
            navigation: { route, section: 'notifications' }
        };
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
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
        meanwhile.show(<NotificationsPageSync {...props} />);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            if (params.date) {
                return NotificationFinder.findNotificationsForUserOnDate(db, props.currentUser, params.date).then((notifications) => {
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
        var listProps = {
            notifications: this.props.notifications,
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NotificationList {...listProps} />;
    }

    /**
     * Render a message if there're no notifications
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
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
    }
}

export {
    NotificationsPage as default,
    NotificationsPage,
    NotificationsPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationsPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
    NotificationsPageSync.propTypes = {
        notifications: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
