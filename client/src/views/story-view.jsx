var React = require('react'), PropTypes = React.PropTypes;

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
        story: PropTypes.object.isRequired,
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,
        pending: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            pending: false,
        };
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
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        //console.log(`Rending ${this.props.story.id}`)
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
        var props = {
            story: this.props.story,
            authors: this.props.authors,
            pending: this.props.pending,
            cornerPopUp: this.renderPopUpMenu('main'),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
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
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
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
            story: this.props.story,
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
     * Save story to remote database
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    saveStory: function(story) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, story);
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
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
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
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then(() => {
            return db.remove({ table: 'bookmark' }, bookmarks);
        });
    },

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

    setOptions: function(options) {
        var before = this.state.options;
        this.setState({ options }, () => {
            if (options.editPost && !before.editPost) {
                var tempCopy = _.omit(this.props.story, 'id', 'published', 'ptime');
                tempCopy.published_version_id = this.props.story.id;
                this.saveStory(tempCopy);
            }
            if (!_.isEqual(options.bookmarkRecipients, before.bookmarkRecipients)) {
                this.sendBookmarks(this.props.story, options.bookmarkRecipients);
            }
            if (options.hidePost !== before.hidePost) {
                var story = _.clone(this.props.story);
                story.public = !options.hidePost;
                this.saveStory(story);
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
    addIssue: false,
    hidePost: false,
    editPost: false,
    bookmarkRecipients: [],
};
