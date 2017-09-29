var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var MediaView = require('views/media-view');
var Time = require('widgets/time');

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

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="comment-view">
                <div className="profile-image-column">
                    {this.renderProfileImage()}
                </div>
                <div className="contents-column">
                    <div className="text">
                        {this.renderTime()}
                        {this.renderText()}
                    </div>
                    {this.renderMedia()}
                </div>
            </div>
        );
    },

    /**
     * Render profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
            user: this.props.respondent,
            theme: this.props.theme,
            size: 'small'
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render user name and text
     *
     * @return {ReactElement}
     */
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
                            case 'merge':
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

    /**
     * Render the publication time
     *
     * @return {ReactElement}
     */
    renderTime: function() {
        var props = {
            time: this.props.reaction.ptime,
            locale: this.props.locale,
        };
        return <Time {...props} />
    },

    /**
     * Render attached media
     *
     * @return {ReactElement}
     */
    renderMedia: function() {
        var resources = _.get(this.props.reaction, 'details.resources');
        if (_.isEmpty(resources)) {
            return null;
        }
        var props = {
            locale: this.props.locale,
            theme: this.props.theme,
            resources,
        };
        return <div className="media"><MediaView {...props} /></div>;
    },
});
