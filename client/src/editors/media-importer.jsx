import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import * as MediaTagReader from 'media/media-tag-reader';
import * as QuickStart from 'media/quick-start';
import * as BlobReader from 'transport/blob-reader';
import ResourceTypes from 'objects/types/resource-types';

// widgets
import PhotoCaptureDialogBoxBrowser from 'dialogs/photo-capture-dialog-box-browser';
import PhotoCaptureDialogBoxCordova from 'dialogs/photo-capture-dialog-box-cordova';
import AudioCaptureDialogBoxBrowser from 'dialogs/audio-capture-dialog-box-browser';
import AudioCaptureDialogBoxCordova from 'dialogs/audio-capture-dialog-box-cordova';
import VideoCaptureDialogBoxBrowser from 'dialogs/video-capture-dialog-box-browser';
import VideoCaptureDialogBoxCordova from 'dialogs/video-capture-dialog-box-cordova';

const USE_STREAM = true;

import './media-editor.scss';

/**
 * Component for media capturing and file importing. It'll start render a
 * specific dialog box when capture() is invoked by the parent component.
 * It also contains the code for importing files from a file input or
 * drag and drop event.
 *
 * @extends PureComponent
 */
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
        let { types } = this.props;
        return _.includes(types, type);
    }

    /**
     * Return the resource type given a mime type
     *
     * @param  {String} mimeType
     *
     * @return {String|undefined}
     */
    getResourceType(mimeType) {
        let type = MediaLoader.extractFileCategory(mimeType);
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
        let types = _.map(files, (file) => {
            return this.getResourceType(file.type);
        });
        let placeholders = this.addResourcePlaceholders(types);
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
        let { payloads } = this.props;
        let payload = payloads.add('image').attachFile(file);
        return MediaLoader.getImageMetadata(file).then((meta) => {
            return {
                type: 'image',
                payload_token: payload.id,
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
                payload_token: payload.id,
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
        let { payloads } = this.props;
        // if file is in a QuickTime container, make sure metadata is
        // at the beginning of the file
        return QuickStart.process(file).then((blob) => {
            if (!blob) {
                // if video wasn't processed, use the original file
                blob = file;
            }
            let payload = payloads.add('video');
            if (USE_STREAM) {
                // upload file in small chunks
                let stream = payloads.stream().pipe(blob);
                payload.attachStream(stream);
            } else {
                payload.attachFile(blob);
            }
            return MediaLoader.getVideoMetadata(blob).then((meta) => {
                payload.attachFile(meta.poster, 'poster')
                return {
                    type: 'video',
                    payload_token: payload.id,
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
                    payload_token: payload.id,
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
        let { payloads } = this.props;
        let payload = payloads.add('audio');
        if (USE_STREAM) {
            let stream = payloads.stream().pipe(file);
            payload.attachStream(stream);
        } else {
            payload.attachFile(file);
        }
        return MediaLoader.getAudioMetadata(file).then((meta) => {
            let audio = {
                type: 'audio',
                payload_token: payload.id,
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
                payload_token: payload.id,
                format: MediaLoader.extractFileFormat(file.type),
                filename: file.name,
                imported: true,
            };
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
        let { payloads } = this.props;
        return retrieveDataItemTexts(items).then((strings) => {
            let html = strings['text/html'];
            let url = strings['text/uri-list'];
            if (url) {
                // see if it's an image being dropped
                let type = /<img\b/i.test(html) ? 'image' : 'website';
                if (this.isAcceptable(type)) {
                    if (type === 'image') {
                        let filename = url.replace(/.*\/([^\?#]*).*/, '$1') || undefined;
                        let payload = payloads.add('image').attachURL(url);
                        return {
                            type: 'image',
                            payload_token: payload.id,
                            filename: filename,
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
        let { payloads, env, cameraDirection } = this.props;
        let { capturing } = this.state;
        let props = {
            show: (capturing === 'image'),
            cameraDirection,
            payloads,
            env,
            onLoadStart: this.handleLoadStart,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        if (env.platform === 'browser') {
            return <PhotoCaptureDialogBoxBrowser {...props} />;
        } else if (env.platform === 'cordova') {
            return <PhotoCaptureDialogBoxCordova {...props} />;
        }
    }

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderVideoDialog() {
        let { payloads, env, cameraDirection } = this.props;
        let { capturing } = this.state;
        let props = {
            show: (capturing === 'video'),
            cameraDirection,
            payloads,
            env,
            onLoadStart: this.handleLoadStart,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        if (env.platform === 'browser') {
            return <VideoCaptureDialogBoxBrowser {...props} />;
        } else if (env.platform === 'cordova') {
            return <VideoCaptureDialogBoxCordova {...props} />;
        }
    }

    /**
     * Render dialogbox for capturing video through MediaStream API
     *
     * @return {ReactElement}
     */
    renderAudioDialog() {
        let { payloads, env, cameraDirection } = this.props;
        let { capturing } = this.state;
        let props = {
            show: (capturing === 'audio'),
            payloads,
            env,
            onClose: this.handleClose,
            onCapturePending: this.handleCapturePending,
            onCaptureError: this.handleCaptureError,
            onCapture: this.handleCapture,
        };
        if (env.platform === 'browser') {
            return <AudioCaptureDialogBoxBrowser {...props} />;
        } else if (env.platform === 'cordova') {
            return <AudioCaptureDialogBoxCordova {...props} />;
        }
    }

    /**
     * Send end event if component is unmounted in the middle of capturing
     */
    componentWillUnmount() {
        let { capturing } = this.state;
        if (capturing) {
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
        let resources = _.map(types, (type) => {
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
        let { resources, limit } = this.props;
        if (_.isEmpty(newResources)) {
            return Promise.resolve(0);
        }
        let path = 'details.resources'
        let firstIndex = resources.length;
        if (limit === 1) {
            let newResource = _.first(newResources);
            let index = _.findIndex(resources, { type: newResource.type });
            resources = _.concat(resources, newResource);
            if (index !== -1) {
                resources.splice(index, 1);
                firstIndex--;
            }
        } else {
            resources = _.concat(resources, newResources);
        }
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
        let { resources } = this.props;
        let index = _.findIndex(resources, before);
        if (index !== -1) {
            resources = _.slice(resources);
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
        let { resources } = this.props;
        let index = _.findIndex(resources, before);
        if (index !== -1) {
            resources = _.slice(resources);
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
        let { onChange } = this.props;
        if (onChange) {
            onChange({
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
        let { onCaptureStart } = this.props;
        let { capturing } = this.state;
        if (onCaptureStart) {
            onCaptureStart({
                type: 'capturestart',
                target: this,
                mediaType: capturing,
            });
        }
    }

    /**
     * Call onCaptureEnd handler
     *
     * @param  {Object|undefined} resource
     */
    triggerCaptureEndEvent(resource) {
        let { onCaptureEnd } = this.props;
        let { capturing } = this.state;
        if (onCaptureEnd) {
            onCaptureEnd({
                type: 'captureend',
                target: this,
                mediaType: capturing,
                resource,
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
        let res = _.clone(evt.resource);
        let ext = (res.format === 'jpeg') ? 'jpg' : res.format;
        res.filename = getFilenameFromTime('.' + ext);
        if (this.resourcePlaceholder) {
            this.updateResource(this.resourcePlaceholder, res);
        } else {
            this.addResources([ res ]);
        }
    }
}

let importCount = 0;
let captureCount = 0;

/**
 * Retrieve the text in a DataTransferItem
 *
 * @param  {DataTransferItem} item
 *
 * @return {Promise<Object<String>>}
 */
function retrieveDataItemTexts(items) {
    let stringItems = _.filter(items, (item) => {
        if (item.kind === 'string') {
            return /^text\/(html|uri-list)/.test(item.type);
        }
    });
    // since items are ephemeral, we need to call getAsString() on all of them
    // synchronously and not in a callback (i.e. can't use Promise.map)
    let stringPromises = {};
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
        let node = document.createElement('DIV');
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

import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaImporter.propTypes = {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        types: PropTypes.arrayOf(PropTypes.oneOf(ResourceTypes)),
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),
        limit: PropTypes.number,

        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,

        onCaptureStart: PropTypes.func,
        onCaptureEnd: PropTypes.func,
        onChange: PropTypes.func.isRequired,
    };
}
