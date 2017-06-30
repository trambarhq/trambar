var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var UploadQueue = require('transport/upload-queue');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var BlobReader = require('utils/blob-reader');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');
var LocalImageCropper = require('media/local-image-cropper');

require('./story-media-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryMediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        queue: PropTypes.instanceOf(UploadQueue).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            capturingPhoto: false,
            capturingAudio: false,
            capturingVideo: false,
        };
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderButtons()}
                    {this.renderPhotoDialog()}
                    {this.renderAudioDialog()}
                    {this.renderVideoDialog()}
                </header>
                <body>
                    {this.renderPreview()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var photoButtonProps = {
            label: t('story-photo'),
            icon: 'camera',
            onClick: this.handlePhotoClick,
        };
        var videoButtonProps = {
            label: t('story-video'),
            icon: 'video-camera',
            onClick: this.handleVideoClick,
        };
        var audioButtonProps = {
            label: t('story-audio'),
            icon: 'microphone',
            onClick: this.handleAudioClick,
        };
        var selectButtonProps = {
            label: t('story-file'),
            icon: 'file',
            onChange: this.handleFileSelect,
        }
        return (
            <div>
                <Button {...photoButtonProps} />
                <Button {...videoButtonProps} />
                <Button {...audioButtonProps} />
                <FileButton {...selectButtonProps} />
                {this.props.cornerPopUp}
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
            queue: this.props.queue,
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
            queue: this.props.queue,
            locale: this.props.locale,
            onCapture: this.handleAudioCapture,
            onCancel: this.handleAudioCancel,
        };
        return <AudioCaptureDialogBox {...props} />
    },

    renderPreview: function() {
        var resources = _.get(this.props.story, 'details.resources');
        var image = _.find(resources, { type: 'image' });
        if (image && image.file instanceof Blob) {
            var props = {
                file: image.file,
                clippingRect: image.clip || getDefaultClippingRect(image),
                onChange: this.handleClipRectChange,
            };
            return <LocalImageCropper {...props} />;
        }
    },

    /**
     * Call onChange handler
     *
     * @param  {Story} story
     * @param  {String} path
     */
    triggerChangeEvent: function(story, path) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                story,
                path,
            })
        }
    },

    attachResource: function(res) {
        var story = _.clone(this.props.story);
        story.details = _.clone(story.details);
        if (story.details.resources) {
            story.details.resources = _.slice(story.details.resources);
        } else {
            story.details.resources = [];
        }
        story.details.resources.push(res);
        this.triggerChangeEvent(story, 'details.resources');
    },

    attachImage: function(image) {
        var res = _.clone(image);
        res.type = 'image';
        res.clip = getDefaultClippingRect(image);
        this.attachResource(res);
    },

    attachVideo: function(video) {
        var res = _.clone(video);
        res.type = 'video';
        res.clip = getDefaultClippingRect(video);
        this.attachResource(res);
    },

    attachAudio: function(audio) {
        var res = _.clone(audio);
        res.type = 'audio';
        this.attachResource(res);
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
        var file = evt.target.files[0];
        if (file) {
            return BlobReader.loadImage(file).then((img) => {
                var type = file.type;
                var width = img.naturalWidth;
                var height = img.naturalHeight;
                var image = { type, file, width, height };
                this.attachImage(image);
            });
        }
    },

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     */
    handleClipRectChange: function(evt) {
        var file = evt.target.props.file;
        var story = _.cloneDeep(this.props.story);
        var resources = _.get(story, 'details.resources');
        var index = _.findIndex(resources, { file });
        if (index !== -1) {
            var res = resources[index];
            res.clip = evt.rect;
        }
        this.triggerChangeEvent(story, `details.resources.${index}.clip`);
    },
});

function Button(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    return (
        <div className={classNames.join(' ')} onClick={props.onClick}>
            <i className={props.icon ? `fa fa-${props.icon}` : null}/>
            <span className="label">{props.label}</span>
        </div>
    );
}

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    return (
        <label className={classNames.join(' ')}>
            <i className={props.icon ? `fa fa-${props.icon}` : null}/>
            <span className="label">{props.label}</span>
            <input type="file" value="" onChange={props.onChange} />
        </label>
    );
}

/**
 * Return a clipping rect that centers the image
 *
 * @param  {Object} image
 *
 * @return {Object}
 */
function getDefaultClippingRect(image) {
    var left, top, width, height;
    if (image.width > image.height) {
        width = height = image.height;
        left = Math.floor((image.width - width) / 2);
        top = 0;
    } else {
        width = height = image.width;
        left = 0;
        top = Math.floor((image.height - height) / 2);
    }
    return { left, top, width, height };
}
