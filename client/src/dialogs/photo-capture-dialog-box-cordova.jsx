var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var CordovaFile = require('utils/cordova-file');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'PhotoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },

    statics: {
        /**
         * Return true if the browser has the necessary functionalities
         *
         * @return {Boolean}
         */
        isAvailable: function() {
            return true;
        },
    },

    /**
     * Activate plugin when props.show goes from false to true
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.show && nextProps.show) {
            var camera = navigator.camera;
            if (camera) {
                var options = {
                    quality: 50,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType.CAMERA,
                    encodingType: Camera.EncodingType.JPEG,
                    mediaType: Camera.MediaType.PICTURE,
                    allowEdit: false,
                };
                camera.getPicture(this.handleCaptureSuccess, this.handleCaptureFailure, options);
            }
        }
    },

    /**
     * Render function
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Report back to parent component that an image has been captured and
     * accepted by user
     *
     * @param  {Object} resource
     */
    triggerCaptureEvent: function(resource) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                resource,
            });
        }
    },

    /**
     * Inform parent component that operation was cancelled
     */
    triggerCancelEvent: function() {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },

    /**
     * Called when plugin has capture an image
     *
     * @param  {String} imageURL
     */
    handleCaptureSuccess: function(imageURL) {
        MediaLoader.loadImage(imageURL).then((image) => {
            var file = new CordovaFile(imageURL, 'image/jpeg');
            return file.obtainSize().then(() => {
                var payload = this.props.payloads.add('image');
                payload.attachFile(file);
                var res = {
                    type: 'image',
                    payload_token: payload.token,
                    format: 'jpeg',
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                };
                this.triggerCaptureEvent(res);
            });
            return null;
        }).catch((err) => {
            this.triggerCancelEvent();
            return null;
        });
    },

    /**
     * Called when user cancels the action
     */
    handleCaptureFailure: function(message) {
        this.triggerCancelEvent();
    },
});
