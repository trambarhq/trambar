var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
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
var MediaButton = require('widgets/media-button');
var PhotoCaptureDialogBox = require('dialogs/photo-capture-dialog-box');
var AudioCaptureDialogBox = require('dialogs/audio-capture-dialog-box');
var VideoCaptureDialogBox = require('dialogs/video-capture-dialog-box');
var ImageEditor = require('editors/image-editor');
var VideoEditor = require('editors/video-editor');
var AudioEditor = require('editors/audio-editor');

require('./media-editor.scss');

module.exports = React.createClass({
    displayName: 'MediaEditor',
    mixins: [ UpdateCheck ],
    propTypes: {
        allowEmbedding: PropTypes.bool,
        resources: PropTypes.arrayOf(PropTypes.object),
        initialResourceIndex: PropTypes.number,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onCaptureStart: PropTypes.func,
        onCaptureEnd: PropTypes.func,
        onChange: PropTypes.func.isRequired,
        onEmbed: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            capturing: null,
            selectedResourceIndex: this.props.initialResourceIndex || 0,
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
     * Render component
     *
     * @return {ReactELement}
     */
    render: function() {
        var index = this.getSelectedResourceIndex();
        var placeholder;
        if (this.props.theme.mode !== 'single-col') {
            placeholder = this.props.children;
        }
        if (index === -1) {
            // render placeholder
            return (
                <div className="media-editor empty">
                    {placeholder}
                    {this.renderDialogBox()}
                </div>
            );
        } else {
            return (
                <div className="media-editor">
                    <div className="resource">
                        {this.renderResource()}
                        {this.renderNavigation()}
                    </div>
                    {this.renderDialogBox()}
                </div>
            );
        }
    },

    /**
     * Render edit for the currently selected resource
     *
     * @return {ReactElement}
     */
    renderResource: function(res) {
        var index = this.getSelectedResourceIndex();
        var props = {
            resource: this.props.resources[index],
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleResourceChange,
        };
        switch (props.resource.type) {
            case 'image':
            case 'website':
                return <ImageEditor {...props} />;
            case 'video':
                return <VideoEditor {...props} />;
            case 'audio':
                return <AudioEditor {...props} />;
        }
    },

    /**
     * Render navigation bar for selecting resource
     *
     * @return {ReactElement}
     */
    renderNavigation: function() {
        var t = this.props.locale.translate;
        var index = this.getSelectedResourceIndex();
        var count = this.getResourceCount();
        if (count === 0) {
            return null;
        }
        var removeProps = {
            label: t('media-editor-remove'),
            icon: 'remove',
            onClick: this.handleRemoveClick,
        };
        var embedProps = {
            label: t('media-editor-embed'),
            icon: 'code',
            hidden: !this.props.allowEmbedding,
            onClick: this.handleEmbedClick,
        };
        var shiftProps = {
            label: t('media-editor-shift'),
            icon: 'chevron-left',
            hidden: !(count > 1),
            disabled: !(index > 0),
            onClick: this.handleShiftClick,
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
                    <MediaButton {...removeProps} />
                    <MediaButton {...embedProps} />
                    <MediaButton {...shiftProps} />
                </div>
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    },

    /**
     * Render dialog box
     *
     * @return {ReactELement|null}
     */
    renderDialogBox: function() {
        if (process.env.PLATFORM !== 'browser') {
            return null;
        }
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
            locale: this.props.locale,
            onCapture: this.handlePhotoCapture,
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
            onCapture: this.handleVideoCapture,
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
            onCapture: this.handleAudioCapture,
            onCancel: this.handleCaptureCancel,
        };
        return <AudioCaptureDialogBox {...props} />
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
     * Call onEmbed handler
     *
     * @param  {Object} resource
     */
    triggerEmbedEvent: function(resource) {
        if (this.props.onEmbed) {
            this.props.onEmbed({
                type: 'embed',
                target: this,
                resource,
            });
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
        return this.triggerChangeEvent(resources).then(() => {
            return this.selectResource(firstIndex);
        });
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
                var blobURL = BlobManager.manage(file);
                return MediaLoader.loadImage(blobURL).then((image) => {
                    return {
                        type: 'image',
                        format: format,
                        filename: file.name,
                        file: blobURL,
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                        clip: getDefaultClippingRect(image.naturalWidth, image.naturalHeight),
                        imported: true,
                    };
                });
            } else if (type === 'video') {
                // if file is in a QuickTime container, make sure metadata is
                // at the beginning of the file
                return QuickStart.process(file).then((blob) => {
                    if (!blob) {
                        // if video wasn't processed, use the original file
                        blob = file;
                    }
                    var blobURL = BlobManager.manage(blob);
                    return MediaLoader.loadVideo(blobURL).then((video) => {
                        return FrameGrabber.capture(video).then((posterBlob) => {
                            var posterBlobURL = BlobManager.manage(posterBlob);
                            // upload file in small chunks
                            var stream = new BlobStream;
                            stream.pipe(blob);
                            return {
                                type: 'video',
                                format: format,
                                filename: file.name,
                                file: blobURL,
                                stream: stream,
                                poster_file: posterBlobURL,
                                width: video.videoWidth,
                                height: video.videoHeight,
                                clip: getDefaultClippingRect(video.videoWidth, video.videoHeight),
                                duration: Math.round(video.duration * 1000),
                                imported: true,
                            };
                        });
                    });
                });
            } else if (type === 'audio') {
                var blobURL = BlobManager.manage(file);
                return MediaLoader.loadAudio(blobURL).then((audio) => {
                    var stream = new BlobStream;
                    stream.pipe(file);
                    return {
                        type: 'audio',
                        format: format,
                        filename: file.name,
                        file: blobURL,
                        stream: stream,
                        duration: Math.round(audio.duration * 1000),
                        imported: true,
                    };
                });
            } else if (type === 'application' && /x-mswinurl|x-desktop/.test(format)) {
                return BlobReader.loadText(file).then((text) => {
                    var link = LinkParser.parse(text);
                    if (link) {
                        return {
                            type: 'website',
                            url: link.url,
                            title: link.name || _.replace(file.name, /\.\w+$/, ''),
                        };
                    }
                });
            }
        }).then((resources) => {
            return this.addResources(_.filter(resources));
        });
    },

    /**
     * Called after user has taken a photo
     *
     * @param  {Object} evt
     */
    handlePhotoCapture: function(evt) {
        var res = _.clone(evt.image);
        res.type = 'image';
        res.filename = getFilenameFromTime('.jpg');
        res.clip = getDefaultClippingRect(res.width, res.height);
        this.addResources([ res ]);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleVideoCapture: function(evt) {
        var res = _.clone(evt.video);
        res.type = 'video';
        res.filename = getFilenameFromTime('.' + res.format) ;
        res.clip = getDefaultClippingRect(res.width, res.height);
        this.addResources([ res ]);
        this.handleCaptureCancel(evt);
    },

    /**
     * Called after user has shot a video
     *
     * @param  {Object} evt
     */
    handleAudioCapture: function(evt) {
        var res = _.clone(evt.audio);
        res.type = 'audio';
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
            return Promise.resolve(index);
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

    handleEmbedClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        if (index < 0) {
            return;
        }
        var resource = this.props.resources[index];
        this.triggerEmbedEvent(resource);
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

    handleResourceChange: function(evt) {
        var index = this.getSelectedResourceIndex();
        var resources = _.slice(this.props.resources);
        resources[index] = evt.resource;
        this.triggerChangeEvent(resources);
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
