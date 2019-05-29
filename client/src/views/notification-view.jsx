import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { Time } from '../widgets/time.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';

import './notification-view.scss';

/**
 * Component for displaying a notification.
 */
function NotificationView(props) {
    const { route, env, user, notification, onClick } = props;

    const handleClick = useListener((evt) => {
        if (onClick) {
            onClick({  notification });
        }
    }, [ onClick ]);

    const classNames = [ 'notification-view' ];
    if (!notification.seen) {
        classNames.push('unread');
    }
    const linkProps = {
        className: classNames.join(' '),
        href: getNotificationURL(notification, route),
        target: getNotificationTarget(notification),
        onClick: handleClick,
    };
    return (
        <a {...linkProps}>
            <div className="event">
                {renderProfileImage()}
                {renderText()}
            </div>
            <div className="date">
                {renderTime()}
                {renderIcon()}
            </div>
        </a>
    );

    function renderProfileImage() {
        const props = { user, env, size: 'small' };
        return <ProfileImage {...props} />;
    }

    function renderText() {
        const text = getNotificationText(notification, user, env);
        return <span className="text">{text}</span>;
    }

    function renderTime() {
        const props = { time: notification.ctime, env };
        return <Time {...props} />;
    }

    function renderIcon() {
        let icon = getNotificationIcon(notification);
        return <i className={`fa fa-${icon} fa-fw`}/>;
    }
}

function getNotificationURL(notification, route) {
    let params = _.clone(route.params);
    switch (notification.type) {
        case 'like':
        case 'comment':
        case 'issue':
        case 'vote':
        case 'task-completion':
        case 'coauthor':
        case 'note':
        case 'assignment':
        case 'push':
        case 'merge':
        case 'survey':
        case 'issue':
        case 'mention':
            params.highlightStoryID = notification.story_id;
            params.highlightReactionID = notification.reaction_id || undefined;
            return route.find('news-page', params);
        case 'bookmark':
            params.highlightStoryID = notification.story_id;
            return route.find('bookmarks-page', params);
        case 'join-request':
            let projectId = _.get(notification, 'details.project_id');
            return `/admin/projects/${projectId}/members/`;
    }
}

function getNotificationTarget(notification) {
    switch (notification.type) {
        case 'join-request':
            return 'admin';
    }
    return '';
}

function getNotificationText(notification, user, env) {
    const { t, g } = env.locale;
    const {
        story_type: storyType,
        branch,
        reaction_type: reactionType
    } = notification.details;
    const name = UserUtils.getDisplayName(user, env);
    g(name, user.details.gender);
    switch (notification.type) {
        case 'like':
            return t('notification-$name-likes-your-$story', name, storyType);
        case 'comment':
            return t('notification-$name-commented-on-your-$story', name, storyType);
        case 'issue':
            return t('notification-$name-opened-an-issue', name);
        case 'vote':
            return t('notification-$name-voted-in-your-survey', name);
        case 'task-completion':
            return t('notification-$name-completed-task', name);
        case 'coauthor':
            return t('notification-$name-added-you-as-coauthor', name);
        case 'note':
            return t('notification-$name-posted-a-note-about-your-$story', name, storyType);
        case 'assignment':
            return t('notification-$name-is-assigned-to-your-$story', name, storyType || 'issue');
        case 'push':
            return t('notification-$name-pushed-code-to-$branch', name, branch);
        case 'merge':
            return t('notification-$name-merged-code-to-$branch', name, branch);
        case 'survey':
            return t('notification-$name-posted-a-survey', name);
        case 'bookmark':
            return t('notification-$name-sent-bookmark-to-$story', name, storyType);
        case 'mention':
            if (storyType) {
                return t('notification-$name-mentioned-you-in-$story', name, storyType);
            } else if (reactionType) {
                return t('notification-$name-mentioned-you-in-$reaction', name, reactionType);
            } else {
                break;
            }
        case 'join-request':
            return t('notification-$name-requested-to-join', name);
    }
}

function getNotificationIcon(notification) {
    switch (notification.type) {
        case 'like': return 'thumbs-up';
        case 'comment': return 'comment';
        case 'issue': return 'exclamation-circle';
        case 'vote': return 'check-square-o';
        case 'task-completion': return 'star';
        case 'note': return 'sticky-note';
        case 'assignment': return 'hand-o-right';
        case 'push': return 'cubes';
        case 'merge': return 'cubes';
        case 'coauthor': return 'handshake-o';
        case 'survey': return 'list-url';
        case 'bookmark': return 'bookmark';
        case 'mention': return 'at';
        case 'join-request': return 'user-circle';
    }
}

export {
    NotificationView as default,
    NotificationView,
};
