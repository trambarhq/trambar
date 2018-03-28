var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var DeviceManager = require('media/device-manager');
var ComponentRefs = require('utils/component-refs');
var TagScanner = require('utils/tag-scanner');
var Markdown = require('utils/markdown');
var FocusManager = require('utils/focus-manager');
var ReactionUtils = require('objects/utils/reaction-utils');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var AutosizeTextArea = require('widgets/autosize-text-area');
var PushButton = require('widgets/push-button');
var HeaderButton = require('widgets/header-button');
var ProfileImage = require('widgets/profile-image');
var DropZone = require('widgets/drop-zone');
var ReactionMediaToolbar = require('widgets/reaction-media-toolbar');
var MediaEditor = require('editors/media-editor');
var MediaImporter = require('editors/media-importer');

require('./reaction-editor.scss');

const AUTOSAVE_DURATION = 2000;

module.exports = React.createClass({
    displayName: 'CommentEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        reaction: PropTypes.object,
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onFinish: PropTypes.func,
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
        });
        var nextState = {
            draft: null,
            original: null,
            selectedResourceIndex: 0,
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        };
        this.updateDraft(nextState, this.props);
        this.updateResourceIndex(nextState, this.props);
        return nextState;
    },

    /**
     * Update draft upon receiving data from server
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.reaction !== nextProps.reaction) {
            this.updateDraft(nextState, nextProps);
            this.updateResourceIndex(nextState, nextProps);
        }
        var changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update reaction object with information from new props
     *
     * @param  {Object} nextState
     * @param  {Object} nextProps
     */
    updateDraft: function(nextState, nextProps) {
        if (nextProps.reaction) {
            nextState.draft = nextProps.reaction;
            if (!nextProps.reaction.uncommitted) {
                nextState.original = nextProps.reaction;
            }
        } else {
            nextState.draft = createBlankComment(nextProps.story, nextProps.currentUser);
            nextState.original = null;
        }
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
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
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
    },

    /**
     * Render profile image of current user
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
            user: this.props.currentUser,
            theme: this.props.theme,
            size: 'small',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render text area
     *
     * @return {ReactElement}
     */
    renderTextArea: function() {
        var lang = this.props.locale.languageCode;
        var langText = _.get(this.state.draft, [ 'details', 'text', lang ], '');
        var textareaProps = {
            ref: this.components.setters.textArea,
            value: langText,
            lang: this.props.locale.localeCode,
            onChange: this.handleTextChange,
            onKeyPress: this.handleKeyPress,
            onPaste: this.handlePaste,
        };
        return <AutosizeTextArea {...textareaProps} />
    },

    /**
     * Render button of attaching media to comment
     *
     * @return {ReactElement}
     */
    renderMediaToolbar: function() {
        var props = {
            reaction: this.state.draft,
            capturing: this.state.capturing,
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <ReactionMediaToolbar {...props} />;
    },

    /**
     * Render post and cancel buttons
     *
     * @return {ReactElement}
     */
    renderActionButtons: function() {
        var t = this.props.locale.translate;
        var noText = _.isEmpty(_.get(this.state.draft, 'details.text'));
        var noResources = _.isEmpty(_.get(this.state.draft, 'details.resources'));
        var publishing = _.get(this.state.draft, 'published', false);
        var cancelButtonProps = {
            label: t('story-cancel'),
            onClick: this.handleCancelClick,
            disabled: publishing,
        };
        var postButtonProps = {
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
    },

    /**
     * Render resources editor
     *
     * @return {ReactElement}
     */
    renderMediaEditor: function() {
        var t = this.props.locale.translate;
        var props = {
            ref: this.components.setters.mediaImporter,
            resources: _.get(this.state.draft, 'details.resources'),
            resourceIndex: this.state.selectedResourceIndex,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourcesChange,
        };
        return (
            <MediaEditor {...props} />
        );
    },

    /**
     * Render resources importer
     *
     * @return {ReactElement}
     */
    renderMediaImporter: function() {
        var t = this.props.locale.translate;
        var props = {
            ref: this.components.setters.mediaImporter,
            resources: _.get(this.state.draft, 'details.resources'),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onCaptureStart: this.handleCaptureStart,
            onCaptureEnd: this.handleCaptureEnd,
            onChange: this.handleResourcesChange,
        };
        return (
            <MediaImporter {...props} />
        );
    },

    /**
     * Register the component at FocusManager so others can bring focus to it
     */
    componentDidMount: function() {
        FocusManager.register(this, {
            type: 'ReactionEditor',
            story_id: this.props.story.id,
            user_id: this.props.currentUser.id,
        });
    },

    /**
     * Unregister on unmount
     */
    componentWillUnmount: function() {
        FocusManager.unregister(this);
    },

    /**
     * Set current draft
     *
     * @param  {Reaction} draft
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Reaction>}
     */
    changeDraft: function(draft, resourceIndex) {
        return new Promise((resolve, reject) => {
            var newState = { draft };
            if (resourceIndex !== undefined) {
                newState.selectedResourceIndex = resourceIndex;
            }
            this.setState(newState, () => {
                resolve(draft);
            });
        });
    },

    /**
     * Set current draft and initiate autosave
     *
     * @param  {Reaction} draft
     * @param  {Boolean} immediate
     * @param  {Number} resourceIndex
     *
     * @return {Promise<Reaction>}
     */
    saveDraft: function(draft, immediate, resourceIndex) {
        // see comment for same method in StoryEditor
        this.props.database.track(draft);
        return this.changeDraft(draft, resourceIndex).then((reaction) => {
            this.saveReaction(reaction, immediate);
            return reaction;
        });
    },

    /**
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     * @param  {Boolean} immediate
     *
     * @return {Promise<Reaction>}
     */
    saveReaction: function(reaction, immediate) {
        // send images and videos to server
        var params = this.props.route.parameters;
        var original = this.state.original;
        var options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (ReactionUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        var db = this.props.database.use({ schema: params.schema, by: this });
        return db.start().then(() => {
            return db.saveOne({ table: 'reaction' }, reaction, options).then((reaction) => {
                // start file upload
                this.props.payloads.dispatch(reaction);
                return reaction;
            });
        });
    },

    /**
     * Remove reaction from remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    removeReaction: function(reaction) {
        var route = this.props.route;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ schema, by: this });
        return db.removeOne({ table: 'reaction' }, reaction);
    },

    /**
     * Inform parent component that editing is over
     */
    triggerFinishEvent: function() {
        if (this.props.onFinish) {
            this.props.onFinish({
                type: 'finish',
                target: this,
            });
        }
    },

    /**
     * Focus text area
     */
    focus: function() {
        var textArea = this.components.textArea;
        if (textArea) {
            textArea.focus();
        }
    },

    /**
     * Called when user changes contents in text area
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handleTextChange: function(evt) {
        var langText = evt.currentTarget.value;
        var lang = this.props.locale.languageCode;
        var path = `details.text.${lang}`;
        var draft = _.decoupleSet(this.state.draft, path, langText);

        // automatically enable Markdown formatting
        if (draft.details.markdown === undefined) {
            if (Markdown.detect(langText, this.handleReference)) {
                draft.details.markdown = true;
            }
        }

        // look for tags
        draft.tags = TagScanner.findTags(draft.details.text);
        return this.saveDraft(draft);
    },

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyPress: function(evt) {
        var target = evt.target;
        if (evt.charCode == 0x0D) {
            if (this.props.theme.mode === 'single-col') {
                evt.preventDefault();
                this.handlePublishClick(evt);
                target.blur();
            }
        }
    },

    /**
     * Called when user paste into editor
     *
     * @param  {Event} evt
     */
    handlePaste: function(evt) {
        this.components.mediaImporter.importFiles(evt.clipboardData.files);
        this.components.mediaImporter.importDataItems(evt.clipboardData.items);
    },

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handlePublishClick: function(evt) {
        this.triggerFinishEvent();

        var reaction = _.clone(this.state.draft);
        reaction.published = true;
        return this.saveDraft(reaction, true);
    },

    /**
     * Called when user click Cancel button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handleCancelClick: function(evt) {
        return Promise.try(() => {
            this.triggerFinishEvent();

            var reaction = this.props.reaction;
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
    },

    /**
     * Called when user add or remove a resource or adjusted image cropping
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleResourcesChange: function(evt) {
        var resourcesBefore = _.get(this.state.draft, 'details.resources');
        var resourcesAfter = evt.resources;
        var selectedResourceIndex = evt.selection;
        if (resourcesBefore !== resourcesAfter) {
            var draft = _.decoupleSet(this.state.draft, 'details.resources', evt.resources);
            var immediate = hasUnsentFiles(evt.resources);
            return this.saveDraft(draft, immediate, selectedResourceIndex);
        } else {
            this.setState({ selectedResourceIndex });
        }
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
     * Called when Markdown text references a resource
     *
     * @param  {Object} evt
     */
    handleReference: function(evt) {
        var resources = this.state.draft.details.resources;
        var res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            var url;
            if (evt.forImage)  {
                // images are style at height = 1.5em
                url = this.props.theme.getImageURL(res, { height: 24 });;
            } else {
                url = this.props.theme.getURL(res);
            }
            return {
                href: url,
                title: undefined
            };
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
                var draft = _.decoupleSet(this.state.draft, 'details.markdown', evt.value);
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
    },
});

/**
 * Return a blank comment
 *
 * @param  {Story} story
 * @param  {User} currentUser
 *
 * @return {Reaction}
 */
var createBlankComment = Memoize(function(story, currentUser) {
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
