var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobReader = require('utils/blob-reader');
var LinkParser = require('utils/link-parser');
var FrameGrabber = require('media/frame-grabber');

var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var MediaButton = require('widgets/media-button');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');
var ImageCropper = require('media/image-cropper');

require('./media-editor.scss');

module.exports = React.createClass({
    displayName: 'MediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        resources: PropTypes.arrayOf(PropTypes.object),

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onChange: PropTypes.func.isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            capturing: null,
            selectedResourceIndex: 0,
        };
    },

    /**
     * Start capturing image/video/audio
     *
     * @param  {String} type
     */
    capture: function(type) {
        this.setState({ capturing: type });
    },

    /**
     * Attach files selected by user
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
     * Attach non-file drag-and-drop contents
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
                    return this.addImage(image);
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
     * Return the number of resources
     *
     * @return {Number}
     */
    getResourceCount: function() {
        var resources = this.props.resources;
        return (resources) ? resources.length : 0;
    },

    /**
     * Return the index of the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex: function() {
        var maxIndex = this.getResourceCount() - 1;
        var index = this.state.selectedResourceIndex;
        if (index > maxIndex) {
            index = maxIndex;
        }
        return index;
    },

    /**
     * Return URL of resource preview
     *
     * @param  {Object} res
     *
     * @return {String}
     */
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

    /**
     * Render component
     *
     * @return {ReactELement}
     */
    render: function() {
        return (
            <div className="media-editor">
                {this.renderResource()}
                {this.renderNavigation()}
                {this.renderPhotoDialog()}
                {this.renderAudioDialog()}
                {this.renderVideoDialog()}
            </div>
        );
    },

    /**
     * Render edit for the currently selected resource
     *
     * @return {ReactElement}
     */
    renderResource: function(res) {
        var index = this.getSelectedResourceIndex();
        var res = _.get(this.props.resources, index);
        if (!res) {
            // render placeholder
            return this.props.children;
        }
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
     * @return {ReactElement}
     */
    renderNavigation: function() {
        var index = this.getSelectedResourceIndex();
        var count = this.getResourceCount();
        if (count === 0) {
            return null;
        }
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

    /**
     * Render image with cropping handling
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderImageCropper: function(res) {
        var url = this.getResourceImageUrl(res);
        if (!url) {
            // will only happen when someone else's has just added an image
            // to a draft story (there's either an URL or a file)
            //
            // TODO: improve appearance of this
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
            show: (this.state.capturing === 'image'),
            locale: this.props.locale,
            onCapture: this.handlePhotoCapture,
            onCancel: this.handleCaptureCancel,
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
            show: (this.state.capturing === 'video'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleVideoCapture,
            onCancel: this.handleCaptureCancel,
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
            show: (this.state.capturing === 'audio'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleAudioCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <AudioCaptureDialogBox {...props} />
    },

    /**
     * Revoke blob URL on unmount
     */
    componentWillUnmount: function() {
        if (this.imageBlobUrl) {
            URL.revokeObjectURL(this.imageBlobUrl);
        }
    },

    /**
     * Call onChange handler
     *
     * @param  {Array<Object>} resources
     *
     * @return {Promise}
     */
    triggerChangeEvent: function(resources) {
        return this.props.onChange({
            type: 'change',
            target: this,
            resources,
        });
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
     * Add a resource
     *
     * @param  {Object} res
     *
     * @return {Promise<Number>}
     */
    addResource: function(res) {
        var path = 'details.resources'
        var resources = _.slice(this.props.resources);
        var index = resources.push(res) - 1;
        return this.triggerChangeEvent(resources).then(() => {
            return index;
        });
    },

    /**
     * Add an image
     *
     * @param  {Object} image
     *
     * @return {Promise<Number>}
     */
    addImage: function(image) {
        var res = _.clone(image);
        res.type = 'image';
        if (image.width && image.height) {
            res.clip = getDefaultClippingRect(image.width, image.height);
        }
        return this.addResource(res);
    },

    /**
     * Add a video
     *
     * @param  {Object} video
     *
     * @return {Promise<Number>}
     */
    addVideo: function(video) {
        var res = _.clone(video);
        res.type = 'video';
        if (video.width && video.height) {
            res.clip = getDefaultClippingRect(video.width, video.height);
        }
        return this.addResource(res);
    },

    /**
     * Add an audio
     *
     * @param  {Object} audio
     *
     * @return {Promise<Number>}
     */
    addAudio: function(audio) {
        var res = _.clone(audio);
        res.type = 'audio';
        return this.addResource(res);
    },

    /**
     * Add a link to a website
     *
     * @param  {Object} website
     *
     * @return {Promise<Number>}
     */
    attachWebsite: function(website) {
        var res = _.clone(website);
        res.type = 'website';
        return this.addResource(res);
    },

    /**
     * Add the contents of a file
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
                return this.addImage(image);
            });
        } else if (/^video\//.test(file.type)) {
            return BlobReader.loadVideo(file).then((vid) => {
                var format = _.last(_.split(file.type, '/'));
                var width = vid.videoWidth;
                var height = vid.videoHeight;
                var duration = vid.duration;
                return FrameGrabber.capture(vid).then((poster) => {
                    var video = {
                        format, file, width, height, duration,
                        poster_file: poster
                    };
                    return this.addVideo(video);
                });
            });
        } else if (/^audio\//.test(file.type)) {
            var format = _.last(_.split(file.type, '/'));
            var audio = { format, file };
            return this.addAudio(audio);
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
            throw new Error('Unrecognized file type: ' + file.type);
            console.log(file);
            return Promise.resolve(null);
        }
    },

    /**
     * Called after user has taken a photo
     *
     * @param  {Object} evt
     */
    handlePhotoCapture: function(evt) {
        this.addImage(evt.image);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleVideoCapture: function(evt) {
        this.addVideo(evt.video);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleAudioCapture: function(evt) {
        this.addAudio(evt.audio);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called when user clicks x or outside a capture dialog
     *
     * @param  {Event} evt
     */
    handleCaptureCancel: function(evt) {
        this.setState({ capturing: null });
    },

    /**
     * Called after user has made adjustments to an image's clipping rect
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleClipRectChange: function(evt) {
        var resources = _.slice(this.props.resources);
        var index = this.getSelectedResourceIndex();
        var res = resources[index] = _.clone(resources[index]);
        res.clip = evt.rect;
        return this.triggerChangeEvent(resources);
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
        var resources = _.slice(this.props.resources);
        var res = resources[index];
        resources.splice(index, 1);
        resources.splice(index - 1, 0, res);
        return this.triggerChangeEvent(resources).then(() => {
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
        var resources = _.slice(this.props.resources);
        resources.splice(index, 1);
        return this.triggerChangeEvent(resources).then(() => {
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
