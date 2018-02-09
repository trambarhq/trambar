var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var MediaTagReader = require('media/media-tag-reader');
var BlobReader = require('utils/blob-reader');
var LinkParser = require('utils/link-parser');
var FrameGrabber = require('media/frame-grabber');
var QuickStart = require('media/quick-start');
var BlobStream = require('transport/blob-stream');
var BlobManager = require('transport/blob-manager');

var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');

var USE_STREAM = true;

require('./media-editor.scss');

module.exports = React.createClass({
    displayName: 'MediaImporter',
    mixins: [ UpdateCheck ],
    propTypes: {
        resources: PropTypes.arrayOf(PropTypes.object),

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onCaptureStart: PropTypes.func,
        onCaptureEnd: PropTypes.func,
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
        };
    },

    /**
     * Start capturing image/video/audio
     *
     * @param  {String} type
     */
    capture: function(type) {
        this.setState({ capturing: type });
        if (this.props.onCaptureStart) {
            this.props.onCaptureStart({
                type: 'capturestart',
                target: this,
                mediaType: type,
            });
        }
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
                    return MediaLoader.loadImage(url).then((image) => {
                        var filename = url.replace(/.*\/([^\?#]*).*/, '$1') || undefined;
                        return {
                            type: 'image',
                            external_url: url,
                            filename: filename,
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                            clip: getDefaultClippingRect(image.naturalWidth, image.naturalHeight)
                        };
                    });
                } else {
                    return {
                        type: 'website',
                        url: url,
                        title: getInnerText(html),
                    };
                }
            }
        }).then((res) => {
            if (res) {
                return this.addResources([ res ]);
            }
        });
    },

    /**
     * Render component
     *
     * @return {ReactELement}
     */
    render: function() {
        return (
            <div>
                {this.renderPhotoDialog()}
                {this.renderAudioDialog()}
                {this.renderVideoDialog()}
            </div>
        );
    },

    /**
     * Render dialogbox for capturing picture through MediaStream API
     *
     * @return {ReactElement}
     */
    renderPhotoDialog: function() {
        var props = {
            show: (this.state.capturing === 'image'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <PhotoCaptureDialogBox {...props} />
    },

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderVideoDialog: function() {
        var props = {
            show: (this.state.capturing === 'video'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <VideoCaptureDialogBox {...props} />
    },

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderAudioDialog: function() {
        var props = {
            show: (this.state.capturing === 'audio'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onCapture: this.handleCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <AudioCaptureDialogBox {...props} />
    },

    componentWillUnmount: function() {
        if (this.state.capturing) {
            if (this.props.onCaptureEnd) {
                this.props.onCaptureEnd({
                    type: 'captureend',
                    target: this,
                    mediaType: this.state.capturing,
                });
            }
        }
    },

    /**
     * Call onChange handler
     *
     * @param  {Array<Object>} resources
     * @param  {Number} selection
     *
     * @return {Promise}
     */
    triggerChangeEvent: function(resources, selection) {
        return this.props.onChange({
            type: 'change',
            target: this,
            resources,
            selection,
        });
    },

    /**
     * Add new resources
     *
     * @param  {Array<Object>} newResources
     *
     * @return {Promise<Number|undefined>}
     */
    addResources: function(newResources) {
        if (_.isEmpty(newResources)) {
            return Promise.resolve();
        }
        var path = 'details.resources'
        var resourcesBefore = this.props.resources || [];
        var resources = _.concat(resourcesBefore, newResources);
        var firstIndex = resourcesBefore.length;
        return this.triggerChangeEvent(resources, firstIndex);
    },

    /**
     * Add the contents of a file
     *
     * @param  {Array<File>} files
     *
     * @return {Promise<Number|null>}
     */
    importFiles: function(files) {
        // create a copy of the array so it doesn't disappear during
        // asynchronous operation
        files = _.slice(files);
        return Promise.map(files, (file, index) => {
            var parts = _.split(file.type, '/');
            var type = parts[0];
            var format = parts[1];
            if (type === 'image') {
                return this.importImageFile(file, format);
            } else if (type === 'video') {
                return this.importVideoFile(file, format);
            } else if (type === 'audio') {
                return this.importAudioFile(file, format);
            } else if (type === 'application' && /x-mswinurl|x-desktop/.test(format)) {
                return this.importBookmarkFile(file, format);
            }
        }).then((resources) => {
            return this.addResources(_.filter(resources));
        });
    },

    /**
     * Import an image file
     *
     * @param  {File} file
     * @param  {String} format
     *
     * @return {Promise<Object>}
     */
    importImageFile: function(file, format) {
        var blobURL = BlobManager.manage(file);
        var payload = this.props.payloads.add('image');
        payload.attachFile(file);
        return MediaLoader.loadImage(blobURL).then((image) => {
            return {
                type: 'image',
                payload_token: payload.token,
                format: format,
                filename: file.name,
                width: image.naturalWidth,
                height: image.naturalHeight,
                clip: getDefaultClippingRect(image.naturalWidth, image.naturalHeight),
                imported: true,
            };
        }).catch((err) => {
            return {
                type: 'image',
                payload_token: payload.token,
                format: format,
                filename: file.name,
                imported: true,
            };
        });
    },

    /**
     * Import a video file
     *
     * @param  {File} file
     * @param  {String} format
     *
     * @return {Promise<Object>}
     */
    importVideoFile: function(file, format) {
        // if file is in a QuickTime container, make sure metadata is
        // at the beginning of the file
        return QuickStart.process(file).then((blob) => {
            if (!blob) {
                // if video wasn't processed, use the original file
                blob = file;
            }
            var blobURL = BlobManager.manage(blob);
            var payload = this.props.payloads.add('video');
            if (USE_STREAM) {
                // upload file in small chunks
                var stream = this.props.payloads.stream();
                stream.pipe(blob);
                payload.attachStream(stream);
            } else {
                payload.attachFile(blob);
            }
            return MediaLoader.loadVideo(blobURL).then((video) => {
                return FrameGrabber.capture(video).then((posterBlob) => {
                    payload.attachFile(posterBlob, 'poster')
                    return {
                        type: 'video',
                        payload_token: payload.token,
                        format: format,
                        filename: file.name,
                        width: video.videoWidth,
                        height: video.videoHeight,
                        clip: getDefaultClippingRect(video.videoWidth, video.videoHeight),
                        duration: Math.round(video.duration * 1000),
                        imported: true,
                    };
                });
            }).catch((err) => {
                // not MP4--poster needs to be generated on server side
                payload.attachStep('main', 'poster')
                return {
                    type: 'video',
                    payload_token: payload.token,
                    format: format,
                    filename: file.name,
                    imported: true,
                };
            });
        });
    },

    /**
     * Import an audio file
     *
     * @param  {File} file
     * @param  {String} format
     *
     * @return {Promise<Object>}
     */
    importAudioFile: function(file, format) {
        var blobURL = BlobManager.manage(file);
        var payload = this.props.payloads.add('audio');
        if (USE_STREAM) {
            var stream = this.props.payloads.stream();
            stream.pipe(file);
            payload.attachStream(stream);
        } else {
            payload.attachFile(file);
        }
        return MediaLoader.loadAudio(blobURL).then((audio) => {
            var audio = {
                type: 'audio',
                payload_token: payload.token,
                format: format,
                filename: file.name,
                duration: Math.round(audio.duration * 1000),
                imported: true,
            };
            return MediaTagReader.extractAlbumArt(file).then((imageBlob) => {
                if (!imageBlob) {
                    return audio;
                }
                var imageBlobURL = BlobManager.manage(imageBlob);
                payload.attachFile(imageBlob, 'poster');
                return MediaLoader.loadImage(imageBlobURL).then((image) => {
                    audio.width = image.naturalWidth;
                    audio.height = image.naturalHeight;
                    audio.clip = getDefaultClippingRect(image.naturalWidth, image.naturalHeight);
                    return audio;
                });
            });
        }).catch((err) => {
            return {
                type: 'audio',
                payload_token: payload.token,
                format: format,
                filename: file.name,
                imported: true,
            };
        });
    },

    /**
     * Import a bookmark/shortcut file
     *
     * @param  {File} file
     * @param  {String} format
     *
     * @return {Promise<Object|undefined>}
     */
    importBookmarkFile: function(file, format) {
        return BlobReader.loadText(file).then((text) => {
            var link = LinkParser.parse(text);
            if (link && /https?:/.test(link.url)) {
                var payload = this.props.payloads.add('website');
                payload.attachURL(link.url, 'poster');
                return {
                    type: 'website',
                    payload_token: payload.token,
                    url: link.url,
                    title: link.name || _.replace(file.name, /\.\w+$/, ''),
                };
            }
        });
    },

    /**
     * Called after user has taken a photo, video, or audio
     *
     * @param  {Object} evt
     */
    handleCapture: function(evt) {
        var res = _.clone(evt.resource);
        if (res.width && res.height) {
            res.clip = getDefaultClippingRect(res.width, res.height);
        }
        res.filename = getFilenameFromTime('.' + res.format) ;
        this.addResources([ res ]);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called when user clicks x or outside a capture dialog
     *
     * @param  {Event} evt
     */
    handleCaptureCancel: function(evt) {
        this.setState({ capturing: null });
        if (this.props.onCaptureEnd) {
            this.props.onCaptureEnd({
                type: 'captureend',
                target: this,
                mediaType: this.state.capturing,
            });
        }
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

/**
 * Get plain text from HTML
 *
 * @param  {String} html
 *
 * @return {String}
 */
function getInnerText(html) {
    if (html) {
        var node = document.createElement('DIV');
        node.innerHTML = html.replace(/<.*?>/g, '');
        website.title = node.innerText;
    }
}

/**
 * Generate a filename from the current time
 *
 * @return {String}
 */
function getFilenameFromTime(ext) {
    return _.toUpper(Moment().format('YYYY-MMM-DD-hhA')) + ext;
}
