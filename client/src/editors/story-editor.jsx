var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');
var PlainText = require('utils/plain-text');
var TagScanner = require('utils/tag-scanner');
var FocusManager = require('utils/focus-manager');
var ComponentRefs = require('utils/component-refs');
var StoryUtils = require('objects/utils/story-utils');
var IssueUtils = require('objects/utils/issue-utils');
var TemporaryId = require('data/remote-data-source/temporary-id');

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
var MediaImporter = require('editors/media-importer');
var MediaPlaceholder = require('widgets/media-placeholder');
var StoryEditorOptions = require('editors/story-editor-options');
var CornerPopUp = require('widgets/corner-pop-up');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

require('./story-editor.scss');

const AUTOSAVE_DURATION = 2000;

const RETURN = 13;
const CLOSE_BRACKET = 221;

module.exports = React.createClass({
    displayName: 'StoryEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        isStationary: PropTypes.bool,
        highlighting: PropTypes.bool,
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
            mediaImporter: MediaImporter,
            textArea: AutosizeTextArea,
            mainPopUp: CornerPopUp,
            previewPopUp: CornerPopUp,
        });
        var nextState = {
            options: defaultOptions,
            selectedResourceIndex: 0,
            original: null,
            draft: null,
            confirming: false,
            capturing: null,
            action: null,
        };
        this.updateDraft(nextState, this.props);
        this.updateOptions(nextState, this.props);
        this.updateLocaleCode(nextState, this.props);
        this.updateLeadAuthor(nextState, this.props);
        this.updateBookmarkRecipients(nextState, this.props);
        this.updateResourceIndex(nextState, this.props);
        return nextState;
    },

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName: function() {
        var className = 'story-editor';
        if (this.props.highlighting) {
            className += ' highlighting';
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
            this.updateOptions(nextState, nextProps);
            this.updateLocaleCode(nextState, nextProps);
            this.updateResourceIndex(nextState, nextProps);
        }
        if (this.props.currentUser !== nextProps.currentUser) {
            this.updateLeadAuthor(nextState, nextProps);
        }
        if (this.props.locale !== nextProps.locale) {
            this.updateLocaleCode(nextState, nextProps);
        }
        if (this.props.recommendations !== nextProps.recommendations) {
            this.updateBookmarkRecipients(nextState, nextProps);
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
            nextState.draft = nextProps.story;
            if (!nextProps.story.uncommitted) {
                nextState.original = nextProps.story;
            }
        } else {
            nextState.draft = createBlankStory(nextProps.currentUser);
            nextState.original = null;
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
        if (!nextProps.story) {
            // reset options to default when a new story starts
            nextState.options = defaultOptions;
        } else {
            nextState.options = _.clone(nextState.options);
            nextState.options.hidePost = !nextState.draft.public;
            nextState.options.issueDetails = IssueUtils.extract(nextState.draft, nextProps.repos);
            if (!nextState.options.preview) {
                nextState.options.preview = this.choosePreview(nextState.draft);
            }
        }
    },

    /**
     * Update state.options.bookmarkRecipients based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateBookmarkRecipients: function(nextState, nextProps) {
        var targetUserIds = _.map(nextProps.recommendations, 'target_user_id');
        nextState.options = _.clone(nextState.options);
        nextState.options.bookmarkRecipients = _.union(nextState.options.bookmarkRecipients, targetUserIds);
    },

    /**
     * Update state.options.localeCode based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateLocaleCode: function(nextState, nextProps) {
        nextState.options = _.clone(nextState.options);
        nextState.options.localeCode = this.chooseLocale(nextState.draft, nextProps.locale);
    },

    /**
     * Update state.selectedResourceIndex
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateResourceIndex: function(nextState, nextProps) {
        var resources = _.get(nextState.draft, 'details.resources');
        var count = _.size(resources);
        if (nextState.selectedResourceIndex >= count) {
            nextState.selectedResourceIndex = count - 1;
        } else if (nextState.selectedResourceIndex < 0 && count > 0) {
            nextState.selectedResourceIndex = 0;
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
            // the country code may affect which dictionary is chosen
            // try to add it to the language code
            var languageCode = _.first(_.keys(text));
            if (languageCode === locale.languageCode) {
                // great, the current user speaks the language
                localeCode = locale.localeCode;
            } else {
                // use the first country on the list if the language is in
                // the directory
                var entry = _.find(locale.directory, { code: languageCode });
                if (entry) {
                    var countryCode = entry.defaultCountry;
                    localeCode = `${languageCode}-${countryCode}`;
                } else {
                    // shouldn't really happen
                    localeCode = languageCode;
                }
            }
        } else {
            localeCode = locale.localeCode;
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
                {this.renderMediaImporter()}
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
                {this.renderMediaImporter()}
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
                {this.renderMediaImporter()}
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
            onChange: this.handleTextChange,
            onKeyPress: this.handleKeyPress,
            onKeyUp: this.handleKeyUp,
            onPaste: this.handlePaste,
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
            case 'post':
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
            allowEmbedding: true,
            resources: _.get(this.state.draft, 'details.resources'),
            resourceIndex: this.state.selectedResourceIndex,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
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
     * Render preview of images and videos
     *
     * @return {ReactElement}
     */
    renderMediaImporter: function() {
        var props = {
            ref: this.components.setters.mediaImporter,
            resources: _.get(this.state.draft, 'details.resources'),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            cameraDirection: 'back',
            onCaptureStart: this.handleCaptureStart,
            onCaptureEnd: this.handleCaptureEnd,
            onChange: this.handleResourcesChange,
        };
        return <MediaImporter {...props} />;
    },

    /**
     * Render popup menu
     *
     * @return {ReactElement}
     */
    renderPopUpMenu: function(section) {
        var ref = this.components.setters[section + 'PopUp'];
        return (
            <CornerPopUp ref={ref}>
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

            onChange: this.handleOptionChange,
            onComplete: this.handleOptionComplete,
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
        } else if (this.state.action === 'cancel-edit') {
            message = t('story-cancel-edit-are-you-sure');
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

    componentDidUpdate: function(prevProp, prevState) {
        if (this.repositionCursor) {
            var target = this.repositionCursor.target;
            target.selectionStart = target.selectionEnd = this.repositionCursor.position;
            this.repositionCursor = null;
        }
    },

    /**
     * Set current draft
     *
     * @param  {Story} draft
     *
     * @return {Promise<Story>}
     */
    changeDraft: function(draft, resourceIndex) {
        return new Promise((resolve, reject) => {
            var options = this.state.options;
            if (!options.preview) {
                var preview = this.choosePreview(draft);
                if (preview) {
                    options = _.decoupleSet(options, 'preview', preview);
                }
            }
            var newState = { draft, options };
            if (resourceIndex !== undefined) {
                newState.selectedResourceIndex = resourceIndex;
            }
            this.setState(newState, () => {
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
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Story>}
     */
    saveDraft: function(draft, immediate, resourceIndex) {
        draft.public = !this.state.options.hidePost;
        return this.changeDraft(draft, resourceIndex).then((story) => {
            this.saveStory(story, immediate);
            return story;
        });
    },

    /**
     * Save story to remote database
     *
     * @param  {Story} story
     * @param  {Boolean} immediate
     *
     * @return {Promise<Story>}
     */
    saveStory: function(story, immediate) {
        // send images and videos to server
        var params = this.props.route.parameters;
        var resources = story.details.resources || [];
        var original = this.state.original;
        var options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (StoryUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, story, options).then((story) => {
                this.props.payloads.dispatch(story);
                return story;
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
            draft.type = 'post';
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
        draft.published = true;

        return this.saveDraft(draft, true).then((story) => {
            return this.sendBookmarks(story, options.bookmarkRecipients);
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

        // automatically set story type to task list
        if (!draft.type) {
            if (ListParser.detect(draft.details.text)) {
                draft.type = 'task-list';
                if (draft.details.markdown === undefined) {
                    draft.details.markdown = false;
                }
            }
        }

        // automatically enable Markdown formatting
        if (draft.details.markdown === undefined) {
            if (Markdown.detect(langText)) {
                draft.details.markdown = true;
            }
        }

        // look for tags
        draft.tags = TagScanner.findTags(draft.details.text);
        this.saveDraft(draft);
    },

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyPress: function(evt) {
        var target = evt.target;
        if (evt.charCode === RETURN) {
            var storyType = this.state.draft.type;
            if (storyType !== 'survey' && storyType !== 'task-list') {
                if (this.props.theme.mode === 'single-col') {
                    evt.preventDefault();
                    this.handlePublishClick(evt);
                    target.blur();
                }
            }
        }
    },

    /**
     * Called when user releases a key
     *
     * @param  {Event} evt
     */
    handleKeyUp: function(evt) {
        // look for carriage return
        var target = evt.target;
        if (evt.keyCode === RETURN) {
            var storyType = this.state.draft.type;
            if (storyType === 'survey' || storyType === 'task-list') {
                // see if there's survey or task-list item on the line where
                // the cursor is at
                var value = target.value;
                var selStart = target.selectionStart;
                var textInFront = value.substr(0, selStart);
                var lineFeedIndex = _.lastIndexOf(textInFront.substr(0, textInFront.length - 1), '\n');
                var lineInFront = textInFront.substr(lineFeedIndex + 1);
                var tokens = ListParser.extract(lineInFront);
                var item = _.get(tokens, [ 0, 0 ]);
                if (item instanceof Object) {
                    if (item.label) {
                        // the item is not empty--start the next item automatically
                        document.execCommand("insertText", false, '* [ ] ');
                    } else {
                        // it's empty--move the selection back to remove it
                        target.selectionStart = lineFeedIndex + 1;
                        document.execCommand("insertText", false, '\n');
                    }
                }
            }
        } else if (evt.keyCode === CLOSE_BRACKET) {
            var value = target.value;
            var selStart = target.selectionStart;
            var textInFront = value.substr(0, selStart);
            var lineFeedIndex = _.lastIndexOf(textInFront, '\n');
            var lineInFront = textInFront.substr(lineFeedIndex + 1);
            if (/^\s*\*\[\]/.test(lineInFront)) {
                target.selectionStart = selStart - 3;
                document.execCommand("insertText", false, '* [ ]');
            }
        }
    },

    /**
     * Called when user paste into editor
     *
     * @param  {Event} evt
     */
    handlePaste: function(evt) {
        Promise.all([
            this.components.mediaImporter.importFiles(evt.clipboardData.files),
            this.components.mediaImporter.importDataItems(evt.clipboardData.items)
        ]).then((counts) => {
            if (_.some(counts)) {
                FocusManager.focus({ type: 'ImageEditor' });
            }
        });
        if (evt.clipboardData.files.length > 0) {
            evt.preventDefault();
        }
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
        } else if (this.props.isStationary) {
            action = 'delete-post';
        } else {
            action = 'cancel-edit';
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
    handleOptionChange: function(evt) {
        return this.changeOptions(evt.options);
    },

    /**
     * Called when a change to the story options is complete
     *
     * @param  {Object} evt
     */
    handleOptionComplete: function(evt) {
        var section = evt.target.props.section;
        var popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
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
                if (res.type === 'audio') {
                    url = require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
                } else {
                    // images are style at height = 1.5em
                    url = theme.getImageURL(res, { height: 24 });
                }
            } else {
                url = theme.getURL(res);
            }
            return {
                href: url,
                title: evt.name
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
        if (target.viewportElement) {
            target = target.viewportElement;
        }
        var name;
        if (target.tagName === 'svg') {
            var title = target.getElementsByTagName('title')[0];
            if (title) {
                name = title.textContent;
            }
        } else {
            name = evt.target.title;
        }
        if (name) {
            var resources = this.state.draft.details.resources;
            var res = Markdown.findReferencedResource(resources, name);
            if (res) {
                var selectedResourceIndex = _.indexOf(resources, res);
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
        var list = parseInt(target.name);
        var item = parseInt(target.value);
        var selected = target.checked;
        var draft = _.decouple(this.state.draft, 'details');
        if (draft.type === 'task-list') {
            draft.details.text = _.mapValues(draft.details.text, (langText) => {
                var tokens = ListParser.extract(langText);
                ListParser.set(tokens, list, item, selected);
                return ListParser.join(tokens);
            });
        } else if (draft.type === 'survey') {
            draft.details.text = _.mapValues(draft.details.text, (langText) => {
                var tokens = ListParser.extract(langText);
                ListParser.set(tokens, list, item, selected, true);
                return ListParser.join(tokens);
            });
        }
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
     */
    handleResourcesChange: function(evt) {
        var resourcesBefore = this.state.draft.resources;
        var resourcesAfter = evt.resources;
        var selectedResourceIndex = evt.selection;
        if (resourcesBefore !== resourcesAfter) {
            var draft = _.decoupleSet(this.state.draft, 'details.resources', resourcesAfter);
            var immediate = hasUnsentFiles(resourcesAfter);
            return this.saveDraft(draft, immediate, selectedResourceIndex);
        } else {
            this.setState({ selectedResourceIndex });
        }
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
            // keep previewing media
            var options = _.clone(this.state.options);
            options.preview = 'media';
            this.changeOptions(options).then(() => {
                _.set(draft, `details.markdown`, true);
                this.changeDraft(draft).then(() => {
                    var textArea = this.components.textArea.getElement();
                    textArea.focus();
                    setTimeout(() => {
                        var addition = `![${resource.type}-${index+1}]`;
                        document.execCommand("insertText", false, addition);
                    }, 10);
                });
            });
        }
    },

    /**
     * Called when user drops an item over the editor
     *
     * @param  {Event} evt
     */
    handleDrop: function(evt) {
        Promise.all([
            this.components.mediaImporter.importFiles(evt.files),
            this.components.mediaImporter.importDataItems(evt.items),
        ]).then((counts) => {
            if (_.some(counts)) {
                FocusManager.focus({ type: 'ImageEditor' });
            }
        });
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
        if (evt.resource) {
            FocusManager.focus({ type: 'ImageEditor' });
        }
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
                    var textArea = this.components.textArea.getElement();
                    textArea.focus();
                    if (!ListParser.detect(textArea.value)) {
                        setTimeout(() => {
                            var value = textArea.value;
                            var addition = '* [ ] ';
                            var selStart = textArea.selectionStart;
                            var textInFront = value.substr(0, selStart);
                            if (/[^\n]$/.test(textInFront)) {
                                addition = '\n' + addition;
                            }
                            document.execCommand("insertText", false, addition);
                        }, 10);
                    }
                }
                this.saveDraft(draft);
                break;
            case 'photo-capture':
                this.components.mediaImporter.capture('image');
                break;
            case 'video-capture':
                this.components.mediaImporter.capture('video');
                break;
            case 'audio-capture':
                this.components.mediaImporter.capture('audio');
                break;
            case 'file-import':
                this.components.mediaImporter.importFiles(evt.files).then((count) => {
                    if (count > 0) {
                        FocusManager.focus({ type: 'ImageEditor' });
                    }
                });
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
function createBlankStory(currentUser) {
    // assign a temporary id immediately to ensure proper merging
    return {
        id: TemporaryId.allocate(),
        user_ids: [ currentUser.id ],
        details: {},
        public: true,
        published: false,
    };
}

function hasUnsentFiles(resources) {
    return _.some(resources, (res) => {
        if (!res.url && !res.payload_id) {
            return true;
        }
    });
}
