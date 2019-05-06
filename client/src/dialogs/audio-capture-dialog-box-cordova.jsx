import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'common/media/media-loader.mjs';
import CordovaFile from 'common/transport/cordova-file.mjs';

/**
 * Non-visual component that uses the Media Capture Cordiva plug-in to capture
 * an audio clip on an mobile phone.
 *
 * @extends PureComponent
 */
class AudioCaptureDialogBoxCordova extends PureComponent {
    static displayName = 'AudioCaptureDialogBoxCordova';

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (!show && nextProps.show) {
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
                duration: 15 * 60 * 60,
                limit: 1,
            };
            capture.captureAudio(this.handleCaptureSuccess, this.handleCaptureFailure, options);
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
    handleCaptureSuccess = async (mediaFiles) => {
        let { payloads } = this.props;
        this.triggerCloseEvent();
        let mediaFile = mediaFiles[0];
        if (mediaFile) {
            try {
                this.triggerCapturePendingEvent();
                let mediaFileData = await MediaLoader.getFormatData(mediaFile);
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
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}

export {
    AudioCaptureDialogBoxCordova as default,
    AudioCaptureDialogBoxCordova,
};

import Payloads from 'common/transport/payloads.mjs';
import Environment from 'common/env/environment.mjs';

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
