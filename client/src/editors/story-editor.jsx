var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var Merger = require('data/merger');
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');
var TagScanner = require('utils/tag-scanner');
var ComponentRefs = require('utils/component-refs');
var IssueUtils = require('objects/utils/issue-utils');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var AuthorNames = require('widgets/author-names');
var ProfileImage = require('widgets/profile-image');
var CoauthoringButton = require('widgets/coauthoring-button');
var PushButton = require('widgets/push-button');
var AutosizeTextArea = require('widgets/autosize-text-area');
var MediaToolbar = require('widgets/media-toolbar');
var TextToolbar = require('widgets/text-toolbar');
var HeaderButton = require('widgets/header-button');
var DropZone = require('widgets/drop-zone');
var MediaEditor = require('editors/media-editor');
var MediaPlaceholder = require('widgets/media-placeholder');
var StoryEditorOptions = require('editors/story-editor-options');
var CornerPopUp = require('widgets/corner-pop-up');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

require('./story-editor.scss');

const AUTOSAVE_DURATION = 2000;

module.exports = React.createClass({
    displayName: 'StoryEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        isStationary: PropTypes.bool,
        selected: PropTypes.bool,
        story: PropTypes.object,
        authors: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),

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
        this.components = ComponentRefs({
            mediaEditor: MediaEditor,
            textArea: HTMLTextAreaElement,
        });
        this.resourcesReferenced = {};
        var nextState = {
            options: defaultOptions,
            selectedResourceIndex: undefined,
            draft: null,
            confirming: false,
            capturing: null,
            action: null,
        };
        this.updateDraft(nextState, this.props);
        this.updateOptions(nextState, this.props);
        this.updateLeadAuthor(nextState, this.props);
        return nextState;
    },

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName: function() {
        var className = 'story-editor';
        if (this.props.selected) {
            className += ' selected';
        }
        return className;
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
        options.issueDetails = IssueUtils.extract(nextState.draft, nextProps.repos);
        if (!options.preview) {
            options.preview = this.choosePreview(nextState.draft);
        }
        if (!options.localeCode) {
            options.localeCode = this.chooseLocale(nextState.draft, nextProps.locale);
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
     * Choose locale based on selected locale and story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    chooseLocale: function(story, locale) {
        var localeCode;
        var text = _.get(story, 'details.text');
        if (!_.isEmpty(text)) {
            var languageCode = _.first(_.keys(text));
            if (languageCode === locale.languageCode) {
                localeCode = locale.languageCode;
            } else {
                var entry = _.find(locale.directory, { code: languageCode });
                if (entry) {
                    // use the first country
                    var countryCode = _.keys(entry.countries);
                    localeCode = `${languageCode}-${countryCode}`;
                } else {
                    localeCode = languageCode;
                }
            }
        } else {
            localeCode = locale.languageCode;
        }
        return localeCode;
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
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderCoauthoringButton()}
                        {this.renderTextArea()}
                        {this.renderButtons()}
                    </div>
                </div>
                <div className="header">
                    <div className="column-2 padded">
                        {this.renderToolbar()}
                        {this.renderPopUpMenu('preview')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {this.renderPreview()}
                    </div>
                </div>
                {this.renderConfirmationDialogBox()}
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
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                        {this.renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {this.renderToolbar()}
                        {this.renderPopUpMenu('preview')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderCoauthoringButton()}
                        {this.renderTextArea()}
                        {this.renderButtons()}
                    </div>
                    <div className="column-2">
                        {this.renderPreview()}
                    </div>
                </div>
                {this.renderConfirmationDialogBox()}
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
            <div className={this.getClassName()}>
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderAuthorNames()}
                    </div>
                    <div className="column-2 padded">
                        {this.renderToolbar()}
                    </div>
                    <div className="column-3 padded">
                        <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderCoauthoringButton()}
                        {this.renderTextArea()}
                        {this.renderButtons()}
                    </div>
                    <div className="column-2">
                        {this.renderPreview()}
                    </div>
                    <div className="column-3 padded">
                        {this.renderOptions()}
                    </div>
                </div>
                {this.renderConfirmationDialogBox()}
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
            user: _.get(this.props.authors, 0),
            theme: this.props.theme,
            size: 'medium',
        };
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
            theme: this.props.theme,
        };
        return <AuthorNames {...props} />;
    },

    /**
     * Render button that opens coauthor selection dialog box
     *
     * @return {ReactElement}
     */
    renderCoauthoringButton: function() {
        var props = {
            coauthoring: this.isCoauthoring(),
            story: this.state.draft,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelect: this.handleCoauthorSelect,
            onRemove: this.handleCancelClick,
        };
        return <CoauthoringButton {...props} />;
    },

    /**
     * Render the control for text entry
     *
     * @return {ReactElement}
     */
    renderTextArea: function() {
        var setters = this.components.setters;
        var loc = this.state.options.localeCode;
        var lang = loc.substr(0, 2);
        var langText = _.get(this.state.draft, [ 'details', 'text', lang ], '');
        var props = {
            value: langText,
            lang: loc,
            autofocus: !!_.get(this.state.draft, 'id'),
            onChange: this.handleTextChange,
        };
        return <AutosizeTextArea ref={setters.textArea} {...props} />;
    },

    /**
     * Render cancel and post buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var draft = this.state.draft;
        var noText = _.isEmpty(_.get(draft, 'details.text'));
        var noResources = _.isEmpty(_.get(draft, 'details.resources'));
        var publishing = _.get(draft, 'published', false);
        var cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
            disabled: (noText && noResources) || publishing,
        };
        var postButtonProps = {
            label: t('story-post'),
            onClick: this.handlePublishClick,
            emphasized: true,
            disabled: (noText && noResources) || publishing,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...postButtonProps} />
            </div>
        );
    },

    /**
     * Render text or media preview
     *
     * @return {ReactElement|null}
     */
    renderToolbar: function() {
        if (this.state.options.preview === 'text') {
            return this.renderTextToolbar();
        } else {
            return this.renderMediaToolbar();
        }
    },

    /**
     * Render buttons in title bar
     *
     * @return {ReactElement}
     */
    renderTextToolbar: function() {
        var props = {
            story: this.state.draft,
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <TextToolbar {...props} />;
    },

    /**
     * Render buttons for ataching media
     *
     * @return {ReactElement}
     */
    renderMediaToolbar: function() {
        var props = {
            story: this.state.draft,
            capturing: this.state.capturing,
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <MediaToolbar {...props} />;
    },

    /**
     * Render text or media preview
     *
     * @return {ReactElement|null}
     */
    renderPreview: function() {
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
        var contents;
        switch (this.state.draft.type) {
            case undefined:
            case '':
            case 'story':
                contents = this.renderRegularPost();
                break;
            case 'task-list':
                contents = this.renderTaskListText();
                break;
            case 'survey':
                contents = this.renderSurveyText();
                break;
        }
        return <div className="story-contents">{contents}</div>;
    },

    /**
     * Render text for regular post
     *
     * @return {ReactElement}
     */
    renderRegularPost: function() {
        var p = this.props.locale.pick;
        var className = 'text story';
        var draft = this.state.draft;
        var text = p(draft.details.text);
        if (draft.details.markdown) {
            text = Markdown.parse(text, this.handleReference);
            className += ' markdown';
        } else {
            text = <p>{text}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {text}
            </div>
        );
    },

    /**
     * Render task list
     *
     * @return {ReactElement}
     */
    renderTaskListText: function() {
        var p = this.props.locale.pick;
        var className = 'text task-list';
        var draft = this.state.draft;
        var text = p(draft.details.text);
        var list;
        if (draft.details.markdown) {
            // answers are written to the text itself, so there's no need to
            // provide user answers to Markdown.parseTaskList()
            list = Markdown.parseTaskList(text, null, this.handleItemChange, this.handleReference);
            className += ' markdown';
        } else {
            list = PlainText.parseTaskList(text, null, this.handleItemChange);
            list = <p>{list}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {list}
            </div>
        );
    },

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement}
     */
    renderSurveyText: function() {
        var p = this.props.locale.pick;
        var className = 'text survey';
        var draft = this.state.draft;
        var text = p(draft.details.text);
        var survey;
        if (draft.details.markdown) {
            survey = Markdown.parseSurvey(text, null, this.handleItemChange, this.handleReference);
            className += ' markdown';
        } else {
            survey = PlainText.parseSurvey(text, null, this.handleItemChange);
            survey = <p>{survey}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {survey}
            </div>
        );
    },

    /**
     * Render preview of images and videos
     *
     * @return {ReactElement}
     */
    renderMediaPreview: function() {
        var editorProps = {
            ref: this.components.setters.mediaEditor,
            allowEmbedding: true,
            resources: _.get(this.state.draft, 'details.resources'),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            initialResourceIndex: this.props.selectedResourceIndex,
            onCaptureStart: this.handleCaptureStart,
            onCaptureEnd: this.handleCaptureEnd,
            onChange: this.handleResourcesChange,
            onEmbed: this.handleResourceEmbed,
        };
        var placeholderProps = {
            showHints: this.props.isStationary,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return (
            <DropZone onDrop={this.handleDrop}>
                <MediaEditor {...editorProps}>
                    <MediaPlaceholder {...placeholderProps} />
                </MediaEditor>
            </DropZone>
        );
    },

    /**
     * Render popup menu
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
     * Render editor options
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(section) {
        var props = {
            section,
            story: this.state.draft,
            options: this.state.options,

            currentUser: this.props.currentUser,
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
     * Set current draft and initiate autosave
     *
     * @param  {Story} draft
     * @param  {Boolean} immediate
     *
     * @return {Promise<Story>}
     */
    saveDraft: function(draft, immediate) {
        return this.changeDraft(draft).then((story) => {
            var delay = (immediate) ? 0 : AUTOSAVE_DURATION;
            this.autosaveStory(story, delay);
            return story;
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
     * Publish the story
     *
     * @return {[type]}
     */
    publishStory: function() {
        var draft = _.clone(this.state.draft);
        var options = this.state.options;
        if (!draft.type) {
            draft.type = 'story';
        }
        if (_.isEmpty(draft.role_ids)) {
            var roleIds = _.map(this.props.authors, 'role_ids');
            draft.role_ids = _.uniq(_.flatten(roleIds));
        }
        if (IssueUtils.attach(draft, options.issueDetails, this.props.currentUser, this.props.repos)) {
            // add issue labels as tags
            var issueTags = _.map(draft.details.labels, (label) => {
                return `#${label}`;
            });
            draft.tags = _.union(draft.tags, issueTags);
        }
        draft.public = !options.hidePost;
        draft.published = true;

        return this.saveDraft(draft, true).then((story) => {
            return this.sendBookmarks(story, options.bookmarkRecipients).then(() => {
                if (this.props.isStationary) {
                    var blank = createBlankStory(this.props.currentUser);
                    return this.changeDraft(blank);
                }
            });
        });
    },

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     */
    handlePublishClick: function(evt) {
        this.publishStory();
    },

    /**
     * Called when user changes the text
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
        var langText = evt.currentTarget.value;
        var loc = this.state.options.localeCode;
        var lang = loc.substr(0, 2);
        var path = `details.text.${lang}`;
        var draft = _.decoupleSet(this.state.draft, path, langText);

        // remove zero-length text
        draft.details.text = _.pickBy(draft.details.text, 'length');
        if (_.isEmpty(draft.details.text)) {
            // remove the text object altogether
            draft.details = _.omit(draft.details, 'text');
        }

        // automatically enable Markdown formatting
        if (draft.details.markdown === undefined) {
            if (Markdown.detect(langText)) {
                draft.details.markdown = true;
            }
        }

        // automatically set story type to task list
        if (!draft.type) {
            if (ListParser.detect(draft.details.text)) {
                draft.type = 'task-list';
            }
        }

        // look for tags
        draft.tags = TagScanner.findTags(draft.details.text);
        this.saveDraft(draft);
    },


    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Story>}
     */
    handleCancelClick: function(evt) {
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
        var draft = this.state.draft;
        if (this.props.isStationary) {
            // when it's the top editor, create a blank story first, since this
            // instance of the component will be reused
            var blank = createBlankStory(this.props.currentUser);
            this.changeDraft(blank).then(() => {
                if (draft.id) {
                    return this.removeStory(draft);
                } else {
                    return draft;
                }
            });
        } else {
            this.removeStory(draft);
        }
    },

    /**
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference: function(evt) {
        var resources = this.state.draft.details.resources;
        var res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            var theme = this.props.theme;
            var url;
            if (evt.forImage)  {
                // images are style at height = 1.5em
                url = theme.getImageURL(res, { height: 24 });
                if (!url) {
                    // use blob if it's attached
                    var file = theme.getImageFile(res);
                    url = Markdown.createBlobURL(file, res.clip);
                }
            } else {
                url = theme.getURL(res);
            }
            // remember the resource and the url
            this.resourcesReferenced[url] = res;
            return {
                href: url,
                title: undefined
            };
        }
    },

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
    handleTextClick: function(evt) {
        var target = evt.target;
        if (target.tagName === 'IMG') {
            var src = target.getAttribute('src');
            var res = this.resourcesReferenced[src];
            if (res) {
                var resources = this.state.draft.details.resources;
                var selectedResourceIndex = _.indexOf(resources, evt.resource);
                var options = _.decoupleSet(this.state.options, 'preview', 'media');
                this.setState({ selectedResourceIndex, options });
            }
        }
    },

    /**
     * Called when user click a checkbox or radio button in the preview
     *
     * @param  {Event} evt
     */
    handleItemChange: function(evt) {
        // update the text of the story to reflect the selection
        var target = evt.currentTarget;
        var list = target.name;
        var item = target.value;
        var selected = target.checked;
        var draft = _.decouple(this.state.draft, 'details');
        var clearOthers = (draft.type === 'survey');
        draft.details.text = _.mapValues(draft.details.text, (langText) => {
            return ListParser.update(langText, list, item, selected, clearOthers);
        });
        this.saveDraft(draft);
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

    /**
     * Called when user has added or removed users from author list
     *
     * @param  {Object} evt
     */
    handleCoauthorSelect: function(evt) {
        var draft = _.decoupleSet(this.state.draft, 'user_ids', evt.selection);
        this.saveDraft(draft, true);
    },

    /**
     * Called when user add new resources or adjusted image cropping
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleResourcesChange: function(evt) {
        var path = 'details.resources';
        var draft = _.decoupleSet(this.state.draft, path, evt.resources);
        var immediate = hasUnsentFiles(draft.details.resources);
        return this.saveDraft(draft, immediate);
    },

    /**
     * Called when user wants to embed a resource into Markdown text
     *
     * @param  {Object} evt
     */
    handleResourceEmbed: function(evt) {
        var resource = evt.resource;
        var draft = _.decouple(this.state.draft, 'details');
        var resources = draft.details.resources;
        var resourcesOfType = _.filter(resources, { type: resource.type });
        var index = _.indexOf(resourcesOfType, resource);
        if (index !== -1) {
            var tag = `![${resource.type}-${index+1}]`;
            var loc = this.state.options.localeCode;
            var lang = loc.substr(0, 2);
            var langText = _.get(draft, `details.text.${lang}`, '') + tag;
            _.set(draft, `details.text.${lang}`, langText);
            _.set(draft, `details.markdown`, true);
            this.saveDraft(draft).then(() => {
                this.components.textArea.focus();
            });
        }
    },

    /**
     * Called when user drops an item over the editor
     *
     * @param  {Event} evt
     */
    handleDrop: function(evt) {
        this.components.mediaEditor.importFiles(evt.files);
        this.components.mediaEditor.importDataItems(evt.items);
        return null;
    },

    /**
     * Called when MediaEditor opens one of the capture dialog boxes
     *
     * @param  {Object} evt
     */
    handleCaptureStart: function(evt) {
        this.setState({ capturing: evt.mediaType });
    },

    /**
     * Called when MediaEditor stops rendering a media capture dialog box
     *
     * @param  {Object} evt
     */
    handleCaptureEnd: function(evt) {
        this.setState({ capturing: null });
    },

    /**
     * Called when user initiates an action
     *
     * @param  {Object} evt
     */
    handleAction: function(evt) {
        switch (evt.action) {
            case 'markdown-set':
                var draft = _.decouple(this.state.draft, 'details');
                draft.details.markdown = evt.value;
                this.saveDraft(draft);
                break;
            case 'story-type-set':
                var draft = _.decouple(this.state.draft, 'details');
                draft.type = evt.value;
                // attach a list template to the story if there's no list yet
                if (draft.type === 'task-list' || draft.type === 'survey') {
                    var text = draft.details.text || {};
                    if (!ListParser.detect(text)) {
                        var t = this.props.locale.translate;
                        var lang = this.props.locale.lang;
                        var langText = text[lang] || '';
                        if (_.trimEnd(langText)) {
                            langText = _.trimEnd(langText) + '\n\n';
                        }
                        var items = _.map(_.range(1, 4), (number) => {
                            var label = t(`${draft.type}-item-$number`, number);
                            return `[ ] ${label}`;
                        });
                        langText += items.join('\n');
                        _.set(draft, `details.text.${lang}`, langText);
                    }
                }
                this.saveDraft(draft);
                break;
            case 'photo-capture':
                this.components.mediaEditor.capture('image');
                break;
            case 'video-capture':
                this.components.mediaEditor.capture('video');
                break;
            case 'audio-capture':
                this.components.mediaEditor.capture('audio');
                break;
            case 'file-import':
                this.components.mediaEditor.importFiles(evt.files);
                break;
        }
    }
});

var defaultOptions = {
    localeCode: '',
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
