import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as ListParser from 'utils/list-parser';
import * as Markdown from 'utils/markdown';
import * as PlainText from 'utils/plain-text';
import * as TagScanner from 'utils/tag-scanner';
import * as FocusManager from 'utils/focus-manager';
import ComponentRefs from 'utils/component-refs';
import * as StoryUtils from 'objects/utils/story-utils';
import * as IssueUtils from 'objects/utils/issue-utils';
import * as ResourceUtils from 'objects/utils/resource-utils';
import * as TemporaryID from 'data/remote-data-source/temporary-id';
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

/**
 * Component for creating or editing a story.
 *
 * @extends PureComponent
 */
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
        let { highlighting } = this.props;
        let className = 'story-editor';
        if (highlighting) {
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
        let { story, currentUser } = this.props;
        let userIDs = _.get(story, 'user_ids');
        let currentUserID = _.get(currentUser, 'id');
        return _.indexOf(userIDs, currentUserID) > 0;
    }

    /**
     * Update state when certain props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { env, story, currentUser, repos, recommendations } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.story !== story) {
            this.updateDraft(nextState, nextProps);
            this.updateOptions(nextState, nextProps);
            this.updateLocaleCode(nextState, nextProps);
            this.updateResourceIndex(nextState, nextProps);
        }
        if (nextProps.currentUser !== currentUser) {
            this.updateLeadAuthor(nextState, nextProps);
        }
        if (nextProps.env.locale !== env.locale) {
            this.updateLocaleCode(nextState, nextProps);
        }
        if (nextProps.recommendations !== recommendations) {
            this.updateBookmarkRecipients(nextState, nextProps);
        }
        if (nextProps.repos !== repos) {
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
            let currentUserID = _.get(nextProps.currentUser, 'id');
            if (!nextState.draft.user_ids) {
                nextState.draft = _.decouple(nextState.draft, 'user_ids', []);
                nextState.draft.user_ids[0] = currentUserID;
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
        let targetUserIDs = _.map(nextProps.recommendations, 'target_user_id');
        nextState.options = _.clone(nextState.options);
        nextState.options.bookmarkRecipients = _.union(nextState.options.bookmarkRecipients, targetUserIDs);
    }

    /**
     * Update state.options.localeCode based on props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateLocaleCode(nextState, nextProps) {
        nextState.options = _.clone(nextState.options);
        nextState.options.localeCode = this.chooseLocale(nextState.draft, nextProps.env);
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
     * @param  {Environment} env
     *
     * @return {String}
     */
    chooseLocale(story, env) {
        let localeCode;
        let text = _.get(story, 'details.text');
        if (!_.isEmpty(text)) {
            // the country code may affect which dictionary is chosen
            // try to add it to the language code
            let languageCode = _.first(_.keys(text));
            if (languageCode === env.locale.languageCode) {
                // great, the current user speaks the language
                localeCode = env.locale.localeCode;
            } else {
                // use the first country on the list if the language is in
                // the directory
                let entry = _.find(env.locale.directory, { code: languageCode });
                if (entry) {
                    let countryCode = entry.defaultCountry;
                    localeCode = `${languageCode}-${countryCode}`;
                } else {
                    // shouldn't really happen
                    localeCode = languageCode;
                }
            }
        } else {
            localeCode = env.locale.localeCode;
        }
        return localeCode;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        if (env.isWiderThan('triple-col')) {
            return this.renderTripleColumn();
        } else if (env.isWiderThan('double-col')) {
            return this.renderDoubleColumn();
        } else {
            return this.renderSingleColumn();
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
        let { env } = this.props;
        let { t } = env.locale;
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
        let { env, authors } = this.props;
        let props = {
            user: _.get(authors, 0),
            env,
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
        let { env, authors } = this.props;
        let props = { authors, env };
        return <AuthorNames {...props} />;
    }

    /**
     * Render button that opens coauthor selection dialog box
     *
     * @return {ReactElement}
     */
    renderCoauthoringButton() {
        let { database, route, env } = this.props;
        let { draft } = this.state;
        let props = {
            coauthoring: this.isCoauthoring(),
            story: draft,
            database,
            route,
            env,
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
        let { draft, options } = this.state;
        let { setters } = this.components;
        let languageCode = options.localeCode.substr(0, 2);
        let langText = _.get(draft, `details.text.${languageCode}`, '');
        let props = {
            value: langText,
            lang: options.localeCode,
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
        let { env } = this.props;
        let { draft } = this.state;
        let { t } = env.locale;
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
        let { options } = this.state;
        if (options.preview === 'text') {
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
        let { env } = this.props;
        let { draft } = this.state;
        let props = {
            story: draft,
            env,
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
        let { env } = this.props;
        let { draft, capturing } = this.state;
        let props = {
            story: draft,
            capturing,
            env,
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
        let { options } = this.state;
        if (options.preview === 'text') {
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
        let { draft } = this.state;
        let contents;
        switch (draft.type) {
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
        let { env } = this.props;
        let { draft } = this.state;
        let { p } = env.locale;
        let className = 'text story';
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
        let { env } = this.props;
        let { draft } = this.state;
        let { p } = env.locale;
        let className = 'text task-list';
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
        let { env } = this.props;
        let { draft } = this.state;
        let { p } = env.locale;
        let className = 'text survey';
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
        let { payloads, env, isStationary } = this.props;
        let { draft, selectedResourceIndex } = this.state;
        let editorProps = {
            allowEmbedding: true,
            allowShifting: true,
            resources: _.get(draft, 'details.resources'),
            resourceIndex: selectedResourceIndex,
            payloads,
            env,
            onChange: this.handleResourcesChange,
            onEmbed: this.handleResourceEmbed,
        };
        let placeholderProps = {
            showHints: isStationary,
            env,
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
        let { payloads, env } = this.props;
        let { draft } = this.state;
        let { setters } = this.components;
        let props = {
            ref: setters.mediaImporter,
            resources: _.get(draft, 'details.resources', []),
            cameraDirection: 'back',
            payloads,
            env,
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
        let { setters } = this.components;
        let ref = setters[section + 'PopUp'];
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
        let { database, route, env, currentUser, repos } = this.props;
        let { draft, options } = this.state;
        let props = {
            section,
            story: draft,
            options,
            currentUser,
            repos,
            database,
            route,
            env,
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
        let { env } = this.props;
        let { action, confirming } = this.state;
        let { t } = env.locale;
        let props = {
            show: confirming,
            env,
            onClose: this.handleDialogClose,
        };
        let message;
        switch (action) {
            case 'delete-post':
                message = t('story-cancel-are-you-sure');
                props.onConfirm = this.handleCancelConfirm;
                break;
            case 'cancel-edit':
                message = t('story-cancel-edit-are-you-sure');
                props.onConfirm = this.handleCancelConfirm;
                break;
            case 'remove-self':
                message = t('story-remove-yourself-are-you-sure');
                props.onConfirm = this.handleRemoveConfirm;
                break;
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
        let { options } = this.state;
        return new Promise((resolve, reject) => {
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
    async saveDraft(draft, immediate, resourceIndex) {
        let { options } = this.state;
        draft.public = !options.hidePost;
        let story = await this.changeDraft(draft, resourceIndex);
        if (!hasPendingResources(story.details.resources)) {
            this.saveStory(story, immediate);
        }
        return story;
    }

    /**
     * Save story to remote database
     *
     * @param  {Story} story
     * @param  {Boolean} immediate
     *
     * @return {Promise<Story>}
     */
    async saveStory(story, immediate) {
        let { database, payloads } = this.props;
        let { original } = this.state;
        let resources = story.details.resources || [];
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
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        let storyAfter = await db.saveOne({ table: 'story' }, story, options);
        // send images and videos to server
        payloads.dispatch(storyAfter);
        return storyAfter;
    }

    /**
     * Remove story from remote database
     *
     * @param  {Story} story
     *
     * @return {Promise}
     */
    removeStory(story) {
        let { database, payloads } = this.props;
        let db = database.use({ by: this });
        await db.removeOne({ table: 'story' }, story);
        await payloads.abandon(story);
    }

    /**
     * Remove current user from author list
     *
     * @return {Promise<Story>}
     */
    async removeSelf() {
        let { database, story, currentUser } = this.props;
        let userIDs = _.without(story.user_ids, currentUser.id);
        let columns = {
            id: story.id,
            user_ids: userIDs,
        };
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        return db.saveOne({ table: 'story' }, columns);
    }

    /**
     * Save bookmarks to remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    async saveBookmarks(bookmarks) {
        let { database } = this.props;
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        return db.save({ table: 'bookmark' }, bookmarks);
    }

    /**
     * Remove bookmarks from remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    async removeBookmarks(bookmarks) {
        let { database } = this.props;
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        return db.remove({ table: 'bookmark' }, bookmarks);
    }

    /**
     * Send bookmarks to recipients
     *
     * @param  {Story} story
     * @param  {Array<Number>} recipientIDs
     *
     * @return {Promise<Array<Bookmark>>}
     */
    async sendBookmarks(story, recipientIDs) {
        let { bookmarks, currentUser } = this.props;
        let newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIDs, (recipientID) => {
            if (!_.some(bookmarks, { target_user_id: recipientID })) {
                let newBookmark = {
                    story_id: story.published_version_id || story.id,
                    user_ids: [ currentUser.id ],
                    target_user_id: recipientID,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        let redundantBookmarks = [];
        _.each(bookmarks, (bookmark) => {
            if (!_.includes(recipientIDs, bookmark.target_user_id)) {
                redundantBookmarks.push(bookmark);
            }
        });
        let newBookmarksAfter = await this.saveBookmarks(newBookmarks);
        let redundantBookmarksAfter = await this.removeBookmarks(redundantBookmarks);
        return _.concat(newBookmarksAfter, redundantBookmarksAfter);
    }

    /**
     * Create a task in the backend
     *
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise<Task>}
     */
    async sendTask(action, options) {
        let { database, currentUser } = this.props;
        let task = {
            action,
            options,
            user_id: currentUser.id,
            token: RandomToken.generate(),
        };
        let db = database.use({ by: this });
        let currentUserID = await db.start();
        return db.saveOne({ table: 'task' }, task);
    }

    /**
     * Publish the story
     *
     * @return {Promise}
     */
    async publishStory() {
        let { env, authors, repos } = this.props;
        let { draft, options } = this.state;
        draft = _.clone(draft);
        if (!draft.type) {
            draft.type = 'post';
        }
        let roleIDs = _.map(authors, 'role_ids');
        draft.role_ids = _.uniq(_.flatten(roleIDs));
        draft.published = true;

        let resources = draft.details.resources;
        await ResourceUtils.attachMosaic(resources, env);
        let story = await this.saveStory(draft, true);
        await this.sendBookmarks(story, options.bookmarkRecipients);
        let issueDetailsBefore = IssueUtils.extractIssueDetails(draft, repos);
        let issueDetailsAfter = options.issueDetails;
        if (!_.isEqual(issueDetailsAfter, issueDetailsBefore)) {
            if (issueDetailsAfter) {
                let params = _.clone(issueDetailsAfter);
                params.story_id = story.id;
                await this.sendTask('export-issue', params);
            }
        }
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
        let { env } = this.props;
        let { draft, options } = this.state;
        let langText = evt.currentTarget.value;
        let lang = options.localeCode.substr(0, 2);
        if (!lang) {
            // locale isn't set--use current locale
            lang = env.locale.languageCode;
        }
        let path = `details.text.${lang}`;
        draft = _.decoupleSet(draft, path, langText);

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
        let { env } = this.props;
        let { draft } = this.state;
        let target = evt.target;
        if (evt.data === '\n') {
            if (draft.type !== 'survey' && draft.type !== 'task-list') {
                if (!env.isWiderThan('double-col')) {
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
        let { env } = this.props;
        let { draft } = this.state;
        let target = evt.target;
        if (this.lastInput === '\n') {
            if (draft.type === 'survey' || draft.type === 'task-list') {
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
        let { mediaImporter } = this.components;
        mediaImporter.importFiles(evt.clipboardData.files);
        mediaImporter.importDataItems(evt.clipboardData.items);
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
        let { isStationary } = this.props;
        let action;
        if (this.isCoauthoring()) {
            action = 'remove-self';
        } else if (isStationary) {
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
    handleCancelConfirm = async (evt) => {
        let { currentUser, isStationary } = this.props;
        let { draft } = this.state;
        this.setState({ confirming: false });
        if (isStationary) {
            // when it's the top editor, create a blank story first, since this
            // instance of the component will be reused
            let blank = createBlankStory(currentUser);
            await this.changeDraft(blank);
            if (draft.id) {
                await this.removeStory(draft);
            }
        } else {
            await this.removeStory(draft);
        }
    }

    /**
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference = (evt) => {
        let { env } = this.props;
        let { draft } = this.state;
        let resources = draft.details.resources;
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let url = ResourceUtils.getMarkdownIconURL(res, evt.forImage, env);
            return { href: url, title: evt.name };
        }
    }

    /**
     * Called when user clicks on the text contents
     *
     * @param  {Event} evt
     */
    handleTextClick = (evt) => {
        if (evt.target.tagName !== 'INPUT') {
            evt.preventDefault();
        }

        let { draft, options } = this.state;
        let target = evt.target;
        if (target.viewportElement) {
            target = target.viewportElement;
        }
        let name;
        if (target.tagName === 'svg') {
            // title is an element not an attribute when it's SVG
            let title = target.getElementsByTagName('title')[0];
            if (title) {
                name = title.textContent;
            }
        } else {
            name = evt.target.title;
        }
        if (name) {
            let resources = draft.details.resources;
            let res = Markdown.findReferencedResource(resources, name);
            if (res) {
                let selectedResourceIndex = _.indexOf(resources, res);
                options = _.decoupleSet(options, 'preview', 'media');
                this.setState({ selectedResourceIndex, options });
            }
        } else {
            if (target.tagName === 'A') {
                window.open(target.href, '_blank');
            } else if (target.tagName === 'IMG') {
                let src = target.getAttribute('src');
                let targetRect = target.getBoundingClientRect();
                let width = target.naturalWidth + 50;
                let height = target.naturalHeight + 50;
                let left = targetRect.left + window.screenLeft;
                let top = targetRect.top + window.screenTop;
                window.open(target.src, '_blank', `width=${width},height=${height},left=${left},top=${top}status=no,menubar=no`);
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
        let { draft } = this.state;
        let target = evt.currentTarget;
        let list = parseInt(target.name);
        let item = parseInt(target.value);
        let selected = target.checked;
        draft = _.decouple(draft, 'details');
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
        let { draft } = this.state;
        draft = _.decoupleSet(draft, 'user_ids', evt.selection);
        this.saveDraft(draft, true);
    }

    /**
     * Called when user add new resources or adjusted image cropping
     *
     * @param  {Object} evt
     */
    handleResourcesChange = (evt) => {
        let { draft, selectedResourceIndex } = this.state;
        let resourcesBefore = draft.resources;
        let resourcesAfter = evt.resources;
        if (evt.selection !== undefined) {
            selectedResourceIndex = evt.selection;
        }
        if (resourcesBefore !== resourcesAfter) {
            draft = _.decoupleSet(draft, 'details.resources', resourcesAfter);
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
    handleResourceEmbed = async (evt) => {
        let { draft, options } = this.state;
        let { textArea } = this.components;
        let resource = evt.resource;
        draft = _.decouple(draft, 'details');
        let resources = draft.details.resources;
        let resourcesOfType = _.filter(resources, { type: resource.type });
        let index = _.indexOf(resourcesOfType, resource);
        if (index !== -1) {
            // keep previewing media
            options = _.clone(options);
            options.preview = 'media';
            await this.changeOptions(options);
            _.set(draft, `details.markdown`, true);
            await this.changeDraft(draft);
            textArea = textArea.getElement();
            textArea.focus();
            setTimeout(() => {
                let addition = `![${resource.type}-${index+1}]`;
                document.execCommand("insertText", false, addition);
            }, 10);
        }
    }

    /**
     * Called when user drops an item over the editor
     *
     * @param  {Event} evt
     */
    handleDrop = (evt) => {
        let { mediaImporter } = this.components;
        mediaImporter.importFiles(evt.files)
        mediaImporter.importDataItems(evt.items)
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
        let { draft } = this.state;
        let { textArea, mediaImporter } = this.components;
        switch (evt.action) {
            case 'markdown-set':
                draft = _.decoupleSet(draft, 'details.markdown', evt.value);
                this.saveDraft(draft);
                break;
            case 'story-type-set':
                draft = _.decoupleSet(draft, 'type', evt.value);
                // attach a list template to the story if there's no list yet
                if (draft.type === 'task-list' || draft.type === 'survey') {
                    textArea = textArea.getElement();
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
                mediaImporter.capture('image');
                break;
            case 'video-capture':
                mediaImporter.capture('video');
                break;
            case 'audio-capture':
                mediaImporter.capture('audio');
                break;
            case 'file-import':
                mediaImporter.importFiles(evt.files);
                break;
        }
    }
}

const defaultOptions = {
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
        id: TemporaryID.allocate(),
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
