import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { memoizeWeak } from 'utils/memoize';
import * as DeviceManager from 'media/device-manager';
import ComponentRefs from 'utils/component-refs';
import * as TagScanner from 'utils/tag-scanner';
import * as Markdown from 'utils/markdown';
import * as FocusManager from 'utils/focus-manager';
import * as ReactionUtils from 'objects/utils/reaction-utils';
import * as ResourceUtils from 'objects/utils/resource-utils';

// widgets
import AutosizeTextArea from 'widgets/autosize-text-area';
import PushButton from 'widgets/push-button';
import HeaderButton from 'widgets/header-button';
import ProfileImage from 'widgets/profile-image';
import DropZone from 'widgets/drop-zone';
import ReactionMediaToolbar from 'widgets/reaction-media-toolbar';
import MediaEditor from 'editors/media-editor';
import MediaImporter from 'editors/media-importer';

import './reaction-editor.scss';

const AUTOSAVE_DURATION = 2000;

/**
 * Component for creating or editing a comment--the only reaction where the
 * user enters the text.
 *
 * @extends PureComponent
 */
class ReactionEditor extends PureComponent {
    static displayName = 'ReactionEditor';

    constructor(props) {
        super(props);

        this.components = ComponentRefs({
            mediaImporter: MediaImporter,
            textArea: AutosizeTextArea,
        });
        this.state = {
            draft: null,
            original: null,
            selectedResourceIndex: 0,
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        };
        this.updateDraft(this.state, props);
        this.updateResourceIndex(this.state, props);
    }

    /**
     * Update draft upon receiving data from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { reaction } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.reaction !== reaction) {
            this.updateDraft(nextState, nextProps);
            this.updateResourceIndex(nextState, nextProps);
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    /**
     * Update reaction object with information from new props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateDraft(nextState, nextProps) {
        if (nextProps.reaction) {
            nextState.draft = nextProps.reaction;
            if (!nextProps.reaction.uncommitted) {
                nextState.original = nextProps.reaction;
            }
        } else {
            nextState.draft = createBlankComment(nextProps.story, nextProps.currentUser);
            nextState.original = null;
        }
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
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="reaction-editor">
                <div className="profile-image-column">
                    {this.renderProfileImage()}
                </div>
                <div className="editor-column">
                    <div className="controls">
                        <div className="textarea">
                            {this.renderTextArea()}
                        </div>
                        <div className="buttons">
                            {this.renderMediaToolbar()}
                            {this.renderActionButtons()}
                        </div>
                    </div>
                    <div className="media">
                        {this.renderMediaEditor()}
                        {this.renderMediaImporter()}
                    </div>
                </div>
            </div>
        )
    }

    /**
     * Render profile image of current user
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        let { env, currentUser } = this.props;
        let props = {
            user: currentUser,
            env,
            size: 'small',
        };
        return <ProfileImage {...props} />;
    }

    /**
     * Render text area
     *
     * @return {ReactElement}
     */
    renderTextArea() {
        let { env } = this.props;
        let { draft } = this.state;
        let { setters } = this.components;
        let { languageCode, localeCode } = env.locale;
        let langText = _.get(draft, [ 'details', 'text', languageCode ], '');
        let textareaProps = {
            ref: setters.textArea,
            value: langText,
            lang: localeCode,
            onChange: this.handleTextChange,
            onKeyPress: this.handleKeyPress,
            onPaste: this.handlePaste,
        };
        return <AutosizeTextArea {...textareaProps} />
    }

    /**
     * Render button of attaching media to comment
     *
     * @return {ReactElement}
     */
    renderMediaToolbar() {
        let { env } = this.props;
        let { draft, capturing } = this.state;
        let props = {
            reaction: draft,
            capturing,
            env,
            onAction: this.handleAction,
        };
        return <ReactionMediaToolbar {...props} />;
    }

    /**
     * Render post and cancel buttons
     *
     * @return {ReactElement}
     */
    renderActionButtons() {
        let { env } = this.props;
        let { draft } = this.state;
        let { t } = env.locale;
        let noText = _.isEmpty(_.get(draft, 'details.text'));
        let noResources = _.isEmpty(_.get(draft, 'details.resources'));
        let publishing = _.get(draft, 'published', false);
        let cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
            disabled: publishing,
        };
        let postButtonProps = {
            label: t('story-post'),
            onClick: this.handlePublishClick,
            emphasized: true,
            disabled: (noText && noResources) || publishing,
        };
        return (
            <div className="action-buttons">
                <PushButton {...cancelButtonProps} />
                <PushButton {...postButtonProps} />
            </div>
        );
    }

    /**
     * Render resources editor
     *
     * @return {ReactElement}
     */
    renderMediaEditor() {
        let { env, payloads } = this.props;
        let { draft, selectedResourceIndex } = this.state;
        let { t } = env.locale;
        let props = {
            allowShifting: env.isWiderThan('double-col'),
            resources: _.get(draft, 'details.resources'),
            resourceIndex: selectedResourceIndex,
            payloads,
            env,
            onChange: this.handleResourcesChange,
        };
        return (
            <MediaEditor {...props} />
        );
    }

    /**
     * Render resources importer
     *
     * @return {ReactElement}
     */
    renderMediaImporter() {
        let { env, payloads } = this.props;
        let { draft } = this.state;
        let { setters } = this.components;
        let { t } = env.locale;
        let props = {
            ref: setters.mediaImporter,
            resources: _.get(draft, 'details.resources', []),
            payloads,
            env,
            cameraDirection: 'back',
            onCaptureStart: this.handleCaptureStart,
            onCaptureEnd: this.handleCaptureEnd,
            onChange: this.handleResourcesChange,
        };
        return (
            <MediaImporter {...props} />
        );
    }

    /**
     * Register the component at FocusManager so others can bring focus to it
     */
    componentDidMount() {
        let { story, currentUser } = this.props;
        FocusManager.register(this, {
            type: 'ReactionEditor',
            story_id: story.id,
            user_id: currentUser.id,
        });
    }

    /**
     * Unregister on unmount
     */
    componentWillUnmount() {
        FocusManager.unregister(this);
    }

    /**
     * Set current draft
     *
     * @param  {Reaction} draft
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Reaction>}
     */
    changeDraft(draft, resourceIndex) {
        return new Promise((resolve, reject) => {
            let newState = { draft };
            if (resourceIndex !== undefined) {
                newState.selectedResourceIndex = resourceIndex;
            }
            this.setState(newState, () => {
                resolve(draft);
            });
        });
    }

    /**
     * Set current draft and initiate autosave
     *
     * @param  {Reaction} draft
     * @param  {Boolean} immediate
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Reaction>}
     */
    saveDraft(draft, immediate, resourceIndex) {
        return this.changeDraft(draft, resourceIndex).then((reaction) => {
            this.saveReaction(reaction, immediate);
            return reaction;
        });
    }

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     * @param  {Boolean} immediate
     *
     * @return {Promise<Reaction>}
     */
    saveReaction(reaction, immediate) {
        let { database, payloads } = this.props;
        let { original } = this.state;
        // send images and videos to server
        let options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (ReactionUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        let db = database.use({ by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction, options).then((reaction) => {
                // start file upload
                payloads.dispatch(reaction);
                return reaction;
            });
        });
    }

    /**
     * Remove reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction(reaction) {
        let { database } = this.props;
        let db = database.use({ by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    }

    /**
     * Inform parent component that editing is over
     */
    triggerFinishEvent() {
        let { onFinish } = this.props;
        if (onFinish) {
            onFinish({
                type: 'finish',
                target: this,
            });
        }
    }

    /**
     * Focus text area
     */
    focus() {
        let { textArea } = this.components;
        if (textArea) {
            textArea.focus();
        }
    }

    /**
     * Called when user changes contents in text area
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handleTextChange = (evt) => {
        let { env } = this.props;
        let { draft } = this.state;
        let { languageCode } = env.locale;
        let langText = evt.currentTarget.value;
        let path = `details.text.${languageCode}`;
        draft = _.decoupleSet(draft, path, langText);

        // automatically enable Markdown formatting
        if (draft.details.markdown === undefined) {
            if (Markdown.detect(langText, this.handleReference)) {
                draft.details.markdown = true;
            }
        }

        // look for tags
        draft.tags = TagScanner.findTags(draft.details.text);
        return this.saveDraft(draft);
    }

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyPress = (evt) => {
        let { env } = this.props;
        let target = evt.target;
        if (evt.charCode == 0x0D) {
            if (!env.isWiderThan('double-col')) {
                evt.preventDefault();
                this.handlePublishClick(evt);
                target.blur();
            }
        }
    }

    /**
     * Called when user paste into editor
     *
     * @param  {Event} evt
     */
    handlePaste = (evt) => {
        let { mediaImport } = this.components;
        mediaImporter.importFiles(evt.clipboardData.files);
        mediaImporter.importDataItems(evt.clipboardData.items);
    }

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handlePublishClick = (evt) => {
        let { env } = this.props;
        let { draft } = this.state;
        this.triggerFinishEvent();

        draft = _.clone(draft);
        draft.published = true;

        let resources = draft.details.resources;
        return ResourceUtils.attachMosaic(resources, env).then(() => {
            return this.saveDraft(draft, true);
        });
    }

    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handleCancelClick = (evt) => {
        let { reaction } = this.props;
        return Promise.try(() => {
            this.triggerFinishEvent();

            if (reaction) {
                if (reaction.ptime) {
                    // reaction was published before--publish it again
                    reaction = _.clone(reaction);
                    reaction.published = true;
                    return this.saveReaction(reaction);
                } else {
                    // delete saved unpublished reaction
                    return this.removeReaction(reaction);
                }
            }
            return reaction;
        });
    }

    /**
     * Called when user add or remove a resource or adjusted image cropping
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleResourcesChange = (evt) => {
        let { draft } = this.state;
        let resourcesBefore = _.get(draft, 'details.resources');
        let resourcesAfter = evt.resources;
        let selectedResourceIndex = evt.selection;
        if (resourcesBefore !== resourcesAfter) {
            let immediate = hasUnsentFiles(resourcesAfter);
            draft = _.decoupleSet(draft, 'details.resources', resourcesAfter);
            return this.saveDraft(draft, immediate, selectedResourceIndex);
        } else {
            this.setState({ selectedResourceIndex });
        }
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
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference = (evt) => {
        let { evn } = this.props;
        let { draft } = this.state;
        let resources = draft.details.resources;
        let res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let url = ResourceUtils.getMarkdownIconURL(res, evt.forImage, env);
            return { href: url, title: undefined };
        }
    }

    /**
     * Called when user initiates an action
     *
     * @param  {Object} evt
     */
    handleAction = (evt) => {
        let { draft } = this.state;
        let { mediaImporter } = this.components;
        switch (evt.action) {
            case 'markdown-set':
                draft = _.decoupleSet(draft, 'details.markdown', evt.value);
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

/**
 * Return a blank comment
 *
 * @param  {Story} story
 * @param  {User} currentUser
 *
 * @return {Reaction}
 */
const createBlankComment = memoizeWeak(null, function(story, currentUser) {
    return {
        type: 'comment',
        story_id: story.id,
        user_id: (currentUser) ? currentUser.id : null,
        details: {},
    };
});

function hasUnsentFiles(resources) {
    return _.some(resources, (res) => {
        if (!res.url && !res.payload_id) {
            return true;
        }
    });
}

export {
    ReactionEditor as default,
    ReactionEditor,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionEditor.propTypes = {
        reaction: PropTypes.object,
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onFinish: PropTypes.func,
    };
}
