var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var DeviceManager = require('media/device-manager');
var ComponentRefs = require('utils/component-refs');
var TagScanner = require('utils/tag-scanner');
var Markdown = require('utils/markdown');

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
var MediaEditor = require('editors/media-editor');

require('./comment-editor.scss');

const AUTOSAVE_DURATION = 5000;

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
            mediaEditor: MediaEditor
        });
        var nextState = {
            draft: null,
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        };
        this.updateDraft(nextState, this.props)
        return nextState;
    },

    /**
     * Monitor connection of video or audio recordign devices
     */
    componentWillMount: function() {
        DeviceManager.addEventListener('change', this.handleDeviceChange);
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
        } else {
            nextState.draft = createBlankComment(nextProps.story, nextProps.currentUser);
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="comment-editor">
                <div className="profile-image-column">
                    {this.renderProfileImage()}
                </div>
                <div className="editor-column">
                    <div className="controls">
                        <div className="textarea">
                            {this.renderTextArea()}
                        </div>
                        <div className="buttons">
                            {this.renderMediaButtons()}
                            {this.renderActionButtons()}
                        </div>
                    </div>
                    <div className="media">
                        {this.renderMedia()}
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
        var languageCode = this.props.locale.languageCode;
        var lang = languageCode.substr(0, 2);
        var langText = _.get(this.state.draft, [ 'details', 'text', lang ], '');
        var textareaProps = {
            ref: 'textarea',
            value: langText,
            lang: lang,
            onChange: this.handleTextChange,
        };
        return <AutosizeTextArea {...textareaProps} />
    },

    /**
     * Render button of attaching media to comment
     *
     * @return {ReactElement}
     */
    renderMediaButtons: function() {
        var t = this.props.locale.translate;
        var photoButtonProps = {
            tooltip: t('story-photo'),
            icon: 'camera',
            hidden: !this.state.hasCamera,
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            tooltip: t('story-video'),
            icon: 'video-camera',
            hidden: !this.state.hasCamera,
            onClick: this.handleVideoClick,
        };
        var audioButtonProps = {
            tooltip: t('story-audio'),
            icon: 'microphone',
            hidden: !this.state.hasMicrophone,
            onClick: this.handleAudioClick,
        };
        var selectButtonProps = {
            tooltip: t('story-file'),
            icon: 'file',
            onChange: this.handleFileSelect,
        }
        var markdown = _.get(this.state.draft, 'details.markdown', false);
        var markdownProps = {
            tooltip: t('story-markdown'),
            icon: 'pencil-square',
            highlighted: markdown,
            onClick: this.handleMarkdownClick,
        };
        return (
            <div className="media-buttons">
                <HeaderButton {...photoButtonProps} />
                <HeaderButton {...videoButtonProps} />
                <HeaderButton {...audioButtonProps} />
                <HeaderButton.File {...selectButtonProps} />
                <HeaderButton {...markdownProps} />
                {this.props.cornerPopUp}
            </div>
        );
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
    renderMedia: function() {
        var t = this.props.locale.translate;
        var editorProps = {
            ref: this.components.setters.mediaEditor,
            resources: _.get(this.state.draft, 'details.resources'),
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourcesChange,
        };
        return (
            <MediaEditor {...editorProps} />
        );
    },

    /**
     * Remove event handler on unmount
     */
    componentWillUnmount: function() {
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Set keyboard focus on text area
     *
     * @return {[type]}
     */
    focus: function() {
        var component = this.refs.textarea;
        if (component) {
            component.focus();
        }
    },

    /**
     * Set current draft
     *
     * @param  {Reaction} draft
     *
     * @return {Promise<Reaction>}
     */
    changeDraft: function(draft) {
        return new Promise((resolve, reject) => {
            this.setState({ draft }, () => {
                resolve(draft);
            });
        });
    },

    /**
     * Save reaction to server after specified delay
     *
     * @param  {Reactopn} reaction
     * @param  {Number} delay
     */
    autosaveReaction: function(reaction, delay) {
        if (delay) {
            this.cancelAutosave();
            this.autosaveTimeout = setTimeout(() => {
                this.saveReaction(reaction);
            }, delay);
            this.autosaveUnloadHandler = () => {
                this.saveReaction(reaction);
            };
            window.addEventListener('beforeunload', this.autosaveUnloadHandler);
        } else {
            this.saveReaction(reaction);
        }
    },

    /**
     * Clear autosave timeout function and event handler
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
     * Save reaction to remote database
     *
     * @param  {Reaction} reaction
     *
     * @return {Promise<Reaction>}
     */
    saveReaction: function(reaction) {
        this.cancelAutosave();

        // send images and videos to server
        var payloads = this.props.payloads;
        return payloads.prepare(reaction).then(() => {
            var route = this.props.route;
            var server = route.parameters.server;
            var schema = route.parameters.schema;
            var db = this.props.database.use({ server, schema, by: this });
            return db.start().then(() => {
                return db.saveOne({ table: 'reaction' }, reaction).then((reaction) => {
                    // start file upload
                    return payloads.dispatch(reaction).return(reaction);
                });
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
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
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
     * Called when user changes contents in text area
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handleTextChange: function(evt) {
        var langText = evt.currentTarget.value;
        var languageCode = this.props.locale.languageCode;
        var lang = languageCode.substr(0, 2);
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

        return this.changeDraft(draft).then(() => {
            this.autosaveReaction(draft, AUTOSAVE_DURATION);
            return null;
        });
    },

    /**
     * Called when user clicks the Post button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Reaction>}
     */
    handlePublishClick: function(evt) {
        var reaction = _.clone(this.state.draft);
        reaction.published = true;

        return this.changeDraft(reaction).then(() => {
            return this.saveReaction(reaction);
        }).then(() => {
            this.triggerFinishEvent();
        });
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
            this.cancelAutosave();
            var reaction = this.props.reaction;
            if (reaction.id) {
                if (reaction.ptime) {
                    // reaction was published before--publish it again
                    reaction = _.clone(reaction);
                    reaction.published = true;
                    return this.saveReaction(reaction);
                } else {
                    // delete saved unpublished reaction
                    return this.removeReaction(reaction);
                }
            } else {
                return reaction;
            }
        }).then((reaction) => {
            this.triggerFinishEvent();
            return reaction;
        });
    },

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick: function(evt) {
        this.components.mediaEditor.capture('image');
    },

    /**
     * Called when user click on video button
     *
     * @param  {Event} evt
     */
    handleVideoClick: function(evt) {
        this.components.mediaEditor.capture('video');
    },

    /**
     * Called when user click on audio button
     *
     * @param  {Event} evt
     */
    handleAudioClick: function(evt) {
        this.components.mediaEditor.capture('audio');
    },

    /**
     * Called after user has selected a file
     *
     * @param  {Event} evt
     */
    handleFileSelect: function(evt) {
        var files = evt.target.files;
        this.components.mediaEditor.importFiles(files);
        return null;
    },

    /**
     * Called when user add or remove a resource or adjusted image cropping
     *
     * @param  {Object} evt
     *
     * @return {Promise}
     */
    handleResourcesChange: function(evt) {
        var path = `details.resources`;
        var draft = _.decoupleSet(this.state.draft, path, evt.resources);
        return this.changeDraft(draft).then((draft) => {
            var delay = AUTOSAVE_DURATION;
            if (hasUnsentFiles(evt.resources)) {
                delay = 0;
            }
            this.autosaveReaction(draft, delay);
            return null;
        });
    },

    /**
     * Called when user clicks the Markdown button
     *
     * @param  {Event} evt
     *
     * @return {Promise}
     */
    handleMarkdownClick: function(evt) {
        var path = `details.markdown`;
        var markdown = !_.get(this.state.draft, path, false);
        var draft = _.decoupleSet(this.state.draft, path, markdown);
        return this.changeDraft(draft).then((draft) => {
            this.autosaveReaction(draft, AUTOSAVE_DURATION);
            return null;
        });
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
                url = this.props.theme.getImageUrl(res, { height: 24 });;
            } else {
                url = this.props.theme.getUrl(res);
            }
            return {
                href: url,
                title: undefined
            };
        }
    },

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange: function(evt) {
        this.setState({
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        });
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
        target_user_ids: story.user_ids,
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
