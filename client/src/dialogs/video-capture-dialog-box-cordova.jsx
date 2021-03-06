import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import CordovaFile from 'transport/cordova-file';

/**
 * Non-visual component that uses the Media Capture Cordiva plug-in to capture
 * a video clip on an mobile phone.
 *
 * @extends PureComponent
 */
class VideoCaptureDialogBoxCordova extends PureComponent {
    static displayName = 'VideoCaptureDialogBoxCordova';

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (nextProps.show && !show) {
            this.startCapture();
        }
    }

    /**
     * Render function
     *
     * @return {null}
     */
    render() {
        return null;
    }

    async startCapture() {
        let capture = navigator.device.capture;
        if (capture) {
            await requestPermissions();
            let options = {
                duration: 5 * 60 * 60,
                limit: 1,
            };
            capture.captureVideo(this.handleCaptureSuccess, this.handleCaptureFailure, options);
        }
    }

    /**
     * Inform parent component that dialog box should be closed
     */
    triggerCloseEvent() {
        let { onClose } = this.props;
        if (onClose) {
            onClose({
                type: 'close',
                target: this,
            });
        }
    }

    /**
     * Report back to parent component that a video is ready
     *
     * @param  {Object} resource
     */
    triggerCaptureEvent(resource) {
        let { onCapture } = this.props;
        if (onCapture) {
            onCapture({
                type: 'capture',
                target: this,
                resource,
            });
        }
    }

    /**
     * Report back to parent component that a video is being loaded
     *
     */
    triggerCapturePendingEvent() {
        let { onCapturePending } = this.props;
        if (onCapturePending) {
            onCapturePending({
                type: 'capturepending',
                target: this,
                resourceType: 'video'
            });
        }
    }

    /**
     * Report back to parent component that loading has failed
     *
     * @param  {Error} err
     */
    triggerCaptureErrorEvent(err) {
        let { onCaptureError } = this.props;
        if (onCaptureError) {
            onCaptureError({
                type: 'capturefailure',
                target: this,
                error: err
            });
        }
    }

    /**
     * Called when plugin has capture an image
     *
     * @param  {Array<MediaFiles>} mediaFiles
     */
    handleCaptureSuccess = async (mediaFiles) => {
        let { payloads } = this.props;
        this.triggerCloseEvent();
        let mediaFile = mediaFiles[0];
        if (mediaFile) {
            this.triggerCapturePendingEvent();
            try {
                let mediaFileData = await MediaLoader.getFormatData(mediaFile);
                let fullPath;
                if (cordova.platformId === 'windows') {
                    fullPath = mediaFile.localURL;
                } else {
                    fullPath = mediaFile.fullPath;
                }
                let file = new CordovaFile(fullPath, mediaFile.type, mediaFile.size);
                let payload = payloads.add('video');
                payload.attachFile(file);

                let res = {
                    type: 'video',
                    payload_token: payload.id,
                    format: MediaLoader.extractFileFormat(mediaFile.type),
                    filename: mediaFile.name,
                    duration: mediaFileData.duration * 1000,
                };
                try {
                    let thumbnailURL = await createThumbnail(file);
                    let posterFile = new CordovaFile(thumbnailURL);
                    let poster = await MediaLoader.getImageMetadata(posterFile);
                    payload.attachFile(posterFile, 'poster');
                    // use the poster's width and height, as they're
                    // corrected for camera orientation
                    res.width = poster.width;
                    res.height = poster.height;
                } catch (err) {
                    // can't generate thumbnail--let the server do it
                    payload.attachStep('main', 'poster')
                }
                this.triggerCaptureEvent(res);
            } catch (err) {
                this.triggerCaptureErrorEvent(err);
            }
        }
    }

    /**
     * Called when the operation failed for some reason
     */
    handleCaptureFailure = (err) => {
        this.triggerCloseEvent();
        this.triggerCaptureErrorEvent(err);
    }
}

function createThumbnail(file) {
    return new Promise((resolve, reject) => {
        let successCB = (path) => {
            if (cordova.platformId === 'windows') {
                // need to use ms-appdata: URL instead of win32 path
                let backSlashIndex = _.lastIndexOf(path, '\\');
                if (backSlashIndex !== -1) {
                    let filename = path.substr(backSlashIndex + 1);
                    path = cordova.file.dataDirectory + filename;
                }
            }
            resolve(path);
        };
        let errorCB = (err) => {
            reject(new Error(err));
        };
        let options = {
            fileUri: file.fullPath,
            outputFileName: file.name,
            quality: 70
        };
        if (cordova.platformId === 'windows') {
            // on Windows the plugin doesn't automatically add an extension
            options.outputFileName += '.jpg';
        }
        VideoEditor.createThumbnail(successCB, errorCB, options);
    });
}

async function requestPermissions() {
    let permissions = cordova.plugins.permissions;
    if (!permissions || cordova.platformId !== 'android') {
        return;
    }
    return new Promise((resolve, reject) => {
        let successCB = () => {
            resolve();
        };
        let errorCB = (err) => {
            reject(new Error('Unable to obtain permission'));
        };
        permissions.requestPermissions([
            permissions.RECORD_AUDIO,
            permissions.RECORD_VIDEO,
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}

export {
    VideoCaptureDialogBoxCordova as default,
    VideoCaptureDialogBoxCordova,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VideoCaptureDialogBoxCordova.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
