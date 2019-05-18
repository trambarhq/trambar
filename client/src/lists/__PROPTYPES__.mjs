import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

import { BookmarkList } from './bookmark-list.jsx';
import { NotificationList } from './notification-list.jsx';
import { ReactionList } from './reaction-list.jsx';
import { StoryList } from './story-list.jsx';

BookmarkList.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    bookmarks: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object,
    project: PropTypes.object,
    highlightStoryID: PropTypes.number,
    scrollToStoryID: PropTypes.number,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
NotificationList.propTypes = {
    scrollToNotificationID: PropTypes.number,
    notifications: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
ReactionList.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    highlightReactionID: PropTypes.number,
    scrollToReactionID: PropTypes.number,
    story: PropTypes.object.isRequired,
    reactions: PropTypes.arrayOf(PropTypes.object),
    respondents: PropTypes.arrayOf(PropTypes.object),
    repo: PropTypes.object,
    currentUser: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onFinish: PropTypes.func,
};
StoryList.propTypes = {
    access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
    acceptNewStory: PropTypes.bool,
    highlightStoryID: PropTypes.number,
    scrollToStoryID: PropTypes.number,
    highlightReactionID: PropTypes.number,
    scrollToReactionID: PropTypes.number,
    stories: PropTypes.arrayOf(PropTypes.object),
    draftStories: PropTypes.arrayOf(PropTypes.object),
    pendingStories: PropTypes.arrayOf(PropTypes.object),
    currentUser: PropTypes.object,
    project: PropTypes.object,

    database: PropTypes.instanceOf(Database).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    route: PropTypes.instanceOf(Route).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
