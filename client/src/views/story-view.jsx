var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var IssueUtils = require('objects/utils/issue-utils');
var LinkUtils = require('objects/utils/link-utils');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var AuthorNames = require('widgets/author-names');
var StoryProgress = require('widgets/story-progress');
var StoryEmblem = require('widgets/story-emblem');
var Scrollable = require('widgets/scrollable');
var ReactionToolbar = require('widgets/reaction-toolbar');
var ReactionList = require('lists/reaction-list');
var HeaderButton = require('widgets/header-button');
var StoryContents = require('views/story-contents');
var StoryViewOptions = require('views/story-view-options');
var CornerPopUp = require('widgets/corner-pop-up');

require('./story-view.scss');

module.exports = React.createClass({
    displayName: 'StoryView',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            options: defaultOptions,
            commentsExpanded: this.shouldExpandComments(this.props),
            addingComment: _.some(this.props.reactions, {
                user_id: this.props.currentUserId,
                published: false
            }),
        };
        this.updateOptions(nextState, this.props);
        return nextState;
    },


    /**
     * Return true if comment should be expanded automatically
     *
     * @param  {Object} props
     *
     * @return {Boolean|undefined}
     */
    shouldExpandComments: function(props) {
        if (!props.reactions || !props.respondents) {
            return;
        }
        // expand automatically when it's the current user's story
        var currentUserId = _.get(this.props.currentUser, 'id');
        if (_.includes(props.story.user_ids, currentUserId)) {
            return true;
        }
        // expand automatically when the current user has reacted to story
        if (_.some(props.reactions, { user_id: currentUserId })) {
            return true;
        }
        return false;
    },

    /**
     * Update options when new data arrives from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story || this.props.recommendations !== nextProps.recommendations) {
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
        options.hidePost = !nextProps.story.public;
        options.bookmarkRecipients = _.map(nextProps.recommendations, 'target_user_id');
        options.issueDetails = IssueUtils.extract(nextProps.story, nextProps.repos);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        switch (this.props.theme.mode) {
            case 'single-col':
                return this.renderSingleColumn();
            case 'double-col':
                return this.renderDoubleColumn();
            case 'triple-col':
                return this.renderTripleColumn();
        }
    },

    /**
     * Render single-column view
     *
     * @return {ReactElement}
     */
    renderSingleColumn: function() {
        return (
            <div className="story-view single-col">
                <div className="header">
                    <div className="column-1">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                </div>
                <div className="header">
                    <div className="column-2">
                        {this.renderReactionToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {this.renderReactionAudioPlayer()}
                        {this.renderReactions()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render double-column view
     *
     * @return {ReactElement}
     */
    renderDoubleColumn: function() {
        return (
            <div className="story-view double-col">
                <div className="header">
                    <div className="column-1">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                    <div className="column-2">
                        {this.renderReactionToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderReactionAudioPlayer()}
                        {this.renderReactions()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render triple-column view
     *
     * @return {ReactElement}
     */
    renderTripleColumn: function() {
        var t = this.props.locale.translate;
        return (
            <div className="story-view triple-col">
                <div className="header">
                    <div className="column-1">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                    </div>
                    <div className="column-2">
                        {this.renderReactionToolbar()}
                    </div>
                    <div className="column-3">
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1">
                        {this.renderProgress()}
                        {this.renderEmblem()}
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderReactionAudioPlayer()}
                        {this.renderReactions()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render the author's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var leadAuthor = _.get(this.props.authors, 0);
        var props = {
            user: leadAuthor,
            theme: this.props.theme,
            size: 'medium',
        };
        if (leadAuthor) {
            props.href = this.props.route.find(require('pages/person-page'), {
                schema: this.props.route.parameters.schema,
                user: leadAuthor.id,
            });
        }
        return <ProfileImage {...props} />;
    },

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames: function() {
        var props = {
            authors: this.props.authors,
            locale: this.props.locale,
        };
        return <AuthorNames {...props} />;
    },

    /**
     * Render link and comment buttons on title bar
     *
     * @return {ReactElement}
     */
    renderReactionToolbar: function() {
        var props = {
            access: this.props.access,
            currentUser: this.props.currentUser,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            addingComment: this.state.addingComment,
            locale: this.props.locale,
            theme: this.props.theme,
            onAction: this.handleAction,
        };
        return <ReactionToolbar {...props} />;
    },

    /**
     * Render upload status or the publication time
     *
     * @return {ReactElement}
     */
    renderProgress: function() {
        var schema = this.props.route.parameters.schema;
        var uploadStatus = this.props.payloads.inquire(schema, this.props.story);
        var props = {
            status: this.props.status,
            story: this.props.story,
            locale: this.props.locale,
        };
        return <StoryProgress {...props} />;
    },

    /**
     * Render emblem
     *
     * @return {[type]}
     */
    renderEmblem: function() {
        var props = {
            story: this.props.story,
        };
        return <StoryEmblem {...props} />
    },

    /**
     * Render the main contents, including media attached to story
     *
     * @return {ReactElement}
     */
    renderContents: function() {
        var props = {
            story: this.props.story,
            authors: this.props.authors,
            currentUser: this.props.currentUser,
            reactions: this.props.reactions,
            repo: findRepo(this.props.repos, this.props.story),
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleStoryChange,
            onReaction: this.handleStoryReaction,
        };
        return <StoryContents {...props} />;
    },

    /**
     * Render reactions to story
     *
     * @return {ReactElement|null}
     */
    renderReactions: function() {
        if (this.props.theme.mode === 'single-col') {
            if (!this.state.commentsExpanded) {
                return null;
            }
        }
        if (!this.state.addingComment) {
            if (_.isEmpty(this.props.reactions)) {
                return null;
            }
        }
        var listProps = {
            access: this.props.access,
            showEditor: this.state.addingComment,
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            repo: this.props.repo,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onFinish: this.handleCommentFinish,
        };
        return (
            <Scrollable>
                <ReactionList {...listProps} />
            </Scrollable>
        );
    },

    renderReactionSpacer: function() {
        if (this.props.theme.mode === 'single-col') {
            if (!this.state.commentsExpanded) {
                return null;
            }
        }
        var count = _.size(this.props.reactions);
        if (this.state.addingComment) {
            count += 2;
        }
        if (count > 10) {
            count = 10;
        }
        if (count === 0) {
            return null;
        }
        var height = (count * 1.5) + 'em';
        return <div style={{ height }} />;
    },

    /**
     * Render audio player for audio in comments
     *
     * @return {ReactElement|null}
     */
    renderReactionAudioPlayer: function() {
        var url = this.state.selectedAudioUrl;
        if (!url) {
            return null;
        }
        return (
            <div className="audio-container">
                <audio src={url} controls />
            </div>
        )
    },

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu: function(section) {
        return (
            <CornerPopUp>
                {this.renderOptions(section)}
            </CornerPopUp>
        );
    },

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(section) {
        var props = {
            section,
            access: this.props.access,
            story: this.props.story,
            repos: this.props.repos,
            currentUser: this.props.currentUser,
            options: this.state.options,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
        };
        return <StoryViewOptions {...props} />;
    },

    /**
     * Save a story after a delay
     *
     * @param  {Story} story
     * @param  {Number} delay
     */
    autosaveStory: function(story, delay) {
        this.cancelAutosave();
        this.autosaveTimeout = setTimeout(() => {
            this.saveStory(story);
        }, delay);
        this.autosaveUnloadHandler = () => {
            this.saveStory(story);
        };
        window.addEventListener('beforeunload', this.autosaveUnloadHandler);
    },

    /**
     * Cancel any scheduled autosave operation
     */
    cancelAutosave: function() {
        if (this.autosaveTimeout) {
            clearTimeout(this.autosaveTimeout);
            this.autosaveTimeout = 0;
        }
        if (this.autosaveUnloadHandler) {
            window.removeEventListener('beforeunload', this.autosaveUnloadHandler);
            this.autosaveUnloadHandler = null;
        }
    },

    /**
     * Save story to remote database
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    saveStory: function(story) {
        this.cancelAutosave();

        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, story);
        });
    },

    /**
     * Remove story from remote database
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    removeStory: function(story) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    },

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction: function(reaction) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction);
        });
    },

    /**
     * Remove a reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction: function(reaction) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.removeOne({ table: 'reaction' }, reaction);
        });
    },

    /**
     * Save bookmarks to remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    saveBookmarks: function(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.save({ table: 'bookmark' }, bookmarks);
        });
    },

    /**
     * Remove bookmarks from remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    removeBookmarks: function(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.remove({ table: 'bookmark' }, bookmarks);
        });
    },

    /**
     * Send bookmarks to list of users
     *
     * @param  {Story} story
     * @param  {Array<Number>} recipientIds
     *
     * @return {Promise<Array<Bookmark>>}
     */
    sendBookmarks: function(story, recipientIds) {
        var bookmarks = this.props.recommendations;
        var newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIds, (recipientId) => {
            if (!_.some(bookmarks, { target_user_id: recipientId })) {
                var newBookmark = {
                    story_id: story.published_version_id || story.id,
                    user_ids: [ this.props.currentUser.id ],
                    target_user_id: recipientId,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        var redundantBookmarks = [];
        _.each(bookmarks, (bookmark) => {
            if (!_.includes(recipientIds, bookmark.target_user_id)) {
                redundantBookmarks.push(bookmark);
            }
        });
        return this.saveBookmarks(newBookmarks).then((newBookmarks) => {
            return this.removeBookmarks(redundantBookmarks).then((redundantBookmarks) => {
                return _.concat(newBookmarks, redundantBookmarks);
            });
        });
    },

    /**
     * Change options concerning a story
     *
     * @param  {Object} options
     */
    setOptions: function(options) {
        var before = this.state.options;
        this.setState({ options }, () => {
            var story = this.props.story;
            if (options.editPost && !before.editPost) {
                var tempCopy = _.omit(story, 'id', 'published', 'ptime');
                tempCopy.published_version_id = story.id;
                this.saveStory(tempCopy);
            }
            if (options.removePost && !before.removePost) {
                this.removeStory(story);
            }
            if (options.bumpPost && !before.bumpPost) {
                var columns = {
                    id: story.id,
                    bump: true
                };
                this.saveStory(columns);
            }
            if (options.hidePost !== before.hidePost) {
                var columns = {
                    id: story.id,
                    public: !options.hidePost
                };
                this.saveStory(columns);
            }
            if (!_.isEqual(options.issueDetails, before.issueDetails)) {
                var columns = {
                    id: story.id,
                    details: _.cloneDeep(story.details),
                    external: _.cloneDeep(story.external),
                };
                IssueUtils.attach(columns, options.issueDetails, this.props.currentUser, this.props.repos);
                this.saveStory(columns);
            }
            if (!_.isEqual(options.bookmarkRecipients, before.bookmarkRecipients)) {
                this.sendBookmarks(this.props.story, options.bookmarkRecipients);
            }
        });
    },

    /**
     * Called when user changes story (only task lists can change here)
     *
     * @param  {Object} evt
     */
    handleStoryChange: function(evt) {
        this.autosaveStory(evt.story, 1000);
    },

    /**
     * Called when user submits votes
     *
     * @param  {Object} evt
     */
    handleStoryReaction: function(evt) {
        this.saveReaction(evt.reaction);
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     */
    handleOptionsChange: function(evt) {
        this.setOptions(evt.options);
    },

    /**
     * Called when comment editing has ended
     *
     * @param  {Object} evt
     */
    handleCommentFinish: function(evt) {
        var hasDraft = _.some(this.props.reactions, (r) => {
            if (!r.published) {
                if (r.user_id === this.props.currentUser.id) {
                    return true;
                }
            }
        });
        if (!hasDraft) {
            this.setState({ addingComment: false });
        }
    },

    /**
     * Called when user initiates an action
     *
     * @param  {Object} evt
     */
    handleAction: function(evt) {
        switch (evt.action) {
            case 'like-add':
                var like = {
                    type: 'like',
                    story_id: this.props.story.id,
                    user_id: this.props.currentUser.id,
                    published: true,
                    public: true,
                };
                this.saveReaction(like);
                break;
            case 'like-remove':
                this.removeReaction(evt.like);
                break;
            case 'reaction-add':
                this.setState({
                    addingComment: true,
                    commentsExpanded: true
                });
                break;
            case 'reaction-expand':
                this.setState({
                    commentsExpanded: true
                });
                break;
        }
    }
});

var defaultOptions = {
    issueDetails: null,
    hidePost: false,
    editPost: false,
    removePost: false,
    bumpPost: false,
    bookmarkRecipients: [],
};

var findRepo = Memoize(function(repos, story) {
    return _.find(repos, (repo) => {
        var link = LinkUtils.find(story, {
            related_to: {
                object: repo,
                relation: 'project',
            }
        });
        return !!link;
    });
});
