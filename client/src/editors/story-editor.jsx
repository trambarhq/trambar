import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import Memoize from 'utils/memoize';
import * as ListParser from 'utils/list-parser';
import * as Markdown from 'utils/markdown';
import * as PlainText from 'utils/plain-text';
import * as TagScanner from 'utils/tag-scanner';
import * as FocusManager from 'utils/focus-manager';
import ComponentRefs from 'utils/component-refs';
import * as StoryUtils from 'objects/utils/story-utils';
import * as IssueUtils from 'objects/utils/issue-utils';
import * as TemporaryId from 'data/remote-data-source/temporary-id';
import * as RandomToken from 'utils/random-token';

// widgets
import AuthorNames from 'widgets/author-names';
import ProfileImage from 'widgets/profile-image';
import CoauthoringButton from 'widgets/coauthoring-button';
import PushButton from 'widgets/push-button';
import AutosizeTextArea from 'widgets/autosize-text-area';
import MediaToolbar from 'widgets/media-toolbar';
import TextToolbar from 'widgets/text-toolbar';
import HeaderButton from 'widgets/header-button';
import DropZone from 'widgets/drop-zone';
import MediaEditor from 'editors/media-editor';
import MediaImporter from 'editors/media-importer';
import MediaPlaceholder from 'widgets/media-placeholder';
import StoryEditorOptions from 'editors/story-editor-options';
import CornerPopUp from 'widgets/corner-pop-up';
import ConfirmationDialogBox from 'dialogs/confirmation-dialog-box';

import './story-editor.scss';

const AUTOSAVE_DURATION = 2000;

class StoryEditor extends PureComponent {
    static displayName = 'StoryEditor';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            mediaImporter: MediaImporter,
            textArea: AutosizeTextArea,
            mainPopUp: CornerPopUp,
            previewPopUp: CornerPopUp,
        });
        this.state = {
            options: defaultOptions,
            selectedResourceIndex: 0,
            original: null,
            draft: null,
            confirming: false,
            capturing: null,
            action: null,
        };
        this.updateDraft(this.state, props);
        this.updateOptions(this.state, props);
        this.updateLocaleCode(this.state, props);
        this.updateLeadAuthor(this.state, props);
        this.updateBookmarkRecipients(this.state, props);
        this.updateResourceIndex(this.state, props);
    }

    /**
     * Return class name, possibly with modifiers
     *
     * @return {String}
     */
    getClassName() {
        let className = 'story-editor';
        if (this.props.highlighting) {
            className += ' highlighting';
        }
        return className;
    }

    /**
     * Return true if the current user is coauthoring this article
     *
     * @return {Boolean}
     */
    isCoauthoring() {
        let userIds = _.get(this.props.story, 'user_ids');
        let currentUserId = _.get(this.props.currentUser, 'id');
        let index = _.indexOf(userIds, currentUserId);
        return (index > 0);
    }

    /**
     * Update state when certain props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let nextState = _.clone(this.state);
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
        if (this.props.repos !== nextProps.repos) {
            this.updateOptions(nextState, nextProps);
            this.updateLocaleCode(nextState, nextProps);
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    /**
     * Update state.draft based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateDraft(nextState, nextProps) {
        if (nextProps.story) {
            nextState.draft = nextProps.story;
            if (!nextProps.story.uncommitted) {
                nextState.original = nextProps.story;
            }
        } else {
            nextState.draft = createBlankStory(nextProps.currentUser);
            nextState.original = null;
        }
    }

    /**
     * Update state.draft.user_ids
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateLeadAuthor(nextState, nextProps) {
        if (!nextState.story) {
            let currentUserId = _.get(nextProps.currentUser, 'id');
            if (!nextState.draft.user_ids) {
                nextState.draft = _.decouple(nextState.draft, 'user_ids', []);
                nextState.draft.user_ids[0] = currentUserId;
            }
        }
    }

    /**
     * Update state.options based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateOptions(nextState, nextProps) {
        if (!nextProps.story) {
            // reset options to default when a new story starts
            nextState.options = defaultOptions;
        } else {
            nextState.options = _.clone(nextState.options);
            nextState.options.hidePost = !nextState.draft.public;
            nextState.options.issueDetails = IssueUtils.extractIssueDetails(nextState.draft, nextProps.repos);
            if (!nextState.options.preview) {
                nextState.options.preview = this.choosePreview(nextState.draft);
            }
        }
    }

    /**
     * Update state.options.bookmarkRecipients based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateBookmarkRecipients(nextState, nextProps) {
        let targetUserIds = _.map(nextProps.recommendations, 'target_user_id');
        nextState.options = _.clone(nextState.options);
        nextState.options.bookmarkRecipients = _.union(nextState.options.bookmarkRecipients, targetUserIds);
    }

    /**
     * Update state.options.localeCode based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateLocaleCode(nextState, nextProps) {
        nextState.options = _.clone(nextState.options);
        nextState.options.localeCode = this.chooseLocale(nextState.draft, nextProps.locale);
    }

    /**
     * Update state.selectedResourceIndex
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateResourceIndex(nextState, nextProps) {
        let resources = _.get(nextState.draft, 'details.resources');
        let count = _.size(resources);
        if (nextState.selectedResourceIndex >= count) {
            nextState.selectedResourceIndex = count - 1;
        } else if (nextState.selectedResourceIndex < 0 && count > 0) {
            nextState.selectedResourceIndex = 0;
        }
    }

    /**
     * Choose preview type based on story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    choosePreview(story) {
        // show preview when text is formatted
        if (story.type === 'survey' || story.type === 'task-list') {
            return 'text';
        }
        if (_.get(story, 'details.markdown', false)) {
            return 'text';
        }
        // default to media until we know more
        return '';
    }

    /**
     * Choose locale based on selected locale and story contents
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    chooseLocale(story, locale) {
        let localeCode;
        let text = _.get(story, 'details.text');
        if (!_.isEmpty(text)) {
            // the country code may affect which dictionary is chosen
            // try to add it to the language code
            let languageCode = _.first(_.keys(text));
            if (languageCode === locale.languageCode) {
                // great, the current user speaks the language
                localeCode = locale.localeCode;
            } else {
                // use the first country on the list if the language is in
                // the directory
                let entry = _.find(locale.directory, { code: languageCode });
                if (entry) {
                    let countryCode = entry.defaultCountry;
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
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        switch (this.props.theme.mode) {
            case 'single-col':
                return this.renderSingleColumn();
            case 'double-col':
                return this.renderDoubleColumn();
            case 'triple-col':
                return this.renderTripleColumn();
        }
    }

    /**
     * Render single-column view
     *
     * @return {ReactElement}
     */
    renderSingleColumn() {
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
    }

    /**
     * Render double-column view
     *
     * @return {ReactElement}
     */
    renderDoubleColumn() {
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
    }

    /**
     * Render triple-column view
     *
     * @return {ReactElement}
     */
    renderTripleColumn() {
        let t = this.props.locale.translate;
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
    }

    /**
     * Render profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        let props = {
            user: _.get(this.props.authors, 0),
            theme: this.props.theme,
            size: 'medium',
        };
        return <ProfileImage {...props} />;
    }

    /**
     * Render the names of the author and co-authors
     *
     * @return {ReactElement}
     */
    renderAuthorNames() {
        let props = {
            authors: this.props.authors,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <AuthorNames {...props} />;
    }

    /**
     * Render button that opens coauthor selection dialog box
     *
     * @return {ReactElement}
     */
    renderCoauthoringButton() {
        let props = {
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
    }

    /**
     * Render the control for text entry
     *
     * @return {ReactElement}
     */
    renderTextArea() {
        let setters = this.components.setters;
        let loc = this.state.options.localeCode;
        let lang = loc.substr(0, 2);
        let langText = _.get(this.state.draft, [ 'details', 'text', lang ], '');
        let props = {
            value: langText,
            lang: loc,
            onChange: this.handleTextChange,
            onBeforeInput: this.handleBeforeInput,
            onKeyDown: this.handleKeyDown,
            onKeyUp: this.handleKeyUp,
            onPaste: this.handlePaste,
        };
        return <AutosizeTextArea ref={setters.textArea} {...props} />;
    }

    /**
     * Render cancel and post buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let draft = this.state.draft;
        let text = _.get(draft, 'details.text');
        let resources = _.get(draft, 'details.resources');
        let noText = _.isEmpty(_.pickBy(text));
        let noResources = _.isEmpty(resources);
        let pendingResource = hasPendingResources(resources)
        let publishing = _.get(draft, 'published', false);
        let cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
            disabled: (noText && noResources) || publishing,
        };
        let postButtonProps = {
            label: t('story-post'),
            onClick: this.handlePublishClick,
            emphasized: true,
            disabled: (noText && noResources) || pendingResource || publishing,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...postButtonProps} />
            </div>
        );
    }

    /**
     * Render text or media preview
     *
     * @return {ReactElement|null}
     */
    renderToolbar() {
        if (this.state.options.preview === 'text') {
            return this.renderTextToolbar();
        } else {
            return this.renderMediaToolbar();
        }
    }

    /**
     * Render buttons in title bar
     *
     * @return {ReactElement}
     */
    renderTextToolbar() {
        let props = {
            story: this.state.draft,
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <TextToolbar {...props} />;
    }

    /**
     * Render buttons for ataching media
     *
     * @return {ReactElement}
     */
    renderMediaToolbar() {
        let props = {
            story: this.state.draft,
            capturing: this.state.capturing,
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <MediaToolbar {...props} />;
    }

    /**
     * Render text or media preview
     *
     * @return {ReactElement|null}
     */
    renderPreview() {
        if (this.state.options.preview === 'text') {
            return this.renderTextPreview();
        } else {
            return this.renderMediaPreview();
        }
    }

    /**
     * Render MarkDown preview
     *
     * @return {ReactElement}
     */
    renderTextPreview() {
        let contents;
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
    }

    /**
     * Render text for regular post
     *
     * @return {ReactElement}
     */
    renderRegularPost() {
        let p = this.props.locale.pick;
        let className = 'text story';
        let draft = this.state.draft;
        let text = p(draft.details.text);
        if (draft.details.markdown) {
            text = Markdown.render(text, this.handleReference);
            className += ' markdown';
        } else {
            text = <p>{PlainText.renderEmoji(text)}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {text}
            </div>
        );
    }

    /**
     * Render task list
     *
     * @return {ReactElement}
     */
    renderTaskListText() {
        let p = this.props.locale.pick;
        let className = 'text task-list';
        let draft = this.state.draft;
        let text = p(draft.details.text);
        let list;
        if (draft.details.markdown) {
            // answers are written to the text itself, so there's no need to
            // provide user answers to Markdown.renderTaskList()
            list = Markdown.renderTaskList(text, null, this.handleItemChange, this.handleReference);
            className += ' markdown';
        } else {
            list = PlainText.renderTaskList(text, null, this.handleItemChange);
            list = <p>{list}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {list}
            </div>
        );
    }

    /**
     * Render survey choices or results depending whether user has voted
     *
     * @return {ReactElement}
     */
    renderSurveyText() {
        let p = this.props.locale.pick;
        let className = 'text survey';
        let draft = this.state.draft;
        let text = p(draft.details.text);
        let survey;
        if (draft.details.markdown) {
            survey = Markdown.renderSurvey(text, null, this.handleItemChange, this.handleReference);
            className += ' markdown';
        } else {
            survey = PlainText.renderSurvey(text, null, this.handleItemChange);
            survey = <p>{survey}</p>;
            className += ' plain-text';
        }
        return (
            <div className={className} onClick={this.handleTextClick}>
                {survey}
            </div>
        );
    }

    /**
     * Render preview of images and videos
     *
     * @return {ReactElement}
     */
    renderMediaPreview() {
        let editorProps = {
            allowEmbedding: true,
            allowShifting: true,
            resources: _.get(this.state.draft, 'details.resources'),
            resourceIndex: this.state.selectedResourceIndex,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourcesChange,
            onEmbed: this.handleResourceEmbed,
        };
        let placeholderProps = {
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
    }

    /**
     * Render preview of images and videos
     *
     * @return {ReactElement}
     */
    renderMediaImporter() {
        let props = {
            ref: this.components.setters.mediaImporter,
            resources: _.get(this.state.draft, 'details.resources', []),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            cameraDirection: 'back',
            onCaptureStart: this.handleCaptureStart,
            onCaptureEnd: this.handleCaptureEnd,
            onChange: this.handleResourcesChange,
        };
        return <MediaImporter {...props} />;
    }

    /**
     * Render popup menu
     *
     * @return {ReactElement}
     */
    renderPopUpMenu(section) {
        let ref = this.components.setters[section + 'PopUp'];
        return (
            <CornerPopUp ref={ref}>
                {this.renderOptions(section)}
            </CornerPopUp>
        );
    }

    /**
     * Render editor options
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions(section) {
        let props = {
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
    }

    /**
     * Render confirmation dialog box
     *
     * @return {ReactElement}
     */
    renderConfirmationDialogBox() {
        let t = this.props.locale.translate;
        let props = {
            show: this.state.confirming,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
        };
        let message;
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
    }

    componentDidUpdate(prevProp, prevState) {
        if (this.repositionCursor) {
            let target = this.repositionCursor.target;
            target.selectionStart = target.selectionEnd = this.repositionCursor.position;
            this.repositionCursor = null;
        }
    }

    /**
     * Set current draft
     *
     * @param  {Story} draft
     *
     * @return {Promise<Story>}
     */
    changeDraft(draft, resourceIndex) {
        return new Promise((resolve, reject) => {
            let options = this.state.options;
            if (!options.preview) {
                let preview = this.choosePreview(draft);
                if (preview) {
                    options = _.decoupleSet(options, 'preview', preview);
                }
            }
            let newState = { draft, options };
            if (resourceIndex !== undefined) {
                newState.selectedResourceIndex = resourceIndex;
            }
            this.setState(newState, () => {
                resolve(draft);
            });
        });
    }

    /**
     * Set options
     *
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    changeOptions(options) {
        return new Promise((resolve, reject) => {
            this.setState({ options }, () => {
                resolve(options);
            });
        });
    }

    /**
     * Set current draft and initiate autosave
     *
     * @param  {Story} draft
     * @param  {Boolean} immediate
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Story>}
     */
    saveDraft(draft, immediate, resourceIndex) {
        draft.public = !this.state.options.hidePost;
        return this.changeDraft(draft, resourceIndex).then((story) => {
            if (!hasPendingResources(story.details.resources)) {
                this.saveStory(story, immediate);
            }
            return story;
        });
    }

    /**
     * Save story to remote database
     *
     * @param  {Story} story
     * @param  {Boolean} immediate
     *
     * @return {Promise<Story>}
     */
    saveStory(story, immediate) {
        let params = this.props.route.parameters;
        let resources = story.details.resources || [];
        let original = this.state.original;
        let options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (StoryUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, story, options).then((story) => {
                // send images and videos to server
                this.props.payloads.dispatch(story);
                return story;
            });
        });
    }

    /**
     * Remove story from remote database
     *
     * @param  {Story} story
     *
     * @return {Promise<Story>}
     */
    removeStory(story) {
        let route = this.props.route;
        let schema = route.parameters.schema;
        let db = this.props.database.use({ schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    }

    /**
     * Remove current user from author list
     *
     * @return {Promise<Story>}
     */
    removeSelf() {
        let story = this.props.story;
        let userIds = _.without(story.user_ids, this.props.currentUser.id);
        let columns = {
            id: story.id,
            user_ids: userIds,
        };
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'story' }, columns);
        });
    }

    /**
     * Save bookmarks to remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    saveBookmarks(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.save({ table: 'bookmark' }, bookmarks);
        });
    }

    /**
     * Remove bookmarks from remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    removeBookmarks(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.remove({ table: 'bookmark' }, bookmarks);
        });
    }

    /**
     * Send bookmarks to recipients
     *
     * @param  {Story} story
     * @param  {Array<Number>} recipientIds
     *
     * @return {Promise<Array<Bookmark>>}
     */
    sendBookmarks(story, recipientIds) {
        let bookmarks = this.props.recommendations;
        let newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIds, (recipientId) => {
            if (!_.some(bookmarks, { target_user_id: recipientId })) {
                let newBookmark = {
                    story_id: story.published_version_id || story.id,
                    user_ids: [ this.props.currentUser.id ],
                    target_user_id: recipientId,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        let redundantBookmarks = [];
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
    }

    /**
     * Create a task in the backend
     *
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise<Task>}
     */
    sendTask(action, options) {
        let task = {
            action,
            options,
            user_id: this.props.currentUser.id,
            token: RandomToken.generate(),
        };
        let params = this.props.route.parameters;
        let db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'task' }, task);
        });
    }

    /**
     * Publish the story
     *
     * @return {[type]}
     */
    publishStory() {
        let draft = _.clone(this.state.draft);
        let options = this.state.options;
        if (!draft.type) {
            draft.type = 'post';
        }
        if (_.isEmpty(draft.role_ids)) {
            let roleIds = _.map(this.props.authors, 'role_ids');
            draft.role_ids = _.uniq(_.flatten(roleIds));
        }
        draft.published = true;

        return this.saveDraft(draft, true).then((story) => {
            return this.sendBookmarks(story, options.bookmarkRecipients).then(() => {
                let issueDetailsBefore = IssueUtils.extractIssueDetails(this.state.draft, this.props.repos);
                let issueDetailsAfter = this.state.options.issueDetails;
                if (!_.isEqual(issueDetailsAfter, issueDetailsBefore)) {
                    if (issueDetailsAfter) {
                        let params = _.clone(issueDetailsAfter);
                        params.story_id = story.id;
                        return this.sendTask('export-issue', params);
                    }
                }
            });
        });
    }

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     */
    handlePublishClick = (evt) => {
        this.publishStory();
    }

    /**
     * Called when user changes the text
     *
     * @param  {Event} evt
     */
    handleTextChange = (evt) => {
        let langText = evt.currentTarget.value;
        let loc = this.state.options.localeCode;
        let lang = loc.substr(0, 2);
        if (loc) {
            lang = loc.substr(0, 2);
        } else {
            // locale isn't set--use current locale
            lang = this.props.locale.languageCode;
        }
        let path = `details.text.${lang}`;
        let draft = _.decoupleSet(this.state.draft, path, langText);

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

        if (draft.type === 'task-list') {
            // update unfinished_tasks
            let counts = [];
            _.each(draft.details.text, (langText) => {
                let tokens = ListParser.extract(langText);
                let unfinished = ListParser.count(tokens, false);
                counts.push(unfinished);
            });
            draft.unfinished_tasks = _.max(counts);
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
    }

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyDown = (evt) => {
        this.lastInput = null;
    }

    /**
     * Called when keystrokes generate text input
     *
     * @param  {Event} evt
     */
    handleBeforeInput = (evt) => {
        let target = evt.target;
        if (evt.data === '\n') {
            let storyType = this.state.draft.type;
            if (storyType !== 'survey' && storyType !== 'task-list') {
                if (this.props.theme.mode === 'single-col') {
                    evt.preventDefault();
                    this.handlePublishClick(evt);
                    target.blur();
                    return;
                }
            }
        }
        this.lastInput = evt.data;
    }

    /**
     * Called when user releases a key
     *
     * @param  {Event} evt
     */
    handleKeyUp = (evt) => {
        let target = evt.target;
        if (this.lastInput === '\n') {
            let storyType = this.state.draft.type;
            if (storyType === 'survey' || storyType === 'task-list') {
                // see if there's survey or task-list item on the line where
                // the cursor is at
                let value = target.value;
                let selStart = target.selectionStart;
                let textInFront = value.substr(0, selStart);
                let lineFeedIndex = _.lastIndexOf(textInFront.substr(0, textInFront.length - 1), '\n');
                let lineInFront = textInFront.substr(lineFeedIndex + 1);
                let tokens = ListParser.extract(lineInFront);
                let item = _.get(tokens, [ 0, 0 ]);
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
        } else if (this.lastInput === ']') {
            let value = target.value;
            let selStart = target.selectionStart;
            let textInFront = value.substr(0, selStart);
            let lineFeedIndex = _.lastIndexOf(textInFront, '\n');
            let lineInFront = textInFront.substr(lineFeedIndex + 1);
            if (/^\s*\*\[\]/.test(lineInFront)) {
                target.selectionStart = selStart - 3;
                document.execCommand("insertText", false, '* [ ]');
            }
        }
    }

    /**
     * Called when user paste into editor
     *
     * @param  {Event} evt
     */
    handlePaste = (evt) => {
        Promise.all([
            this.components.mediaImporter.importFiles(evt.clipboardData.files),
            this.components.mediaImporter.importDataItems(evt.clipboardData.items)
        ]);
        if (evt.clipboardData.files.length > 0) {
            evt.preventDefault();
        }
    }

    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Story>}
     */
    handleCancelClick = (evt) => {
        let action;
        if (this.isCoauthoring()) {
            action = 'remove-self';
        } else if (this.props.isStationary) {
            action = 'delete-post';
        } else {
            action = 'cancel-edit';
        }
        this.setState({ confirming: true, action });
    }

    /**
     * Called when options are changed
     *
     * @param  {Object} evt
     *
     * @return {Promise<Object>}
     */
    handleOptionChange = (evt) => {
        return this.changeOptions(evt.options);
    }

    /**
     * Called when a change to the story options is complete
     *
     * @param  {Object} evt
     */
    handleOptionComplete = (evt) => {
        let section = evt.target.props.section;
        let popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
    }

    /**
     * Called when user cancel an action
     *
     * @param  {Event} evt
     */
    handleDialogClose = (evt) => {
        this.setState({ confirming: false });
    }

    /**
     * Called when user confirms his desire to cancel a story
     *
     * @param  {Event} evt
     */
    handleCancelConfirm = (evt) => {
        this.setState({ confirming: false });
        let draft = this.state.draft;
        if (this.props.isStationary) {
            // when it's the top editor, create a blank story first, since this
            // instance of the component will be reused
            let blank = createBlankStory(this.props.currentUser);
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
    }

    /**
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference = (evt) => {
        let resources = this.state.draft.details.resources;
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let theme = this.props.theme;
            let url;
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
    }

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
    handleTextClick = (evt) => {
        let target = evt.target;
        if (target.viewportElement) {
            target = target.viewportElement;
        }
        let name;
        if (target.tagName === 'svg') {
            let title = target.getElementsByTagName('title')[0];
            if (title) {
                name = title.textContent;
            }
        } else {
            name = evt.target.title;
        }
        if (name) {
            let resources = this.state.draft.details.resources;
            let res = Markdown.findReferencedResource(resources, name);
            if (res) {
                let selectedResourceIndex = _.indexOf(resources, res);
                let options = _.decoupleSet(this.state.options, 'preview', 'media');
                this.setState({ selectedResourceIndex, options });
            }
        }
    }

    /**
     * Called when user click a checkbox or radio button in the preview
     *
     * @param  {Event} evt
     */
    handleItemChange = (evt) => {
        // update the text of the story to reflect the selection
        let target = evt.currentTarget;
        let list = parseInt(target.name);
        let item = parseInt(target.value);
        let selected = target.checked;
        let draft = _.decouple(this.state.draft, 'details');
        if (draft.type === 'task-list') {
            let counts = [];
            draft.details.text = _.mapValues(draft.details.text, (langText) => {
                let tokens = ListParser.extract(langText);
                ListParser.set(tokens, list, item, selected);
                let unfinished = ListParser.count(tokens, false);
                counts.push(unfinished);
                return ListParser.join(tokens);
            });
            draft.unfinished_tasks = _.max(counts);
        } else if (draft.type === 'survey') {
            draft.details.text = _.mapValues(draft.details.text, (langText) => {
                let tokens = ListParser.extract(langText);
                ListParser.set(tokens, list, item, selected, true);
                return ListParser.join(tokens);
            });
        }
        this.saveDraft(draft);
    }

    /**
     * Called when user confirms his desire to remove himself as a co-author
     *
     * @param  {Event} evt
     */
    handleRemoveConfirm = (evt) => {
        this.setState({ confirming: false });
        this.removeSelf();
    }

    /**
     * Called when user has added or removed users from author list
     *
     * @param  {Object} evt
     */
    handleCoauthorSelect = (evt) => {
        let draft = _.decoupleSet(this.state.draft, 'user_ids', evt.selection);
        this.saveDraft(draft, true);
    }

    /**
     * Called when user add new resources or adjusted image cropping
     *
     * @param  {Object} evt
     */
    handleResourcesChange = (evt) => {
        let resourcesBefore = this.state.draft.resources;
        let resourcesAfter = evt.resources;
        let selectedResourceIndex = evt.selection;
        if (selectedResourceIndex === undefined) {
            selectedResourceIndex = this.state.selectedResourceIndex;
        }
        if (resourcesBefore !== resourcesAfter) {
            let draft = _.decoupleSet(this.state.draft, 'details.resources', resourcesAfter);
            let immediate = false;
            if (hasPendingResources(resourcesAfter)) {
                if (hasUnsentFiles(resourcesAfter)) {
                    immediate = true;
                }
            }
            this.saveDraft(draft, immediate, selectedResourceIndex);
        } else {
            this.setState({ selectedResourceIndex });
        }
    }

    /**
     * Called when user wants to embed a resource into Markdown text
     *
     * @param  {Object} evt
     */
    handleResourceEmbed = (evt) => {
        let resource = evt.resource;
        let draft = _.decouple(this.state.draft, 'details');
        let resources = draft.details.resources;
        let resourcesOfType = _.filter(resources, { type: resource.type });
        let index = _.indexOf(resourcesOfType, resource);
        if (index !== -1) {
            // keep previewing media
            let options = _.clone(this.state.options);
            options.preview = 'media';
            this.changeOptions(options).then(() => {
                _.set(draft, `details.markdown`, true);
                this.changeDraft(draft).then(() => {
                    let textArea = this.components.textArea.getElement();
                    textArea.focus();
                    setTimeout(() => {
                        let addition = `![${resource.type}-${index+1}]`;
                        document.execCommand("insertText", false, addition);
                    }, 10);
                });
            });
        }
    }

    /**
     * Called when user drops an item over the editor
     *
     * @param  {Event} evt
     */
    handleDrop = (evt) => {
        Promise.all([
            this.components.mediaImporter.importFiles(evt.files),
            this.components.mediaImporter.importDataItems(evt.items),
        ]);
    }

    /**
     * Called when MediaEditor opens one of the capture dialog boxes
     *
     * @param  {Object} evt
     */
    handleCaptureStart = (evt) => {
        this.setState({ capturing: evt.mediaType });
    }

    /**
     * Called when MediaEditor stops rendering a media capture dialog box
     *
     * @param  {Object} evt
     */
    handleCaptureEnd = (evt) => {
        this.setState({ capturing: null });
    }

    /**
     * Called when user initiates an action
     *
     * @param  {Object} evt
     */
    handleAction = (evt) => {
        switch (evt.action) {
            case 'markdown-set':
                let draft = _.decouple(this.state.draft, 'details');
                draft.details.markdown = evt.value;
                this.saveDraft(draft);
                break;
            case 'story-type-set':
                let draft = _.decouple(this.state.draft, 'details');
                draft.type = evt.value;
                // attach a list template to the story if there's no list yet
                if (draft.type === 'task-list' || draft.type === 'survey') {
                    let textArea = this.components.textArea.getElement();
                    textArea.focus();
                    if (!ListParser.detect(textArea.value)) {
                        setTimeout(() => {
                            let value = textArea.value;
                            let addition = '* [ ] ';
                            let selStart = textArea.selectionStart;
                            let textInFront = value.substr(0, selStart);
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
                this.components.mediaImporter.importFiles(evt.files);
                break;
        }
    }
}

let defaultOptions = {
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

function hasPendingResources(resources) {
    return _.some(resources, (res) => {
        if (res.pending) {
            return true;
        }
    });
}

function hasUnsentFiles(resources) {
    return _.some(resources, (res) => {
        if (!res.url && !res.payload_id) {
            return true;
        }
    });
}

StoryEditor.defaultProps = {
    isStationary: false
};

export {
    StoryEditor as default,
    StoryEditor,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryEditor.propTypes = {
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
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
