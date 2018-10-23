import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import CordovaFile from 'transport/cordova-file';

/**
 * Non-visual component that uses the Camera Cordova plugin to take a photo.
 *
 * @extends PureComponent
 */
class PhotoCaptureDialogBoxCordova extends PureComponent {
    static displayName = 'PhotoCaptureDialogBoxCordova';

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (nextProps.show && !show) {
            let camera = navigator.camera;
            if (camera) {
                let direction;
                if (nextProps.cameraDirection === 'front') {
                    direction = Camera.Direction.FRONT;
                } else if (nextProps.cameraDirection === 'back') {
                    direction = Camera.Direction.BACK;
                }
                let options = {
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
     * @param  {String} imageURL
     */
    handleCaptureSuccess = (imageURL) => {
        let { payloads } = this.props;
        let file = new CordovaFile(imageURL);
        this.triggerCloseEvent();
        this.triggerCapturePendingEvent();
        file.obtainMetadata().then(() => {
            return MediaLoader.getImageMetadata(file).then((meta) => {
                let payload = payloads.add('image').attachFile(file);
                let res = {
                    type: 'image',
                    payload_token: payload.id,
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
    PhotoCaptureDialogBoxCordova as default,
    PhotoCaptureDialogBoxCordova,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PhotoCaptureDialogBoxCordova.propTypes = {
        show: PropTypes.bool,
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),

        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
