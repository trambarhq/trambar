var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./comment-view.scss');

module.exports = React.createClass({
    displayName: 'CommentView',
    mixins: [ UpdateCheck ],
    propTypes: {
        reaction: PropTypes.object.isRequired,
        respondent: PropTypes.object,
        currentUser: PropTypes.object.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div className="comment-view">
                {this.renderProfileImage()}
                {this.renderName()}
                {this.renderText()}
            </div>
        );
    },

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

    renderName: function() {
        var name = _.get(this.props.respondent, 'details.name');
        return <span className="name">{name}</span>;
    },

    renderText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = _.get(this.props.respondent, 'details.name', '');
        switch (this.props.reaction.type) {
            case 'like':
                return <span> {t('comment-likes-this-story', name)}</span>;
            case 'comment':
                var text = _.get(this.props.reaction, 'details.text');
                return <span>: {p(text)}</span>;
            case 'vote':
                return <span> {t('comment-cast-a-vote', name)}</span>;
            case 'task-completion':
                return <span> {t('comment-completed-a-task', name)}</span>;
        }
    },
});
