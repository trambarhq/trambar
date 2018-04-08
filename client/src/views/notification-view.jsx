var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Link = require('widgets/link');
var Time = require('widgets/time');
var ProfileImage = require('widgets/profile-image');

require('./notification-view.scss');

module.exports = React.createClass({
    displayName: 'NotificationView',
    mixins: [ UpdateCheck ],
    propTypes: {
        notification: PropTypes.object.isRequired,
        user: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onClick: PropTypes.func,
    },

    /**
     * Render the component
     *
     * @return {ReactElement}
     */
    render: function() {
        var props = {
            className: `notification-view ${this.props.theme.mode}`,
            url: this.getNotificationURL(),
            target: this.getNotificationTarget(),
            onClick: this.handleClick,
        };
        if (!this.props.notification.seen) {
            props.className += ' unread';
        }
        return (
            <Link {...props}>
                <div className="event">
                    {this.renderProfileImage()}
                    {this.renderText()}
                </div>
                <div className="date">
                    {this.renderTime()}
                    {this.renderIcon()}
                </div>
            </Link>
        );
    },

    /**
     * Render the user's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
            user: this.props.user,
            theme: this.props.theme,
            size: 'small',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render a descript of what happened
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var text = this.getNotificationText();
        return <span className="text">{text}</span>;
    },

    /**
     * Render the time of the event
     *
     * @return {ReactElement}
     */
    renderTime: function() {
        var props = {
            time: this.props.notification.ctime,
            locale: this.props.locale,
        };
        return <Time {...props} />;
    },

    /**
     * Render a small icon indicating the notification type
     *
     * @return {ReactElement}
     */
    renderIcon: function() {
        return <i className={`fa fa-${this.getNotificationIcon()} fa-fw`}/>;
    },

    /**
     * Return URL that notification directs to
     *
     * @return {String}
     */
    getNotificationURL: function() {
        return getNotificationURL(this.props.notification, this.props.route);
    },

    /**
     * Return target window that notification directs to
     *
     * @return {String|undefined}
     */
    getNotificationTarget: function() {
        return getNotificationTarget(this.props.notification);
    },

    /**
     * Return text of the notification
     *
     * @return {String}
     */
    getNotificationText: function() {
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var user = this.props.user;
        var notification = this.props.notification;
        var name = (user) ? n(user.details.name, user.details.gender) : '';
        switch (notification.type) {
            case 'like':
                return t('notification-$name-likes-your-$story', name, notification.details.story_type);
            case 'comment':
                return t('notification-$name-commented-on-your-$story', name, notification.details.story_type);
            case 'issue':
                return t('notification-$name-opened-an-issue', name);
            case 'vote':
                return t('notification-$name-voted-in-your-survey', name);
            case 'task-completion':
                return t('notification-$name-completed-task', name);
            case 'coauthor':
                return t('notification-$name-added-you-as-coauthor', name);
            case 'note':
                return t('notification-$name-posted-a-note-about-your-$story', name, notification.details.story_type);
            case 'assignment':
                return t('notification-$name-is-assigned-to-your-issue', name);
            case 'push':
                return t('notification-$name-pushed-code-to-$branch', name, notification.details.branch);
            case 'merge':
                return t('notification-$name-merged-code-to-$branch', name, notification.details.branch);
            case 'survey':
                return t('notification-$name-posted-a-survey', name);
            case 'bookmark':
                return t('notification-$name-sent-bookmark-to-$story', name, notification.details.story_type);
            case 'mention':
                if (notification.details.story_type) {
                    return t('notification-$name-mentioned-you-in-$story', name, notification.details.story_type);
                } else if (notification.details.reaction_type) {
                    return t('notification-$name-mentioned-you-in-$reaction', name, notification.details.reaction_type);
                } else {
                    break;
                }
            case 'join-request':
                return t('notification-$name-requested-to-join', name);
        }
    },

    /**
     * Return Font Awesome class name
     *
     * @return {String}
     */
    getNotificationIcon: function() {
        var notification = this.props.notification;
        switch (notification.type) {
            case 'like': return 'thumbs-up';
            case 'comment': return 'comment';
            case 'issue': return 'exclamation-circle';
            case 'vote': return 'check-square-o';
            case 'task-completion': return 'star';
            case 'note': return 'sticky-note';
            case 'assignment': return 'hand-o-right';
            case 'push': 'cubes';
            case 'merge': 'cubes';
            case 'coauthor': return 'handshake-o';
            case 'survey': return 'list-url';
            case 'bookmark': return 'bookmark';
            case 'mention': return 'at';
            case 'join-request': return 'user-circle';
        }
    },

    /**
     * Called when click is clicked
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        if (this.props.onClick) {
            this.props.onClick({
                type: 'click',
                target: this,
            });
        }
    }
});

// these functions are needed for handling web and push alerts
module.exports.getNotificationURL = getNotificationURL;
module.exports.getNotificationTarget = getNotificationTarget;

function getNotificationURL(notification, route) {
    var params = _.clone(route.parameters);
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
            params.story = notification.story_id;
            params.reaction = notification.reaction_id || undefined;
            return route.find(require('pages/news-page'), params);
        case 'bookmark':
            params.story = notification.story_id;
            return route.find(require('pages/bookmarks-page'), params);
        case 'join-request':
            var projectId = _.get(notification, 'details.project_id');
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
