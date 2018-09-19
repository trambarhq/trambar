import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import Time from 'widgets/time';
import ProfileImage from 'widgets/profile-image';

import './notification-view.scss';

class NotificationView extends PureComponent {
    static displayName = 'NotificationView';

    static getNotificationURL(notification, route) {
        let params = _.clone(route.parameters);
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

    static getNotificationTarget(notification) {
        switch (notification.type) {
            case 'join-request':
                return 'admin';
        }
        return '';
    }

    /**
     * Render the component
     *
     * @return {ReactElement}
     */
    render() {
        let { notification } = this.props;
        let linkProps = {
            className: 'notification-view',
            href: this.getNotificationURL(),
            target: this.getNotificationTarget(),
            onClick: this.handleClick,
        };
        if (!notification.seen) {
            linkProps.className += ' unread';
        }
        return (
            <a {...linkProps}>
                <div className="event">
                    {this.renderProfileImage()}
                    {this.renderText()}
                </div>
                <div className="date">
                    {this.renderTime()}
                    {this.renderIcon()}
                </div>
            </a>
        );
    }

    /**
     * Render the user's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        let { env, user } = this.props;
        let props = {
            user,
            env,
            size: 'small',
        };
        return <ProfileImage {...props} />;
    }

    /**
     * Render a descript of what happened
     *
     * @return {ReactElement}
     */
    renderText() {
        let text = this.getNotificationText();
        return <span className="text">{text}</span>;
    }

    /**
     * Render the time of the event
     *
     * @return {ReactElement}
     */
    renderTime() {
        let { env, notification } = this.props;
        let props = {
            time: notification.ctime,
            env,
        };
        return <Time {...props} />;
    }

    /**
     * Render a small icon indicating the notification type
     *
     * @return {ReactElement}
     */
    renderIcon() {
        let icon = this.getNotificationIcon();
        return <i className={`fa fa-${icon} fa-fw`}/>;
    }

    /**
     * Return URL that notification directs to
     *
     * @return {String}
     */
    getNotificationURL() {
        let { notification, route } = this.props;
        return NotificationView.getNotificationURL(notification, route);
    }

    /**
     * Return target window that notification directs to
     *
     * @return {String|undefined}
     */
    getNotificationTarget() {
        let { notification, route } = this.props;
        return NotificationView.getNotificationTarget(notification);
    }

    /**
     * Return text of the notification
     *
     * @return {String}
     */
    getNotificationText() {
        let { env, notification, user }
        let { t, g } = env.locale;
        let { story_type: storyType,  branch, reaction_type: reactionType } = notification.details;
        let name = UserUtils.getDisplayName(user, env);
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
                return t('notification-$name-is-assigned-to-your-issue', name);
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

    /**
     * Return Font Awesome class name
     *
     * @return {String}
     */
    getNotificationIcon() {
        let { notification } = this.props;
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

    /**
     * Called when click is clicked
     *
     * @param  {Event} evt
     */
    handleClick = (evt) => {
        if (this.props.onClick) {
            this.props.onClick({
                type: 'click',
                target: this,
            });
        }
    }
}

export {
    NotificationView as default,
    NotificationView,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NotificationView.propTypes = {
        notification: PropTypes.object.isRequired,
        user: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClick: PropTypes.func,
    };
}
