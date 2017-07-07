var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var BlobReader = require('utils/blob-reader');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');
var ImageCropper = require('media/image-cropper');

require('./story-media-editor.scss');

module.exports = React.createClass({
    displayName: 'StoryMediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        cornerPopUp: PropTypes.element,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            dropZoneStatus: 'idle',
            selectedResourceIndex: 0,
        };
    },

    getSelectedResourceIndex: function() {
        var maxIndex = _.get(this.props.story, 'details.resources.length', 0) - 1;
        var index = _.min([ this.state.selectedResourceIndex, maxIndex ]);
        return index;
    },

    getResourceImageUrl: function(res) {
        var theme = this.props.theme;
        var url, file;
        switch (res.type) {
            case 'image':
                // get absolute URL of unclipped image
                url = theme.getImageUrl(_.omit(res, 'clip'));
                file = res.file;
                break;
            case 'video':
            case 'audio':
            case 'website':
                url = theme.getPosterUrl(_.omit(res, 'clip'));
                file = res.poster_file;
            break;
        }
        if (url) {
            // convert relative URL to absolute URL
        }
        // don't download files that we'd earlier uploaded
        if (file) {
            if (file === this.imageBlob) {
                url = this.imageBlobUrl;
            } else {
                if (this.imageBlobUrl) {
                    URL.revokeObjectURL(this.imageBlobUrl);
                }
                url = this.imageBlobUrl = URL.createObjectURL(file);
                this.imageBlob = file;
            }
        }
        return url;
    },

    render: function() {
        return (
            <StorySection className="media-editor">
                <header>
                    {this.renderButtons()}
                    {this.renderPhotoDialog()}
                    {this.renderAudioDialog()}
                    {this.renderVideoDialog()}
                </header>
                <body onDragEnter={this.handleDragEnter}>
                    {this.renderResourceEditor()}
                    {this.renderDropZone()}
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
                <HeaderButton {...photoButtonProps} />
                <HeaderButton {...videoButtonProps} />
                <HeaderButton {...audioButtonProps} />
                <HeaderButton.File {...selectButtonProps} />
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

    renderResourceEditor: function() {
        var index = this.getSelectedResourceIndex();
        if (index < 0) {
            var t = this.props.locale.translate;
            return (
                <div className="message">Drop and drop files here</div>
            );
        }
        var res = this.props.story.details.resources[index];
        switch (res.type) {
            case 'image':
            case 'video':
            case 'website':
                return this.renderImageCropper(res);
            case 'audio':
                return (
                    <div className="audio-placeholder">
                        <i className="fa fa-microphone" />
                    </div>
                );
        }
    },

    renderImageCropper: function(res) {
        var url = this.getResourceImageUrl(res);
        if (!url) {
            return <div>Loading</div>;
        }
        var props = {
            url: url,
            clippingRect: res.clip || getDefaultClippingRect(res),
            onChange: this.handleClipRectChange,
        };
        return <ImageCropper {...props} />;
    },

    renderDropZone: function() {
        if (this.state.dropZoneStatus === 'idle') {
            return;
        }
        var classNames = [ 'drop-zone', this.state.dropZoneStatus ];
        var props = {
            className: classNames.join(' '),
            onDragEnter: this.handleDragEnter,
            onDragLeave: this.handleDragLeave,
            onDragOver: this.handleDragOver,
            onDrop: this.handleDrop,
        };
        return <div {...props} />
    },

    componentWillUnmount: function() {
        if (this.imageBlobUrl) {
            URL.revokeObjectURL(this.imageBlobUrl);
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
        var path = 'details.resources'
        var story = _.decouplePush(this.props.story, path, res);
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

    importFile: function(file) {
        if (/^image/.test(file.type)) {
            return BlobReader.loadImage(file).then((img) => {
                var type = file.type;
                var width = img.naturalWidth;
                var height = img.naturalHeight;
                var image = { type, file, width, height };
                image.clip = getDefaultClippingRect(image);
                this.attachImage(image);
            });
        } else if (/^video/.test(file.type)) {
        }
    },

    importFiles: function(files) {
        var firstIndex = _.get(this.props.story, 'details.resources.length', 0);
        return Promise.each(files, (file) => {
            return this.importFile(file);
        }).delay(50).finally(() => {
            // select the first import item
            var count = _.get(this.props.story, 'details.resources.length', 0);
            if (firstIndex < count) {
                this.setState({ selectedResourceIndex: firstIndex });
            }
        });
    },

    checkFile: function(file) {
        if (/^image/.test(file.type)) {
            return true;
        } else if (/^video/.test(file.type)) {
            return true;
        } else {
            return false;
        }
    },

    checkFiles: function(files) {
        return _.every(files, (file) => {
            return this.checkFile(file);
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

    handleDragEnter: function(evt) {
        var files = evt.dataTransfer.files;
        if (this.checkFiles(files)) {
            this.setState({ dropZoneStatus: 'valid' });
        } else {
            this.setState({ dropZoneStatus: 'invalid' });
            evt.dataTransfer.dropEffect = 'none';
        }
    },

    handleDragLeave: function(evt) {
        this.setState({ dropZoneStatus: 'idle' });
    },

    handleDragOver: function(evt) {
        evt.preventDefault();
    },

    handleDrop: function(evt) {
        evt.preventDefault();
        if (this.state.status !== 'valid') {
            var files = evt.dataTransfer.files;
            this.importFiles(files);
        }
        this.setState({ dropZoneStatus: 'idle' });
        return null;
    },

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     */
    handleClipRectChange: function(evt) {
        var index = this.getSelectedResourceIndex();
        var path = `details.resources.${index}.clip`;
        var story = _.decoupleSet(this.props.story, path, evt.rect);
        this.triggerChangeEvent(story, path);
    },
});

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
