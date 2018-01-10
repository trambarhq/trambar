var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var BlobManager = require('transport/blob-manager');
var CordovaFile = require('utils/cordova-file');

var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'VideoCaptureDialogBox',
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
            var capture = navigator.device.capture;
            if (capture) {
                capture.captureVideo(this.handleCaptureSuccess, this.handleCaptureFailure);
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
     * @param  {Object} video
     */
    triggerCaptureEvent: function(video) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                video,
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
                return createThumbnail(mediaFile).then((thumbnailURL) => {
                    var file = new CordovaFile(mediaFile.fullPath, mediaFile.type, mediaFile.size);
                    var posterFile = new CordovaFile(thumbnailURL, 'image/jpeg');
                    return posterFile.obtainSize().then(() => {
                        var fileURL = BlobManager.manage(file);
                        var posterFileURL = BlobManager.manage(posterFile);
                        var [ type, format ] = _.split(mediaFile.type, '/');
                        var video = {
                            format,
                            file: fileURL,
                            poster_file: posterFileURL,
                            width: mediaFileData.width,
                            height: mediaFileData.height,
                            filename: mediaFile.name,
                            duration: mediaFileData.duration * 1000,
                        };
                        this.triggerCaptureEvent(video);
                        return null;
                    });
                });
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

function createThumbnail(mediaFile) {
    return new Promise((resolve, reject) => {
        var successCB = (path) => {
            var url = 'file://' + encodeURI(path);
            resolve(url);
        };
        var errorCB = (err) => {
            reject(new Error(err));
        };
        var options = {
            fileUri: mediaFile.fullPath,
            outputFileName: mediaFile.name,
            quality: 70
        };
        VideoEditor.createThumbnail(successCB, errorCB, options);
    });
}
