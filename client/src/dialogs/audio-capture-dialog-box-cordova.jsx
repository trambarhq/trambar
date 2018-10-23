import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import CordovaFile from 'transport/cordova-file';

/**
 * Non-visual component that uses the Media Capture Cordiva plug-in to capture
 * an audio clip on an mobile phone.
 *
 * @extends PureComponent
 */
class AudioCaptureDialogBoxCordova extends PureComponent {
    static displayName = 'AudioCaptureDialogBoxCordova';

    /**
     * Return true if the browser has the necessary functionalities
     *
     * @return {Boolean}
     */
    static isAvailable() {
        // the plugin doesn't provide a UI on windows
        return !!window.cordova && !!navigator.device && cordova.platformId !== 'windows';
    }

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (!show && nextProps.show) {
            let capture = navigator.device.capture;
            if (capture) {
                requestPermissions().then(() => {
                    let options = {
                        duration: 15 * 60 * 60,
                        limit: 1,
                    };
                    capture.captureAudio(this.handleCaptureSuccess, this.handleCaptureFailure, options);
                });
            }
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
     * Report back to parent component that an image is ready
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
     * Report back to parent component that an image is being loaded
     *
     */
    triggerCapturePendingEvent() {
        let { onCapturePending } = this.props;
        if (onCapturePending) {
            onCapturePending({
                type: 'capturepending',
                target: this,
                resourceType: 'audio'
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
    handleCaptureSuccess(mediaFiles) {
        let { payloads } = this.props;
        this.triggerCloseEvent();
        let mediaFile = mediaFiles[0];
        if (mediaFile) {
            this.triggerCapturePendingEvent();
            MediaLoader.getFormatData(mediaFile).then((mediaFileData) => {
                let file = new CordovaFile(mediaFile.fullPath);
                let [ type, format ] = _.split(mediaFile.type, '/');
                let payload = payloads.add('audio');
                payload.attachFile(file);
                let res = {
                    type: 'audio',
                    payload_token: payload.id,
                    format: format,
                    width: mediaFileData.width,
                    height: mediaFileData.height,
                    filename: mediaFile.name,
                    duration: mediaFileData.duration * 1000,
                };
                this.triggerCaptureEvent(res);
                return null;
            }).catch((err) => {
                this.triggerCaptureErrorEvent(err);
                return null;
            });
        }
    }

    /**
     * Called when the operation failed for some reason
     */
    handleCaptureFailure(err) {
        this.triggerCloseEvent();
        this.triggerCaptureErrorEvent(err);
    }
}

function requestPermissions() {
    let permissions = cordova.plugins.permissions;
    if (!permissions || cordova.platformId !== 'android') {
        return Promise.resolve();
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
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}

export {
    AudioCaptureDialogBoxCordova as default,
    AudioCaptureDialogBoxCordova,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AudioCaptureDialogBoxCordova.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
