import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';

import { AppComponent } from './app-component.jsx';
import { BookmarkView } from './bookmark-view.jsx';
import { MediaView } from './media-view.jsx';
import { NotificationView } from './notification-view.jsx';

AppComponent.propTypes = {
    component: PropTypes.object.isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    onSelect: PropTypes.func,
};
BookmarkView.propTypes = {
    highlighting: PropTypes.bool,
    bookmark: PropTypes.object,
    senders: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
MediaView.propTypes = {
    resources: PropTypes.arrayOf(PropTypes.object).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    width: PropTypes.number.isRequired,
};
NotificationView.propTypes = {
    notification: PropTypes.object.isRequired,
    user: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onClick: PropTypes.func,
};

UserStatistics.propTypes = {
    chartType: PropTypes.oneOf([ 'bar', 'line', 'pie' ]),
    chartRange: PropTypes.oneOf([ 'biweekly', 'monthly', 'full' ]),
    dailyActivities: PropTypes.object,
    selectedDate: PropTypes.string,
    user: PropTypes.object,

    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
UserViewOptions.propTypes = {
    section: PropTypes.oneOf([ 'main', 'statistics', 'both' ]),
    user: PropTypes.object,
    options: PropTypes.object.isRequired,
    selectedDate: PropTypes.string,

    env: PropTypes.instanceOf(Environment).isRequired,

    onChange: PropTypes.func,
    onComplete: PropTypes.func,
};
UserView.propTypes = {
    user: PropTypes.object,
    roles: PropTypes.arrayOf(PropTypes.object),
    stories: PropTypes.arrayOf(PropTypes.object),
    options: PropTypes.object.isRequired,
    dailyActivities: PropTypes.object,
    currentUser: PropTypes.object,
    selectedDate: PropTypes.string,
    search: PropTypes.string,
    link: PropTypes.oneOf([ 'user', 'team' ]),

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onOptionChange: PropTypes.func,
};
