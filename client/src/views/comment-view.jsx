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
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        repo: PropTypes.object,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div className="comment-view">
                {this.renderProfileImage()}
                {this.renderText()}
            </div>
        );
    },

    renderProfileImage: function() {
        var resources = _.get(this.props.respondent, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, { width: 24, height: 24 });
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
    },

    renderText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(_.get(this.props.respondent, 'details.name'));
        if (this.props.reaction.published) {
            switch (this.props.reaction.type) {
                case 'like':
                    return (
                        <span className="like">
                            {t('comment-$user-likes-this', name)}
                        </span>
                    );
                case 'comment':
                    var text = _.get(this.props.reaction, 'details.text');
                    return (
                        <span className="comment">
                            {name}: {p(text)}
                        </span>
                    );
                case 'vote':
                    return (
                        <span className="vote">
                            {t('comment-$user-cast-a-vote', name)}
                        </span>
                    );
                    return ;
                case 'task-completion':
                    return (
                        <span className="task-completion">
                            {t('comment-$user-completed-a-task', name)}
                        </span>
                    );
                case 'note':
                    var storyType = this.props.story.type;
                    var baseUrl = _.get(this.props.repo, 'details.web_url');
                    var url;
                    if (baseUrl) {
                        var noteId = this.props.reaction.external_id;
                        switch (storyType) {
                            case 'push':
                                // there's no mechanism for retrieving the note id of
                                // commit comments
                                var commitId = this.props.reaction.details.commit_id;
                                url = `${baseUrl}/commit/${commitId}/`;
                                break;
                            case 'issue':
                                var issueId = this.props.story.details.number;
                                url = `${baseUrl}/issues/${issueId}#note_${noteId}`;
                                break;
                            case 'merge-request':
                                var mergeRequestId = this.props.story.details.number;
                                url = `${baseUrl}/merge_requests/${mergeRequestId}#note_${noteId}`;
                                break;
                        }
                    }
                    return (
                        <a className="note" href={url} target="_blank">
                            {t(`comment-$user-commented-on-${storyType}`, name)}
                        </a>
                    );
                case 'assignment':
                    var baseUrl = _.get(this.props.repo, 'details.web_url');
                    var url;
                    if (baseUrl) {
                        var issueId = this.props.story.details.number;
                        url = `${baseUrl}/issues/${issueId}`;
                    }
                    return (
                        <a className="issue-assignment" href={url} target="_blank">
                            {t('comment-$user-is-assigned-to-issue', name)}
                        </a>
                    );
            }
        } else {
            return (
                <span className="in-progress">
                    {t('comment-$user-is-typing', name)}
                </span>
            );
        }
    },
});
