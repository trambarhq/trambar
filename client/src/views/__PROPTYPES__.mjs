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
ReactionViewOptions.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    currentUser: PropTypes.object.isRequired,
    reaction: PropTypes.object.isRequired,
    story: PropTypes.object.isRequired,
    options: PropTypes.object.isRequired,

    env: PropTypes.instanceOf(Environment).isRequired,
};
ReactionView.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    highlighting: PropTypes.bool,
    reaction: PropTypes.object.isRequired,
    respondent: PropTypes.object,
    story: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
    repo: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};

StoryContents.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    story: PropTypes.object.isRequired,
    authors: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object.isRequired,
    reactions: PropTypes.arrayOf(PropTypes.object),
    repo: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
StoryView.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    highlighting: PropTypes.bool,
    pending: PropTypes.bool,
    story: PropTypes.object.isRequired,
    bookmark: PropTypes.object,
    highlightReactionID: PropTypes.number,
    scrollToReactionID: PropTypes.number,

    authors: PropTypes.arrayOf(PropTypes.object),
    reactions: PropTypes.arrayOf(PropTypes.object),
    respondents: PropTypes.arrayOf(PropTypes.object),
    bookmarks: PropTypes.arrayOf(PropTypes.object),
    recipients: PropTypes.arrayOf(PropTypes.object),
    repos: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object.isRequired,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
StoryViewOptions.propTypes = {
    section: PropTypes.oneOf([ 'main', 'both' ]),
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    story: PropTypes.object.isRequired,
    reactions: PropTypes.arrayOf(PropTypes.object),
    repos: PropTypes.arrayOf(PropTypes.object),
    bookmarks: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object.isRequired,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onComplete: PropTypes.func,
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
};
