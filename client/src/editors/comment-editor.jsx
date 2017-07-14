var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');

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
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');
var StoryText = require('widgets/story-text');

require('./comment-editor.scss');

module.exports = React.createClass({
    displayName: 'CommentEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        reaction: PropTypes.object,
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var nextState = {
            draft: null
        };
        this.updateDraft(nextState, this.props)
        return nextState;
    },

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

    updateDraft: function(nextState, nextProps) {
        if (nextProps.reaction) {
            nextState.draft = nextProps.reaction;
        } else {
            nextState.draft = createBlankComment(nextProps.currentUser);
        }
    },

    render: function() {
        return (
            <div className="comment-editor">
                <div className="profile-image-column">
                    {this.renderProfileImage()}
                </div>
                <div className="editor-column">
                    <div className="text">
                        {this.renderTextArea()}
                    </div>
                    <div className="controls">
                        {this.renderMediaButtons()}
                        {this.renderActionButtons()}
                        {this.renderPhotoDialog()}
                        {this.renderAudioDialog()}
                        {this.renderVideoDialog()}
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
        var resources = _.get(this.props.currentUser, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var url = this.props.theme.getImageUrl(profileImage, 24, 24);
        return (
            <div className="profile-image">
                <img src={url} />
            </div>
        );
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
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            tooltip: t('story-video'),
            icon: 'video-camera',
            onClick: this.handleVideoClick,
        };
        var audioButtonProps = {
            tooltip: t('story-audio'),
            icon: 'microphone',
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
     * Render dialogbox for capturing picture through MediaStream API
     *
     * @return {ReactElement|null}
     */
    renderPhotoDialog: function() {
        if (process.env.PLATFORM !== 'browser') {
            return null;
        }
        var props = {
            show: this.state.capturingPhoto,
            locale: this.props.locale,
            onCapture: this.handlePhotoCapture,
            onCancel: this.handlePhotoCancel,
        };
        return <PhotoCaptureDialogBox {...props} />
    },

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement|null}
     */
    renderVideoDialog: function() {
        if (process.env.PLATFORM !== 'browser') {
            return null;
        }
        var props = {
            show: this.state.capturingVideo,
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleVideoCapture,
            onCancel: this.handleVideoCancel,
        };
        return <VideoCaptureDialogBox {...props} />
    },

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement|null}
     */
    renderAudioDialog: function() {
        if (process.env.PLATFORM !== 'browser') {
            return null;
        }
        var props = {
            show: this.state.capturingAudio,
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleAudioCapture,
            onCancel: this.handleAudioCancel,
        };
        return <AudioCaptureDialogBox {...props} />
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
        var resources = reaction.details.resources || [];
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
                return db.saveOne({ table: 'reaction' }, reaction).then((reaction) => {
                    return Promise.each(payloadIds, (payloadId) => {
                        // start file upload
                        return payloads.send(payloadId);
                    }).then(() => {
                        this.reattachBlobs(reaction);
                        return this.changeDraft(reaction);
                    });
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
     * Reattach blobs that were filtered out when objects are saved
     *
     * @param  {Reaction} reaction
     */
    reattachBlobs: function(reaction) {
        var payloads = this.props.payloads;
        var resources = _.get(reaction, 'details.resources');
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
        return this.changeDraft(draft);
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
        var options = this.state.options;
        reaction.published = true;

        return this.changeDraft(reaction).then(() => {
            return this.saveReaction(reaction);
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
        var reaction = this.state.draft;
        var draft = createBlankComment(this.props.currentUser);
        return this.changeDraft(draft).then(() => {
            if (reaction.id) {
                return this.removeReaction(reaction);
            } else {
                return reaction;
            }
        });
    },

    /**
     * Called when user click on photo button
     *
     * @param  {Event} evt
     */
    handlePhotoClick: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: true });
        }
    },

    /**
     * Called when user clicks x or outside the photo dialog
     *
     * @param  {Event} evt
     */
    handlePhotoCancel: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: false });
        }
    },

    /**
     * Called after user has taken a photo
     *
     * @param  {Object} evt
     */
    handlePhotoCapture: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingPhoto: false });
            this.attachImage(evt.image);
        }
    },

    /**
     * Called when user click on video button
     *
     * @param  {Event} evt
     */
    handleVideoClick: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingVideo: true });
        }
    },

    /**
     * Called when user clicks x or outside the photo dialog
     *
     * @param  {Event} evt
     */
    handleVideoCancel: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingVideo: false });
        }
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleVideoCapture: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingVideo: false });
            this.attachVideo(evt.video);
        }
    },

    /**
     * Called when user click on audio button
     *
     * @param  {Event} evt
     */
    handleAudioClick: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingAudio: true });
        }
    },

    /**
     * Called when user clicks x or outside the photo dialog
     *
     * @param  {Event} evt
     */
    handleAudioCancel: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingAudio: false });
        }
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleAudioCapture: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            this.setState({ capturingAudio: false });
            this.attachAudio(evt.audio);
        }
    },

    /**
     * Called after user has selected a file
     *
     * @param  {Event} evt
     */
    handleFileSelect: function(evt) {
        var files = evt.target.files;
        this.importFiles(files);
        return null;
    },
});

/**
 * Return a blank comment
 *
 * @param  {User} currentUser
 *
 * @return {Reaction}
 */
var createBlankComment = Memoize(function(currentUser) {
    return {
        type: 'comment',
        user_id: currentUser.id,
        details: {},
    };
}, {
    user_ids: 0,
    details: {},
});
