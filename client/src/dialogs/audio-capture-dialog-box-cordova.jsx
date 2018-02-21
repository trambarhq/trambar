var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var CordovaFile = require('utils/cordova-file');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'AudioCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            var capture = navigator.device.capture;
            if (capture) {
                capture.captureAudio(this.handleCaptureSuccess, this.handleCaptureFailure);
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
     * @param  {Array<MediaFiles>} mediaFiles
     */
    handleCaptureSuccess: function(mediaFiles) {
        var mediaFile = mediaFiles[0];
        if (mediaFile) {
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
                this.triggerCancelEvent();
                return null;
            });
        } else {
            this.triggerCancelEvent();
        }
    },

    /**
     * Called when user cancels the action
     */
    handleCaptureFailure: function(err) {
        this.triggerCancelEvent();
    },
});
