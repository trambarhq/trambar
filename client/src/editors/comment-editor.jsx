var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var BlobReader = require('utils/blob-reader');
var LinkParser = require('utils/link-parser');
var DeviceManager = require('media/device-manager');

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
        var nextState = {
            draft: null,
            hasCamera: DeviceManager.hasDevice('videoinput'),
            hasMicrophone: DeviceManager.hasDevice('audioinput'),
        };
        this.updateDraft(nextState, this.props)
        return nextState;
    },

    componentWillMount: function() {
        DeviceManager.addEventListener('change', this.handleDeviceChange);
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
            nextState.draft = createBlankComment(nextProps.story, nextProps.currentUser);
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
     * Attach a resource to the story
     *
     * @param  {Object} res
     *
     * @return {Promise<Number>}
     */
    attachResource: function(res) {
        var reaction = _.decoupleSet(this.state.draft, 'details.resources', [ res ]);
        return this.changeDraft(reaction).return(0);
    },

    /**
     * Attach an image to the story
     *
     * @param  {Object} image
     *
     * @return {Promise<Number>}
     */
    attachImage: function(image) {
        var res = _.clone(image);
        res.type = 'image';
        if (image.width && image.height) {
            res.clip = getDefaultClippingRect(image.width, image.height);
        }
        return this.attachResource(res);
    },

    /**
     * Attach a video to the story
     *
     * @param  {Object} video
     *
     * @return {Promise<Number>}
     */
    attachVideo: function(video) {
        var res = _.clone(video);
        res.type = 'video';
        if (video.width && video.height) {
            res.clip = getDefaultClippingRect(video.width, video.height);
        }
        return this.attachResource(res);
    },

    /**
     * Attach an audio to the story
     *
     * @param  {Object} audio
     *
     * @return {Promise<Number>}
     */
    attachAudio: function(audio) {
        var res = _.clone(audio);
        res.type = 'audio';
        return this.attachResource(res);
    },

    /**
     * Attach a link to a website to the story
     *
     * @param  {Object} website
     *
     * @return {Promise<Number>}
     */
    attachWebsite: function(website) {
        var res = _.clone(website);
        res.type = 'website';
        return this.attachResource(res);
    },

    /**
     * Attach the contents of a file to the story
     *
     * @param  {File} file
     *
     * @return {Promise<Number|null>}
     */
    importFile: function(file) {
        if (/^image\//.test(file.type)) {
            return BlobReader.loadImage(file).then((img) => {
                var format = _.last(_.split(file.type, '/'));
                var width = img.naturalWidth;
                var height = img.naturalHeight;
                var image = { format, file, width, height };
                return this.attachImage(image);
            });
        } else if (/^video\//.test(file.type)) {
            var format = _.last(_.split(file.type, '/'));
            var video = { format, file };
            return this.attachVideo(video);
        } else if (/^audio\//.test(file.type)) {
            var format = _.last(_.split(file.type, '/'));
            var audio = { format, file };
            return this.attachVideo(audio);
        } else if (/^application\/(x-mswinurl|x-desktop)/.test(file.type)) {
            return BlobReader.loadText(file).then((text) => {
                var link = LinkParser.parse(text);
                if (link) {
                    var website = {
                        url: link.url,
                        title: link.name || _.replace(file.name, /\.\w+$/, ''),
                    };
                    return this.attachWebsite(website);
                }
            });
        } else {
            console.log(file);
            return Promise.resolve(null);
        }
    },

    /**
     * Attach non-file drag-and-drop contents to story
     *
     * @param  {Array<DataTransferItem>} items
     *
     * @return {Promise}
     */
    importDataItems: function(items) {
        var stringItems = _.filter(items, (item) => {
            if (item.kind === 'string') {
                return /^text\/(html|uri-list)/.test(item.type);
            }
        });
        // since items are ephemeral, we need to call getAsString() on each
        // of them at this point (and not in a callback)
        var stringPromises = {};
        _.each(stringItems, (item) => {
            stringPromises[item.type] = retrieveDataItemText(item);
        });
        return Promise.props(stringPromises).then((strings) => {
            var html = strings['text/html'];
            var url = strings['text/uri-list'];
            if (url) {
                // see if it's an image being dropped
                var isImage = /<img\b/i.test(html);
                if (isImage) {
                    var image = { external_url: url };
                    return this.attachImage(image);
                } else {
                    var website = { url };
                    if (html) {
                        // get plain text from html
                        var node = document.createElement('DIV');
                        node.innerHTML = html.replace(/<.*?>/g, '');
                        website.title = node.innerText;
                    }
                    return this.attachWebsite(website);
                }
            }
        });
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

        return this.changeDraft(draft).then(() => {
            this.autosaveReaction(draft, AUTOSAVE_DURATION);
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
        var reaction = this.state.draft;
        var draft = createBlankComment(this.props.currentUser);
        return this.changeDraft(draft).then(() => {
            if (reaction.id) {
                return this.removeReaction(reaction);
            } else {
                return reaction;
            }
        }).then(() => {
            this.triggerFinishEvent();
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
        if (files.length >= 1) {
            this.importFile(files[0]);
        }
        return null;
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

/**
 * Return a square clipping rect
 *
 * @param  {Number} width
 * @param  {Number} height
 * @param  {String} align
 *
 * @return {Object}
 */
function getDefaultClippingRect(width, height, align) {
    var left = 0, top = 0;
    var length = Math.min(width, height);
    if (align === 'center' || !align) {
        if (width > length) {
            left = Math.floor((width - length) / 2);
        } else if (height > length) {
            top = Math.floor((height - length) / 2);
        }
    }
    return { left, top, width: length, height: length };
}

/**
 * Retrieve the text in a DataTransferItem
 *
 * @param  {DataTransferItem} item
 *
 * @return {Promise<String>}
 */
function retrieveDataItemText(item) {
    return new Promise((resolve, reject) => {
        item.getAsString(resolve);
    });
}
