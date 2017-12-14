var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryTextEditor = require('editors/story-text-editor');
var StoryMediaPreview = require('editors/story-media-preview');
var StoryTextPreview = require('editors/story-text-preview');
var StoryEditorOptions = require('editors/story-editor-options');
var CornerPopUp = require('widgets/corner-pop-up');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

require('./story-editor.scss');

const AUTOSAVE_DURATION = 2000;

module.exports = React.createClass({
    displayName: 'StoryEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object,
        authors: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),
        isStationary: PropTypes.bool,

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
            isStationary: false
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var nextState = {
            options: defaultOptions,
            selectedResourceIndex: undefined,
            draft: null,
            confirming: false,
            action: null,
        };
        this.updateDraft(nextState, this.props);
        this.updateOptions(nextState, this.props);
        this.updateLeadAuthor(nextState, this.props);
        return nextState;
    },

    /**
     * Return true if the current user is coauthoring this article
     *
     * @return {Boolean}
     */
    isCoauthoring: function() {
        var userIds = _.get(this.props.story, 'user_ids');
        var currentUserId = _.get(this.props.currentUser, 'id');
        var index = _.indexOf(userIds, currentUserId);
        return (index > 0);
    },

    /**
     * Update state when certain props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.story !== nextProps.story) {
            this.updateDraft(nextState, nextProps);
        }
        if (this.props.currentUser !== nextProps.currentUser) {
            this.updateLeadAuthor(nextState, nextProps);
        }
        if (this.props.story !== nextProps.story || this.props.recommendations !== nextProps.recommendations || this.props.locale !== nextProps.locale) {
            this.updateOptions(nextState, nextProps);
        }
        var changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update state.draft based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateDraft: function(nextState, nextProps) {
        if (nextProps.story) {
            // check if the newly arriving story isn't the one we saved earlier
            var priorDraft = this.props.story || createBlankStory(this.props.currentUser);
            var currentDraft = nextState.draft;
            var nextDraft = nextProps.story;
            if (currentDraft !== priorDraft && currentDraft) {
                // merge changes into the remote copy
                // (properties in nextDraft are favored in conflicts)
                nextDraft = Merger.mergeObjects(currentDraft, nextDraft, priorDraft);
            }
            nextState.draft = nextDraft;
        } else {
            nextState.draft = createBlankStory(nextProps.currentUser);
        }
    },

    /**
     * Update state.draft.user_ids
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateLeadAuthor: function(nextState, nextProps) {
        if (!nextState.story) {
            var currentUserId = _.get(nextProps.currentUser, 'id');
            if (!nextState.draft.user_ids) {
                nextState.draft = _.decouple(nextState.draft, 'user_ids', []);
                nextState.draft.user_ids[0] = currentUserId;
            }
        }
    },

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions: function(nextState, nextProps) {
        var options = nextState.options;
        if (!nextProps.story) {
            // reset options to default when a new story starts
            options = defaultOptions;
        }
        options = nextState.options = _.clone(options);
        options.hidePost = !nextState.draft.public;
        options.bookmarkRecipients = _.map(nextProps.recommendations, 'target_user_id');
        if (!options.preview) {
            options.preview = this.choosePreview(nextState.draft);
        }
        if (!options.languageCode) {
            options.languageCode = this.chooseLanguage(nextState.draft, nextProps.locale);
        }
    },

    /**
     * Choose preview type based on story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    choosePreview: function(story) {
        // show preview when text is formatted
        if (story.type === 'survey' || story.type === 'task-list') {
            return 'text';
        }
        if (_.get(story, 'details.markdown', false)) {
            return 'text';
        }
        // default to media until we know more
        return '';
    },

    /**
     * Choose language based on selected locale and story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    chooseLanguage: function(story, locale) {
        var languageCode = locale.languageCode;
        var text = _.get(story, 'details.text');
        if (!_.isEmpty(text)) {
            // use the first language of the text object, but only if it's
            // different from the selected locale so that the country code
            // is kept when it's the same
            var firstLanguage = _.first(_.keys(text));
            if (languageCode.substr(0, 2) !== firstLanguage) {
                languageCode = firstLanguage;
            }
        }
        return languageCode;
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
                    {this.renderTextEditor()}
                    {this.renderSupplementalEditor()}
                    {this.renderConfirmationDialogBox()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderTextEditor()}
                    </div>
                    <div className="column-2">
                        {this.renderSupplementalEditor()}
                    </div>
                    {this.renderConfirmationDialogBox()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-3') {
            return (
                <div className="story-view columns-3">
                    <div className="column-1">
                        {this.renderTextEditor()}
                    </div>
                    <div className="column-2">
                        {this.renderSupplementalEditor()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                    {this.renderConfirmationDialogBox()}
                </div>
            );
        }
    },

    /**
     * Render editor for entering text
     *
     * @return {ReactElement}
     */
    renderTextEditor: function() {
        var props = {
            story: this.state.draft,
            authors: this.props.authors,
            coauthoring: this.isCoauthoring(),
            options: this.state.options,
            cornerPopUp: this.renderPopUpMenu('main'),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleChange,
            onPublish: this.handlePublish,
            onCancel: this.handleCancel,
        };
        return <StoryTextEditor {...props} />;
    },

    /**
     * Render one of the supplemental editors
     *
     * @return {ReactElement|null}
     */
    renderSupplementalEditor: function() {
        if (this.state.options.preview === 'text') {
            return this.renderTextPreview();
        } else {
            return this.renderMediaPreview();
        }
    },

    /**
     * Render MarkDown preview
     *
     * @return {ReactElement}
     */
    renderTextPreview: function() {
        var props = {
            story: this.state.draft,
            options: this.state.options,
            cornerPopUp: this.renderPopUpMenu('supplemental'),

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleChange,
            onResourceClick: this.handleResourceClick,
        };
        return <StoryTextPreview {...props} />
    },

    /**
     * Render preview of images and videos
     *
     * @return {ReactElement}
     */
    renderMediaPreview: function() {
        var props = {
            story: this.state.draft,
            cornerPopUp: this.renderPopUpMenu('supplemental'),
            selectedResourceIndex: this.state.selectedResourceIndex,
            options: this.state.options,
            showHints: this.props.showHints,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleChange,
        };
        return <StoryMediaPreview {...props} />
    },

    /**
     * Render popup menu
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
     * Render editor options
     *
     * @return {ReactElement}
     */
    renderOptions: function(inMenu, section) {
        var props = {
            inMenu,
            section,
            story: this.state.draft,
            options: this.state.options,

            repos: this.props.repos,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
        };
        return <StoryEditorOptions {...props} />;
    },

    /**
     * Render confirmation dialog box
     *
     * @return {ReactElement}
     */
    renderConfirmationDialogBox: function() {
        var t = this.props.locale.translate;
        var props = {
            show: this.state.confirming,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
        };
        var message;
        if (this.state.action === 'delete-post') {
            message = t('story-cancel-are-you-sure');
            props.onConfirm = this.handleCancelConfirm;
        } else {
            message = t('story-remove-yourself-are-you-sure');
            props.onConfirm = this.handleRemoveConfirm;
        }
        return (
            <ConfirmationDialogBox {...props}>
                {message}
            </ConfirmationDialogBox>
        );
    },

    /**
     * Set current draft
     *
     * @param  {Story} draft
     *
     * @return {Promise<Story>}
     */
    changeDraft: function(draft) {
        return new Promise((resolve, reject) => {
            var options = this.state.options;
            if (!options.preview) {
                var preview = this.choosePreview(draft);
                if (preview) {
                    options = _.decoupleSet(options, 'preview', preview);
                }
            }
            this.setState({ draft, options }, () => {
                resolve(draft);
            });
        });
    },

    /**
     * Set options
     *
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    changeOptions: function(options) {
        return new Promise((resolve, reject) => {
            this.setState({ options }, () => {
                resolve(options);
            });
        });
    },

    /**
     * Save story to remote database after specified delay
     *
     * @param  {Story} story
     * @param  {Number} delay
     */
    autosaveStory: function(story, delay) {
        if (delay) {
            this.cancelAutosave();
            this.autosaveTimeout = setTimeout(() => {
                this.saveStory(story);
            }, delay);
            this.autosaveUnloadHandler = () => {
                this.saveStory(story);
            };
            window.addEventListener('beforeunload', this.autosaveUnloadHandler);
        } else {
            this.saveStory(story);
        }
    },

    /**
     * Cancel any auto-save operation
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

        // send images and videos to server
        var params = this.props.route.parameters;
        var resources = story.details.resources || [];
        var payloads = this.props.payloads;
        return payloads.prepare(params.schema, story).then(() => {
            var db = this.props.database.use({ schema: params.schema, by: this });
            return db.start().then(() => {
                return db.saveOne({ table: 'story' }, story).then((story) => {
                    // start file upload
                    return payloads.dispatch(params.schema, story).return(story);
                });
            });
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
        var route = this.props.route;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    },

    /**
     * Remove current user from author list
     *
     * @return {Promise<Story>}
     */
    removeSelf: function() {
        var story = this.props.story;
        var userIds = _.without(story.user_ids, this.props.currentUser.id);
        var columns = {
            id: story.id,
            user_ids: userIds,
        };
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, columns);
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
     * Send bookmarks to recipients
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
     * Called when user makes changes to the story
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleChange: function(evt) {
        return this.changeDraft(evt.story).then((story) => {
            var delay;
            switch (evt.path) {
                case 'details.resources':
                    // upload resources immediately
                    if (hasUnsentFiles(story.details.resources)) {
                        delay = 0;
                    }
                    break;
                case 'user_ids':
                    // make story available to other users immediately
                    delay = 0;
                    break;
                default:
                    delay = AUTOSAVE_DURATION;
            }
            this.autosaveStory(story, delay);
            return null;
        });
    },

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Story>}
     */
    handlePublish: function(evt) {
        var story = _.clone(this.state.draft);
        var options = this.state.options;
        if (!story.type) {
            story.type = 'story';
        }
        if (_.isEmpty(story.role_ids)) {
            var roleIds = _.map(this.props.authors, 'role_ids');
            story.role_ids = _.uniq(_.flatten(roleIds));
        }
        story.public = !options.hidePost;
        story.published = true;

        return this.changeDraft(story).then(() => {
            return this.saveStory(story).then((story) => {
                return this.sendBookmarks(story, options.bookmarkRecipients).then(() => {
                    var draft = createBlankStory(this.props.currentUser);
                    return this.changeDraft(draft);
                });
            });
        });
    },

    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Story>}
     */
    handleCancel: function(evt) {
        var action;
        if (this.isCoauthoring()) {
            action = 'remove-self';
        } else {
            action = 'delete-post';
        }
        this.setState({ confirming: true, action });
    },

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     *
     * @return {Promise<Object>}
     */
    handleOptionsChange: function(evt) {
        return this.changeOptions(evt.options);
    },

    /**
     * Called when user clicks on an image referenced by Markdown
     *
     * @param  {Object} evt
     *
     * @return {[type]}
     */
    handleResourceClick: function(evt) {
        var resources = this.state.draft.details.resources;
        var selectedResourceIndex = _.indexOf(resources, evt.resource);
        var options = _.decoupleSet(this.state.options, 'preview', 'media');
        this.setState({ selectedResourceIndex, options });
    },

    /**
     * Called when user cancel an action
     *
     * @param  {Event} evt
     */
    handleDialogClose: function(evt) {
        this.setState({ confirming: false });
    },

    /**
     * Called when user confirms his desire to cancel a story
     *
     * @param  {Event} evt
     */
    handleCancelConfirm: function(evt) {
        this.setState({ confirming: false });
        var story = this.state.draft;
        if (this.props.isStationary) {
            // when it's the top editor, create a blank story first, since this
            // instance of the component will be reused
            var draft = createBlankStory(this.props.currentUser);
            this.changeDraft(draft).then(() => {
                if (story.id) {
                    return this.removeStory(story);
                } else {
                    return story;
                }
            });
        } else {
            this.removeStory(story);
        }
    },

    /**
     * Called when user confirms his desire to remove himself as a co-author
     *
     * @param  {Event} evt
     */
    handleRemoveConfirm: function(evt) {
        this.setState({ confirming: false });
        this.removeSelf();
    },
});

var defaultOptions = {
    languageCode: '',
    issueDetails: null,
    hidePost: false,
    bookmarkRecipients: [],
    preview: '',
};

/**
 * Return a blank story
 *
 * @param  {User} currentUser
 *
 * @return {Story}
 */
var createBlankStory = Memoize(function(currentUser) {
    return {
        user_ids: [ currentUser.id ],
        details: {},
        public: true,
    };
}, {
    user_ids: [],
    details: {},
    public: true,
});

function hasUnsentFiles(resources) {
    return _.some(resources, (res) => {
        if (!res.url && !res.payload_id) {
            return true;
        }
    });
}
