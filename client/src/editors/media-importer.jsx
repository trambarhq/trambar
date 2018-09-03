import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import MediaLoader from 'media/media-loader';
import MediaTagReader from 'media/media-tag-reader';
import LinkParser from 'utils/link-parser';
import QuickStart from 'media/quick-start';
import BlobReader from 'transport/blob-reader';
import ResourceTypes from 'objects/types/resource-types';

// widgets
import PhotoCaptureDialogBox from 'dialogs/photo-capture-dialog-box';
import AudioCaptureDialogBox from 'dialogs/audio-capture-dialog-box';
import VideoCaptureDialogBox from 'dialogs/video-capture-dialog-box';

const USE_STREAM = true;

import './media-editor.scss';

class MediaImporter extends PureComponent {
    static displayName = 'MediaImporter';

    constructor(props) {
        super(props);
        this.state = {
            capturing: null,
        };
    }

    /**
     * Return true if a media type is acceptable
     *
     * @param  {String} type
     *
     * @return {Boolean}
     */
    isAcceptable(type) {
        return _.includes(this.props.types, type);
    }

    /**
     * Return the resource type given a mime type
     *
     * @param  {String} mimeType
     *
     * @return {String|undefined}
     */
    getResourceType(mimeType) {
        var type = MediaLoader.extractFileCategory(mimeType);
        if (type === 'application') {
            switch (MediaLoader.extractFileFormat(mimeType)) {
                case 'x-mswinurl':
                case 'x-desktop':
                    type = 'website';
                    break;
            }
        }
        if (this.isAcceptable(type)) {
            return type;
        }
    }

    /**
     * Start capturing image/video/audio
     *
     * @param  {String} type
     */
    capture(type) {
        this.setState({ capturing: type });
        this.triggerCaptureStartEvent();
    }

    /**
     * Add the contents of a file
     *
     * @param  {Array<File>} files
     *
     * @return {Promise<Number|null>}
     */
    importFiles(files) {
        // create a copy of the array so it doesn't disappear during
        // asynchronous operation
        files = _.filter(files, (file) => {
            return !!this.getResourceType(file.type);
        });
        // add placeholders first
        var types = _.map(files, (file) => {
            return this.getResourceType(file.type);
        });
        var placeholders = this.addResourcePlaceholders(types);
        return Promise.each(files, (file, index) => {
            // import the file then replace the placeholder
            return this.importFile(file).then((res) => {
                this.updateResource(placeholders[index], res);
                return null;
            }).catch((err) => {
                this.removeResource(placeholders[index]);
                return null;
            });
        });
    }

    /**
     * Import a media file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importFile(file) {
        switch (this.getResourceType(file.type)) {
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

    /**
     * Import an image file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importImageFile(file) {
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
        });
    }

    /**
     * Import a video file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importVideoFile(file) {
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
    }

    /**
     * Import an audio file
     *
     * @param  {File} file
     *
     * @return {Promise<Object>}
     */
    importAudioFile(file) {
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
    }

    /**
     * Import a bookmark/shortcut file
     *
     * @param  {File} file
     *
     * @return {Promise<Object|undefined>}
     */
    importBookmarkFile(file) {
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
    }

    /**
     * Attach non-file drag-and-drop contents
     *
     * @param  {Array<DataTransferItem>} items
     *
     * @return {Promise<Number>}
     */
    importDataItems(items) {
        return retrieveDataItemTexts(items).then((strings) => {
            var html = strings['text/html'];
            var url = strings['text/uri-list'];
            if (url) {
                // see if it's an image being dropped
                var type = /<img\b/i.test(html) ? 'image' : 'website';
                if (this.isAcceptable(type)) {
                    if (type === 'image') {
                        var filename = url.replace(/.*\/([^\?#]*).*/, '$1') || undefined;
                        var payload = this.props.payloads.add('image').attachURL(url);
                        return {
                            type: 'image',
                            payload_token: payload.token,
                            filename: filename,
                        };
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
            if (!res) {
                return 0;
            }
            this.addResources([ res ]);
            return null;
        });
    }

    /**
     * Render component
     *
     * @return {ReactELement}
     */
    render() {
        return (
            <div>
                {this.renderPhotoDialog()}
                {this.renderAudioDialog()}
                {this.renderVideoDialog()}
            </div>
        );
    }

    /**
     * Render dialogbox for capturing picture through MediaStream API
     *
     * @return {ReactElement}
     */
    renderPhotoDialog() {
        var props = {
            show: (this.state.capturing === 'image'),
            cameraDirection: this.props.cameraDirection,
            payloads: this.props.payloads,
            locale: this.props.locale,
            onLoadStart: this.handleLoadStart,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        return <PhotoCaptureDialogBox {...props} />
    }

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderVideoDialog() {
        var props = {
            show: (this.state.capturing === 'video'),
            cameraDirection: this.props.cameraDirection,
            payloads: this.props.payloads,
            locale: this.props.locale,
            onLoadStart: this.handleLoadStart,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        return <VideoCaptureDialogBox {...props} />
    }

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderAudioDialog() {
        var props = {
            show: (this.state.capturing === 'audio'),
            payloads: this.props.payloads,
            locale: this.props.locale,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        return <AudioCaptureDialogBox {...props} />
    }

    /**
     * Send end event if component is unmounted in the middle of capturing
     */
    componentWillUnmount() {
        if (this.state.capturing) {
            this.triggerCaptureEndEvent();
        }
    }

    /**
     * Add new resource placeholders
     *
     * @param  {Array<Object>} newResources
     *
     * @return {Array<Object>}
     */
    addResourcePlaceholders(types) {
        var resources = _.map(types, (type) => {
            return {
                type: type,
                pending: `import-${++importCount}`,
                imported: true,
            };
        });
        this.addResources(resources);
        return resources;
    }

    /**
     * Add new resources
     *
     * @param  {Array<Object>} newResources
     */
    addResources(newResources) {
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
        this.triggerChangeEvent(resources, firstIndex);
    }

    /**
     * Update a resource placeholder with actual properties
     *
     * @param  {Object} before
     * @param  {Object} after
     *
     * @return {Promise}
     */
    updateResource(before, after) {
        var resources = _.slice(this.props.resources);
        var index = _.findIndex(resources, before);
        if (index !== -1) {
            resources[index] = after;
            this.triggerChangeEvent(resources);
        }
        return null;
    }

    /**
     * Remove a resource placeholder when import fails
     *
     * @param  {Object} before
     *
     * @return {Promise}
     */
    removeResource(before, after) {
        var resources = _.slice(this.props.resources);
        var index = _.findIndex(resources, before);
        if (index !== -1) {
            resources.splice(index, 1);
            this.triggerChangeEvent(resources);
        }
    }

    /**
     * Call onChange handler
     *
     * @param  {Array<Object>} resources
     * @param  {Number|undefined} selection
     */
    triggerChangeEvent(resources, selection) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                resources,
                selection,
            });
        }
    }

    /**
     * Call onCaptureStart handler
     */
    triggerCaptureStartEvent() {
        if (this.props.onCaptureStart) {
            this.props.onCaptureStart({
                type: 'capturestart',
                target: this,
                mediaType: this.state.capturing,
            });
        }
    }

    /**
     * Call onCaptureEnd handler
     *
     * @param  {Object|undefined} res
     */
    triggerCaptureEndEvent(res) {
        if (this.props.onCaptureEnd) {
            this.props.onCaptureEnd({
                type: 'captureend',
                target: this,
                mediaType: this.state.capturing,
                resource: res,
            });
        }
    }

    /**
     * Called when user clicks x or outside a capture dialog
     *
     * @param  {Event} evt
     */
    handleClose = (evt) => {
        this.setState({ capturing: null });
        this.triggerCaptureEndEvent();
    }

    /**
     * Called before a media file is being loaded
     *
     * @param  {Object} evt
     */
    handleCapturePending = (evt) => {
        this.resourcePlaceholder = {
            type: evt.resourceType,
            pending: `capture-${++captureCount}`
        };
        this.addResources([ this.resourcePlaceholder ]);
    }

    /**
     * Called when an error occurs while capturing or loading an image or video
     *
     * @param  {Object} evt
     */
    handleCaptureError = (evt) => {
        if (this.resourcePlaceholder) {
            this.removeResource(this.resourcePlaceholder);
        }
    }

    /**
     * Called after user has taken a photo, video, or audio
     *
     * @param  {Object} evt
     */
    handleCapture = (evt) => {
        var res = _.clone(evt.resource);
        var ext = (res.format === 'jpeg') ? 'jpg' : res.format;
        res.filename = getFilenameFromTime('.' + ext);
        if (this.resourcePlaceholder) {
            this.updateResource(this.resourcePlaceholder, res);
        } else {
            this.addResources([ res ]);
        }
    }
}

var importCount = 0;
var captureCount = 0;

/**
 * Retrieve the text in a DataTransferItem
 *
 * @param  {DataTransferItem} item
 *
 * @return {Promise<Object<String>>}
 */
function retrieveDataItemTexts(items) {
    var stringItems = _.filter(items, (item) => {
        if (item.kind === 'string') {
            return /^text\/(html|uri-list)/.test(item.type);
        }
    });
    // since items are ephemeral, we need to call getAsString() on all of them
    // synchronously and not in a callback (i.e. can't use Promise.map)
    var stringPromises = {};
    _.each(stringItems, (item) => {
        // keyed by mime type
        stringPromises[item.type] = new Promise((resolve, reject) => {
            item.getAsString(resolve);
        });
    });
    return Promise.props(stringPromises);
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

MediaImporter.defaultProps = {
    types: ResourceTypes,
    limit: Infinity,
};

export {
    MediaImporter as default,
    MediaImporter,
};

import Locale from 'locale/locale';
import Theme from 'theme/theme';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    MediaImporter.propTypes = {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        types: PropTypes.arrayOf(PropTypes.oneOf(ResourceTypes)),
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),
        limit: PropTypes.number,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onCaptureStart: PropTypes.func,
        onCaptureEnd: PropTypes.func,
        onChange: PropTypes.func.isRequired,
    };
}
