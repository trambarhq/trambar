var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var MediaTagReader = require('media/media-tag-reader');
var LinkParser = require('utils/link-parser');
var QuickStart = require('media/quick-start');
var BlobReader = require('transport/blob-reader');
var ResourceTypes = require('objects/types/resource-types');

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
        types: PropTypes.arrayOf(PropTypes.oneOf(ResourceTypes)),
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),
        limit: PropTypes.number,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onCaptureStart: PropTypes.func,
        onCaptureEnd: PropTypes.func,
        onChange: PropTypes.func.isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            types: ResourceTypes,
            limit: Infinity,
        };
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
     * Return true if a media type is acceptable
     *
     * @param  {String} type
     *
     * @return {Boolean}
     */
    isAcceptable: function(type) {
        return _.includes(this.props.types, type);
    },

    /**
     * Start capturing image/video/audio
     *
     * @param  {String} type
     */
    capture: function(type) {
        this.setState({ capturing: type });
        this.triggerCaptureStartEvent();
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
            var type = MediaLoader.extractFileCategory(file.type);
            if (/application\/(x-mswinurl|x-desktop)/.test(file.type)) {
                type = 'website';
            }
            if (this.isAcceptable(type)) {
                switch (type) {
                    case 'image':
                        return this.importImageFile(file);
                    case 'video':
                        return this.importVideoFile(file);
                    case 'audio':
                        return this.importAudioFile(file);
                    case 'website':
                        return this.importBookmarkFile(file);
                }
            }
        }).then((resources) => {
            return this.addResources(_.filter(resources));
        });
    },

    /**
     * Import an image file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importImageFile: function(file) {
        var payload = this.props.payloads.add('image').attachFile(file);
        return MediaLoader.getImageMetadata(file).then((meta) => {
            return {
                type: 'image',
                payload_token: payload.token,
                width: meta.width,
                height: meta.height,
                format: meta.format,
                filename: file.name,
                imported: true,
            };
        }).catch((err) => {
            // not a format that the browser recognizes
            return {
                type: 'image',
                payload_token: payload.token,
                format: MediaLoader.extractFileFormat(file.type),
                filename: file.name,
                imported: true,
            };
        });;
    },

    /**
     * Import a video file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importVideoFile: function(file) {
        // if file is in a QuickTime container, make sure metadata is
        // at the beginning of the file
        return QuickStart.process(file).then((blob) => {
            if (!blob) {
                // if video wasn't processed, use the original file
                blob = file;
            }
            var payload = this.props.payloads.add('video');
            if (USE_STREAM) {
                // upload file in small chunks
                var stream = this.props.payloads.stream().pipe(blob);
                payload.attachStream(stream);
            } else {
                payload.attachFile(blob);
            }
            return MediaLoader.getVideoMetadata(blob).then((meta) => {
                payload.attachFile(meta.poster, 'poster')
                return {
                    type: 'video',
                    payload_token: payload.token,
                    width: meta.width,
                    height: meta.height,
                    format: meta.format,
                    duration: meta.duration,
                    filename: file.name,
                    imported: true,
                };
            }).catch((err) => {
                // not MP4--poster needs to be generated on server side
                payload.attachStep('main', 'poster')
                return {
                    type: 'video',
                    payload_token: payload.token,
                    format: MediaLoader.extractFileFormat(file.type),
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
     *
     * @return {Promise<Object>}
     */
    importAudioFile: function(file) {
        var payload = this.props.payloads.add('audio');
        if (USE_STREAM) {
            var stream = this.props.payloads.stream().pipe(file);
            payload.attachStream(stream);
        } else {
            payload.attachFile(file);
        }
        return MediaLoader.getAudioMetadata(file).then((meta) => {
            var audio = {
                type: 'audio',
                payload_token: payload.token,
                format: meta.format,
                duration: meta.duration,
                filename: file.name,
                imported: true,
            };
            return MediaTagReader.extractAlbumArt(file).then((imageBlob) => {
                if (!imageBlob) {
                    return audio;
                }
                payload.attachFile(imageBlob, 'poster');
                return MediaLoader.getImageMetadata(imageBlob).then((meta) => {
                    audio.width = meta.width;
                    audio.height = meta.height;
                    return audio;
                });
            });
        }).catch((err) => {
            return {
                type: 'audio',
                payload_token: payload.token,
                format: MediaLoader.extractFileFormat(file.type),
                filename: file.name,
                imported: true,
            };
        });
    },

    /**
     * Import a bookmark/shortcut file
     *
     * @param  {File} file
     *
     * @return {Promise<Object|undefined>}
     */
    importBookmarkFile: function(file) {
        return BlobReader.loadText(file).then((text) => {
            var link = LinkParser.parse(text);
            if (link && /https?:/.test(link.url)) {
                var payload = this.props.payloads.add('website').attachURL(link.url, 'poster');
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
     * Attach non-file drag-and-drop contents
     *
     * @param  {Array<DataTransferItem>} items
     *
     * @return {Promise<Number>}
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
                var type = /<img\b/i.test(html) ? 'image' : 'website';
                if (this.isAcceptable(type)) {
                    if (type === 'image') {
                        return MediaLoader.getImageMetadata(url).then((meta) => {
                            var filename = url.replace(/.*\/([^\?#]*).*/, '$1') || undefined;
                            var payload = this.props.payloads.add('image').attachURL(url);
                            return {
                                type: 'image',
                                payload_token: payload.token,
                                filename: filename,
                                width: meta.width,
                                height: meta.height,
                            };
                        }).catch((err) => {
                            // running into cross-site restrictions is quite likely here
                            console.log(`Unable to load image: ${url}`);
                        });
                    } else if (type === 'website') {
                        var payload = this.props.payloads.add('website').attachURL(url, 'poster');
                        return {
                            type: 'website',
                            payload_token: payload.token,
                            url: url,
                            title: getInnerText(html),
                        };
                    }
                }
            }
        }).then((res) => {
            if (res) {
                return this.addResources([ res ]);
            } else {
                return 0;
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
            cameraDirection: this.props.cameraDirection,
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
            cameraDirection: this.props.cameraDirection,
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
            this.triggerCaptureEndEvent();
        }
    },

    /**
     * Add new resources
     *
     * @param  {Array<Object>} newResources
     *
     * @return {Promise<Number>}
     */
    addResources: function(newResources) {
        if (_.isEmpty(newResources)) {
            return Promise.resolve(0);
        }
        var path = 'details.resources'
        var resourcesBefore = this.props.resources || [];
        var resources;
        if (this.props.limit === 1) {
            var newResource = _.first(newResources);
            var index = _.findIndex(resourcesBefore, { type: newResource.type });
            resources = _.concat(resourcesBefore, newResource);
            if (index !== -1) {
                resources.splice(index, 1);
            }
        } else {
            resources = _.concat(resourcesBefore, newResources);
        }
        var firstIndex = resourcesBefore.length;
        return this.triggerChangeEvent(resources, firstIndex).then(() => {
            return newResources.length;
        });
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
     * Call onCaptureStart handler
     */
    triggerCaptureStartEvent: function() {
        if (this.props.onCaptureStart) {
            this.props.onCaptureStart({
                type: 'capturestart',
                target: this,
                mediaType: this.state.capturing,
            });
        }
    },

    /**
     * Call onCaptureEnd handler
     *
     * @param  {Object|undefined} res
     */
    triggerCaptureEndEvent: function(res) {
        if (this.props.onCaptureEnd) {
            this.props.onCaptureEnd({
                type: 'captureend',
                target: this,
                mediaType: this.state.capturing,
                resource: res,
            });
        }
    },

    /**
     * Called after user has taken a photo, video, or audio
     *
     * @param  {Object} evt
     */
    handleCapture: function(evt) {
        var res = _.clone(evt.resource);
        if (res.type === 'image') {
            res.filename = getFilenameFromTime('.jpg');
        } else {
            res.filename = getFilenameFromTime('.' + res.format) ;
        }
        this.addResources([ res ]).then(() => {
            this.setState({ capturing: null });
            this.triggerCaptureEndEvent(res);
        });
    },

    /**
     * Called when user clicks x or outside a capture dialog
     *
     * @param  {Event} evt
     */
    handleCaptureCancel: function(evt) {
        this.setState({ capturing: null });
        this.triggerCaptureEndEvent();
    },
});

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
