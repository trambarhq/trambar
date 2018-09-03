import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import MediaLoader from 'media/media-loader';
import CordovaFile from 'transport/cordova-file';

class AudioCaptureDialogBox extends PureComponent {
    static displayName = 'AudioCaptureDialogBox';

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
        if (!this.props.show && nextProps.show) {
            var capture = navigator.device.capture;
            if (capture) {
                requestPermissions().then(() => {
                    var options = {
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
        if (this.props.onClose) {
            this.props.onClose({
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
        if (this.props.onCapture) {
            this.props.onCapture({
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
        if (this.props.onCapturePending) {
            this.props.onCapturePending({
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
        if (this.props.onCaptureError) {
            this.props.onCaptureError({
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
        this.triggerCloseEvent();
        var mediaFile = mediaFiles[0];
        if (mediaFile) {
            this.triggerCapturePendingEvent();
            MediaLoader.getFormatData(mediaFile).then((mediaFileData) => {
                var file = new CordovaFile(mediaFile.fullPath);
                var [ type, format ] = _.split(mediaFile.type, '/');
                var payload = this.props.payloads.add('audio');
                payload.attachFile(file);
                var res = {
                    type: 'audio',
                    payload_token: payload.token,
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
    var permissions = cordova.plugins.permissions;
    if (!permissions || cordova.platformId !== 'android') {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        var successCB = () => {
            resolve();
        };
        var errorCB = (err) => {
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
    AudioCaptureDialogBox as default,
    AudioCaptureDialogBox,
};

import Payloads from 'transport/payloads';
import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AudioCaptureDialogBox.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
