var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobReader = require('utils/blob-reader');
var LinkParser = require('utils/link-parser');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var MediaButton = require('widgets/media-button');
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

    /**
     * Return the number of resources attached to story
     *
     * @return {Number}
     */
    getResourceCount: function() {
        return _.get(this.props.story, 'details.resources.length', 0);
    },

    /**
     * Return the index of the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex: function() {
        var maxIndex = this.getResourceCount() - 1;
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
                    {this.renderResources()}
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

    /**
     * Render resource navigation and editor
     *
     * @return {ReactElement}
     */
    renderResources: function() {
        var index = this.getSelectedResourceIndex();
        var count = this.getResourceCount();
        if (index < 0) {
            var t = this.props.locale.translate;
            return (
                <div className="message">Drop and drop files here</div>
            );
        }
        var res = this.props.story.details.resources[index];
        return (
            <div className="resources">
                {this.renderResourceEditor(res)}
                {this.renderResourceNavigation(index, count)}
            </div>
        );
    },

    /**
     * Render edit for the currently selected resource
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderResourceEditor: function(res) {
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

    /**
     * Render navigation bar for selecting resource
     *
     * @param  {Number} index
     * @param  {Number} count
     *
     * @return {ReactElement}
     */
    renderResourceNavigation: function(index, count) {
        var shiftProps = {
            label: 'Shift',
            icon: 'chevron-left',
            disabled: !(index > 0),
            onClick: this.handleShiftClick,
        };
        var removeProps = {
            label: 'Remove',
            icon: 'remove',
            onClick: this.handleRemoveClick,
        };
        var directionProps = {
            index,
            count,
            hidden: !(count > 1),
            onBackwardClick: this.handleBackwardClick,
            onForwardClick: this.handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="left">
                    <MediaButton {...shiftProps} />
                    <MediaButton {...removeProps} />
                </div>
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    },

    renderImageCropper: function(res) {
        var url = this.getResourceImageUrl(res);
        if (!url) {
            return <div>Loading</div>;
        }
        var props = {
            url: url,
            clippingRect: res.clip,
            onChange: this.handleClipRectChange,
            onClip: this.handleClipDefault,
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
     *
     * @return {Promise<Story>}
     */
    triggerChangeEvent: function(story, path) {
        if (this.props.onChange) {
            return this.props.onChange({
                type: 'change',
                target: this,
                story,
                path,
            })
        }
    },

    /**
     * Select the resource at the given index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource: function(index) {
        return new Promise((resolve, reject) => {
            var count = this.getResourceCount();
            if (index >= 0 && index < count) {
                this.setState({ selectedResourceIndex: index }, () => {
                    resolve(index);
                });
            } else {
                resolve(this.getSelectedResourceIndex());
            }
        });
    },

    /**
     * Attach a resource to the story
     *
     * @param  {Object} res
     *
     * @return {Promise<Number>}
     */
    attachResource: function(res) {
        var path = 'details.resources'
        var index = this.getResourceCount();
        var story = _.decouplePush(this.props.story, path, res);
        return this.triggerChangeEvent(story, 'details.resources').then(() => {
            return index;
        });
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
            return this.attachAudio(audio);
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
     * Attach files selected by user to story
     *
     * @param  {Array<File>} files
     *
     * @return {Promise<Number>}
     */
    importFiles: function(files) {
        return Promise.mapSeries(files, (file) => {
            return this.importFile(file);
        }).then((indices) => {
            var firstIndex = _.find(indices, _.isNumber);
            return this.selectResource(firstIndex);
        });
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
        }).then((index) => {
            return this.selectResource(index);
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
        this.setState({ dropZoneStatus: 'valid' });
    },

    handleDragLeave: function(evt) {
        this.setState({ dropZoneStatus: 'idle' });
    },

    handleDragOver: function(evt) {
        evt.preventDefault();
    },

    handleDrop: function(evt) {
        evt.preventDefault();
        if (this.state.dropZoneStatus === 'valid') {
            var files = evt.dataTransfer.files;
            var items = evt.dataTransfer.items;
            if (files.length > 0) {
                this.importFiles(files);
            }
            if (items.length > 0) {
                this.importDataItems(items);
            }
        }
        this.setState({ dropZoneStatus: 'idle' });
        return null;
    },

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleClipRectChange: function(evt) {
        var index = this.getSelectedResourceIndex();
        var path = `details.resources.${index}.clip`;
        var story = _.decoupleSet(this.props.story, path, evt.rect);
        return this.triggerChangeEvent(story, path);
    },

    /**
     * Called when user clicks shift button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleShiftClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        if (index < 1) {
            return 0;
        }
        var path = 'details.resources';
        var story = _.decouple(this.props.story, path, []);
        var resources = story.details.resources;
        var res = resources[index];
        resources.splice(index, 1);
        resources.splice(index - 1, 0, res);
        return this.triggerChangeEvent(story, path).then(() => {
            return this.selectResource(index - 1);
        });
    },

    /**
     * Called when user clicks remove button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleRemoveClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        if (index < 0) {
            return index;
        }
        var path = 'details.resources';
        var story = _.decouple(this.props.story, path, []);
        var resources = story.details.resources;
        resources.splice(index, 1);
        if (resources.length === 0) {
            story.details = _.omit(story.details, 'resources');
        }
        return this.triggerChangeEvent(story, path).then(() => {
            if (index >= resources.length) {
                return this.selectResource(resources.length - 1);
            } else {
                return index;
            }
        });
    },

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index - 1);
    },

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index + 1);
    },
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
