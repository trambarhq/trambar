var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Time = require('widgets/time');

require('./notification-view.scss');

module.exports = React.createClass({
    displayName: 'NotificationView',
    mixins: [ UpdateCheck ],
    propTypes: {
        reaction: PropTypes.object.isRequired,
        story: PropTypes.object,
        respondent: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render the component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className={`notification-view ${this.props.theme.mode}`}>
                <div className="event">
                    {this.renderProfileImage()}
                    {this.renderText()}
                </div>
                <div className="date">
                    {this.renderTime()}
                    {this.renderIcon()}
                </div>
            </div>
        );
    },

    /**
     * Render the respondent's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var resources = _.get(this.props.respondent, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 24, 24);
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    /**
     * Render a descript of what happened
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(_.get(this.props.respondent, 'details.name'));
        var reactionType = _.get(this.props.reaction, 'type');
        var storyType = _.get(this.props.story, 'type') || 'story';
        var text;
        switch (reactionType) {
            case 'like':
                text = t(`notification-$user-likes-your-${storyType}`, name);
                break;
            case 'comment':
                text = t(`notification-$user-commented-on-your-${storyType}`, name);
                break;
            case 'vote':
                text = t(`notification-$user-voted-in-your-survey`, name);
                break;
            case 'task-completion':
                text = t(`notification-$user-completed-task`, name);
                break;
        }
        return <span className="text">{text}</span>;
    },

    /**
     * Render the time of the event
     *
     * @return {ReactElement}
     */
    renderTime: function() {
        var props = {
            time: this.props.reaction.ptime,
            locale: this.props.locale,
        };
        return <Time {...props} />;
    },

    renderIcon: function() {
        var reactionType = _.get(this.props.reaction, 'type');
        var icon;
        switch (reactionType) {
            case 'like':
                icon = 'thumbs-up';
                break;
            case 'comment':
                icon = 'comment';
                break;
            case 'vote':
                icon = 'check-square-o';
                break;
            case 'task-completion':
                icon = 'star';
                break;
        }
        var classNames = [ 'fa', `fa-${icon}` ];
        return <i className={classNames.join(' ')}/>;
    }
});
