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
        var profileImage = _.get(this.props.respondent, 'details.profile_image');
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
        var type = this.props.reaction.type;
        if (type === 'like') {
            return <span> likes this story</span>
        } else if (type === 'comment') {
            var p = this.props.locale.pick;
            var text = _.get(this.props.reaction, 'details.text');
            return <span>: {p(text)}</span>;
        }
    },
});
