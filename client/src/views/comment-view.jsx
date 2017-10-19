var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var MediaView = require('views/media-view');
var Time = require('widgets/time');
var CommentViewOptions = require('views/comment-view-options');

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

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var nextState = {
            options: defaultOptions
        };
        this.updateOptions(nextState, this.props);
        return nextState;
    },

    /**
     * Update options when new data arrives from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.reaction !== nextProps.reaction) {
            this.updateOptions(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions: function(nextState, nextProps) {
        var options = nextState.options = _.clone(nextState.options);
        options.hideReaction = !nextProps.reaction.public;
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
                        {this.renderOptionButton()}
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
        if (this.props.respondent) {
            var route = this.props.route;
            var url = require('pages/person-page').getUrl({
                server: route.parameters.server,
                schema: route.parameters.schema,
                user: this.props.respondent.id,
            });
        }
        return <a href={url}><ProfileImage {...props} /></a>;
    },

    /**
     * Render user name and text
     *
     * @return {ReactElement}
     */
    renderText: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var reaction = this.props.reaction;
        var story = this.props.story;
        var name = p(_.get(this.props.respondent, 'details.name'));
        if (reaction.published) {
            switch (reaction.type) {
                case 'like':
                    return (
                        <span className="like">
                            {t('comment-$user-likes-this', name)}
                        </span>
                    );
                case 'comment':
                    var text = _.get(reaction, 'details.text');
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
                    var baseUrl = _.get(this.props.repo, 'details.web_url');
                    var url;
                    if (baseUrl) {
                        var noteId = reaction.external_id;
                        switch (story.type) {
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
                            {t(`comment-$user-commented-on-${story.type}`, name)}
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
            var action = (reaction.ptime) ? 'editing' : 'writing';
            return (
                <span className="in-progress">
                    {t(`comment-$user-is-${action}`, name)}
                </span>
            );
        }
    },

    /**
     * Render option button
     *
     * @return {ReactElement}
     */
    renderOptionButton: function() {
        var props = {
            currentUser: this.props.currentUser,
            reaction: this.props.reaction,
            story: this.props.story,
            locale: this.props.locale,
            theme: this.props.theme,
            options: this.state.options,
            onChange: this.handleOptionsChange,
        };
        return <CommentViewOptions {...props} />;
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

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction: function(reaction) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction);
        });
    },

    /**
     * Remove reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction: function(reaction) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    },

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions: function(options) {
        var before = this.state.options;
        this.setState({ options }, () => {
            if (options.editReaction && !before.editReaction) {
                var reaction = _.clone(this.props.reaction);
                reaction.published = false;
                this.saveReaction(reaction);
            }
            if (options.removeReaction && !before.removeReaction) {
                this.removeReaction(this.props.reaction);
            }
            if (options.hideReaction !== before.hideReaction) {
                var reaction = _.clone(this.props.reaction);
                reaction.public = !options.hideReaction;
                this.saveReaction(reaction);
            }
        });
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        this.setOptions(evt.options);
    },
});

var defaultOptions = {
    hideReaction: false,
    editReaction: false,
    removeReaction: false,
};
