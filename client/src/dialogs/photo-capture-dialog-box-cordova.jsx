import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import MediaLoader from 'media/media-loader';
import CordovaFile from 'transport/cordova-file';

class PhotoCaptureDialogBox extends PureComponent {
    static displayName = 'PhotoCaptureDialogBox';

    /**
     * Return true if the browser has the necessary functionalities
     *
     * @return {Boolean}
     */
    static isAvailable() {
        return !!window.cordova && !!navigator.camera;
    }

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (!this.props.show && nextProps.show) {
            var camera = navigator.camera;
            if (camera) {
                var direction;
                if (this.props.cameraDirection === 'front') {
                    direction = Camera.Direction.FRONT;
                } else if (this.props.cameraDirection === 'back') {
                    direction = Camera.Direction.BACK;
                }
                var options = {
                    quality: 50,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    encodingType: Camera.EncodingType.JPEG,
                    mediaType: Camera.MediaType.PICTURE,
                    cameraDirection: direction,
                    allowEdit: false,
                };
                camera.getPicture(this.handleCaptureSuccess, this.handleCaptureFailure, options);
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
                resourceType: 'image'
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
     * @param  {String} imageURL
     */
    handleCaptureSuccess = (imageURL) => {
        var file = new CordovaFile(imageURL);
        this.triggerCloseEvent();
        this.triggerCapturePendingEvent();
        file.obtainMetadata().then(() => {
            return MediaLoader.getImageMetadata(file).then((meta) => {
                var payload = this.props.payloads.add('image').attachFile(file);
                var res = {
                    type: 'image',
                    payload_token: payload.token,
                    format: meta.format,
                    width: meta.width,
                    height: meta.height,
                };
                this.triggerCaptureEvent(res);
                return null;
            });
        }).catch((err) => {
            this.triggerCaptureErrorEvent(err);
            return null;
        });
    }

    /**
     * Called when user cancels the action
     */
    handleCaptureFailure = (message) => {
        this.triggerCloseEvent();
    }
}

export {
    PhotoCaptureDialogBox as default,
    PhotoCaptureDialogBox,
};

import Payloads from 'transport/payloads';
import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PhotoCaptureDialogBox.propTypes = {
        show: PropTypes.bool,
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),

        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
