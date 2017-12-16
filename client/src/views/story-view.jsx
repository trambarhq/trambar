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
var StoryContents = require('views/story-contents');
var StoryComments = require('views/story-comments');
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
        if (this.props.theme.mode === 'columns-1') {
            return (
                <div className="story-view columns-1">
                    {this.renderContents()}
                    {this.renderComments()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderComments()}
                    </div>
                </div>
            );
        } else if (this.props.theme.mode === 'columns-3') {
            return (
                <div className="story-view columns-3">
                    <div className="column-1">
                        {this.renderContents()}
                    </div>
                    <div className="column-2">
                        {this.renderComments()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            );
        }
    },

    /**
     * Render the main contents, including media attached to story
     *
     * @return {ReactElement}
     */
    renderContents: function() {
        var schema = this.props.route.parameters.schema;
        var uploadStatus = this.props.payloads.inquire(schema, this.props.story);
        var props = {
            access: this.props.access,
            story: this.props.story,
            authors: this.props.authors,
            currentUser: this.props.currentUser,
            reactions: this.props.reactions,
            repo: findRepo(this.props.repos, this.props.story),
            cornerPopUp: this.renderPopUpMenu('main'),
            status: uploadStatus,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleStoryChange,
            onReaction: this.handleStoryReaction,
        };
        return <StoryContents {...props} />;
    },

    /**
     * Render comments panel
     *
     * @return {ReactElement}
     */
    renderComments: function() {
        var props = {
            access: this.props.access,
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            repo: findRepo(this.props.repos, this.props.story),
            currentUser: this.props.currentUser,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryComments {...props} />;
    },

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu: function(section) {
        if (this.props.theme.mode === 'columns-3') {
            return null;
        }
        return (
            <CornerPopUp>
                {this.renderOptions(true, section)}
            </CornerPopUp>
        );
    },

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {Boolean} inMenu
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(inMenu, section) {
        var props = {
            inMenu,
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
