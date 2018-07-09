var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var CordovaFile = require('transport/cordova-file');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'VideoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            return !!window.cordova && !!navigator.device;
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
                requestPermissions().then(() => {
                    var options = {
                        duration: 5 * 60 * 60,
                        limit: 1,
                    };
                    capture.captureVideo(this.handleCaptureSuccess, this.handleCaptureFailure, options);
                });
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
     * Report back to parent component that a video is ready
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
     * Report back to parent component that a video is being loaded
     *
     */
    triggerCapturePendingEvent: function() {
        if (this.props.onCapturePending) {
            this.props.onCapturePending({
                type: 'capturepending',
                target: this,
                resourceType: 'video'
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
     * @param  {Array<MediaFiles>} mediaFiles
     */
    handleCaptureSuccess: function(mediaFiles) {
        this.triggerCloseEvent();
        var mediaFile = mediaFiles[0];
        if (mediaFile) {
            this.triggerCapturePendingEvent();
            MediaLoader.getFormatData(mediaFile).then((mediaFileData) => {
                var fullPath;
                if (cordova.platformId === 'windows') {
                    fullPath = mediaFile.localURL;
                } else {
                    fullPath = mediaFile.fullPath;
                }
                var file = new CordovaFile(fullPath, mediaFile.type, mediaFile.size);
                var payload = this.props.payloads.add('video');
                payload.attachFile(file);
                return createThumbnail(file).then((thumbnailURL) => {
                    var posterFile = new CordovaFile(thumbnailURL);
                    return MediaLoader.getImageMetadata(posterFile).then((poster) => {
                        // use the poster's width and height, as they're
                        // corrected for camera orientation
                        payload.attachFile(posterFile, 'poster');
                        return {
                            type: 'video',
                            payload_token: payload.token,
                            format: MediaLoader.extractFileFormat(mediaFile.type),
                            width: poster.width,
                            height: poster.height,
                            filename: mediaFile.name,
                            duration: mediaFileData.duration * 1000,
                        };
                    });
                }).catch((err) => {
                    // can't generate thumbnail--let the server do it
                    payload.attachStep('main', 'poster')
                    return {
                        type: 'video',
                        payload_token: payload.token,
                        format: MediaLoader.extractFileFormat(mediaFile.type),
                        filename: mediaFile.name,
                        duration: mediaFileData.duration * 1000,
                    };
                }).then((res) => {
                    this.triggerCaptureEvent(res);
                    return null;
                });
            }).catch((err) => {
                this.triggerCaptureErrorEvent(err);
                return null;
            });
        }
    },

    /**
     * Called when the operation failed for some reason
     */
    handleCaptureFailure: function(err) {
        this.triggerCloseEvent();
        this.triggerCaptureErrorEvent(err);
    },
});

function createThumbnail(file) {
    return new Promise((resolve, reject) => {
        var successCB = (path) => {
            if (cordova.platformId === 'windows') {
                // need to use ms-appdata: URL instead of win32 path
                var backSlashIndex = _.lastIndexOf(path, '\\');
                if (backSlashIndex !== -1) {
                    var filename = path.substr(backSlashIndex + 1);
                    path = cordova.file.dataDirectory + filename;
                }
            }
            resolve(path);
        };
        var errorCB = (err) => {
            reject(new Error(err));
        };
        var options = {
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
            permissions.RECORD_VIDEO,
            permissions.READ_EXTERNAL_STORAGE,
            permissions.WRITE_EXTERNAL_STORAGE,
        ], successCB, errorCB);
    });
}
