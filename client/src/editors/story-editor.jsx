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
var StoryMediaEditor = require('editors/story-media-editor');
var StoryTextPreview = require('editors/story-text-preview');
var StoryEditorOptions = require('editors/story-editor-options');
var CornerPopUp = require('widgets/corner-pop-up');

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

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        var nextState = {
            options: defaultOptions,
            draft: null,
        };
        this.updateDraft(nextState, this.props);
        this.updateOptions(nextState, this.props);
        this.updateLeadAuthor(nextState, this.props);
        return nextState;
    },

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
            if (nextState.draft !== nextProps.story) {
                var priorDraft = this.props.story || createBlankStory(this.props.currentUser);
                var currentDraft = nextState.draft;
                var nextDraft = nextProps.story;
                if (currentDraft !== priorDraft) {
                    // merge changes into the remote copy
                    // (properties in nextDraft are favored in conflicts)
                    nextDraft = Merger.mergeObjects(currentDraft, nextDraft, priorDraft);
                }
                this.reattachBlobs(nextDraft);
                nextState.draft = nextDraft;
            }
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
            if (!nextState.draft.user_ids || nextState.draft.user_ids[0] !== currentUserId) {
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
        if (!options.supplementalEditor) {
            options.supplementalEditor = this.chooseSupplementalEditor(nextState.draft);
        }
        if (!options.languageCode) {
            options.languageCode = this.chooseLanguage(nextState.draft, nextProps.locale);
        }
    },

    /**
     * Choose supplmental view based on story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    chooseSupplementalEditor: function(story) {
        // show preview when text is formatted
        if (story.type === 'vote' || story.type === 'task-list') {
            return 'preview';
        }
        if (_.get(story, 'details.markdown', false)) {
            return 'preview';
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
     * @return {ReactElement}
     */
    renderSupplementalEditor: function() {
        if (this.state.options.supplementalEditor === 'preview') {
            return this.renderTextPreview();
        } else {
            return this.renderMediaEditor();
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
        };
        return <StoryTextPreview {...props} />
    },

    /**
     * Render editor for adding images and videos
     *
     * @return {ReactElement}
     */
    renderMediaEditor: function() {
        var props = {
            story: this.state.draft,
            cornerPopUp: this.renderPopUpMenu('supplemental'),

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleChange,
        };
        return <StoryMediaEditor {...props} />
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleOptionsChange,
        };
        return <StoryEditorOptions {...props} />;
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
            if (!options.supplementalEditor) {
                var editor = this.chooseSupplementalEditor(draft);
                if (editor) {
                    options = _.decoupleSet(options, 'supplementalEditor', editor);
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
        var resources = story.details.resources || [];
        var payloads = this.props.payloads;
        var payloadIds = [];
        return Promise.each(resources, (res) => {
            if (!res.payload_id) {
                // acquire a task id for each attached resource
                return payloads.queue(res).then((payloadId) => {
                    if (payloadId) {
                        res.payload_id = payloadId;
                        payloadIds.push(payloadId);
                    }
                });
            }
        }).then(() => {
            var route = this.props.route;
            var server = route.parameters.server;
            var schema = route.parameters.schema;
            var db = this.props.database.use({ server, schema, by: this });
            return db.start().then(() => {
                return db.saveOne({ table: 'story' }, story).then((story) => {
                    return Promise.each(payloadIds, (payloadId) => {
                        // start file upload
                        return payloads.send(payloadId);
                    }).then(() => {
                        this.reattachBlobs(story);
                        return this.changeDraft(story);
                    });
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
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.removeOne({ table: 'story' }, story);
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

    /**
     * Reattach blobs that were filtered out when objects are saved
     *
     * @param  {Story} story
     */
    reattachBlobs: function(story) {
        var payloads = this.props.payloads;
        var resources = _.get(story, 'details.resources');
        _.each(resources, (res) => {
            // these properties also exist in the corresponding payload objects
            // find payload with one of them
            var criteria = _.pick(res, 'payload_id', 'url', 'poster_url');
            var payload = payloads.find(criteria);
            if (payload) {
                _.forIn(payload, (value, name) => {
                    if (value instanceof Blob) {
                        res[name] = value;
                    }
                });
            }
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
                    delay = 0;
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
        var story = this.state.draft;
        var draft = createBlankStory(this.props.currentUser);
        return this.changeDraft(draft).then(() => {
            if (story.id) {
                return this.removeStory(story);
            } else {
                return story;
            }
        });
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
});

var defaultOptions = {
    languageCode: '',
    addIssue: false,
    hidePost: false,
    bookmarkRecipients: [],
    supplementalEditor: '',
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
