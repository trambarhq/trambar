var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var CordovaFile = require('transport/cordova-file');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'PhotoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),

        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
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
     * Inform parent component that dialog box should be closed
     */
    triggerCloseEvent: function() {
        if (this.props.onClose) {
            this.props.onClose({
                type: 'close',
                target: this,
            });
        }
    },

    /**
     * Report back to parent component that an image is ready
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
     * Report back to parent component that an image is being loaded
     *
     */
    triggerCapturePendingEvent: function() {
        if (this.props.onCapturePending) {
            this.props.onCapturePending({
                type: 'capturepending',
                target: this,
                resourceType: 'image'
            });
        }
    },

    /**
     * Report back to parent component that loading has failed
     *
     * @param  {Error} err
     */
    triggerCaptureErrorEvent: function(err) {
        if (this.props.onCaptureError) {
            this.props.onCaptureError({
                type: 'capturefailure',
                target: this,
                error: err
            });
        }
    },

    /**
     * Called when plugin has capture an image
     *
     * @param  {String} imageURL
     */
    handleCaptureSuccess: function(imageURL) {
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
    },

    /**
     * Called when user cancels the action
     */
    handleCaptureFailure: function(message) {
        this.triggerCloseEvent();
    },
});
