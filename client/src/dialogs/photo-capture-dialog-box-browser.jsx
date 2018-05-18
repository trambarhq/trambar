var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var FrameGrabber = require('media/frame-grabber');
var DeviceManager = require('media/device-manager');
var MediaStreamUtils = require('media/media-stream-utils');
var BlobManager = require('transport/blob-manager');

var Payloads = require('transport/payloads');
var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var DeviceSelector = require('widgets/device-selector');
var DevicePlaceholder = require('widgets/device-placeholder');

require('./photo-capture-dialog-box-browser.scss');

module.exports = React.createClass({
    displayName: 'PhotoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),

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
            if (!MediaStreamUtils.hasSupport()) {
                return false;
            }
            if (typeof(HTMLCanvasElement.prototype.toBlob) !== 'function') {
                if (typeof(HTMLCanvasElement.prototype.toDataURL) !== 'function') {
                    return false;
                }
            }
            return true;
        },
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var devices = DeviceManager.getDevices('videoinput');
        var preferredDevice = DeviceSelector.choose(devices, this.props.cameraDirection);
        return {
            liveVideoStream: null,
            liveVideoError : null,
            liveVideoWidth: 640,
            liveVideoHeight: 480,
            capturedImage: null,
            videoDevices: devices,
            selectedDeviceId: (preferredDevice) ? preferredDevice.deviceId : null,
        };
    },

    /**
     * Initialize camera if component is mounted as shown (probably not)
     */
    componentWillMount: function() {
        if (this.props.show) {
            this.initializeCamera();
        }
        DeviceManager.addEventListener('change', this.handleDeviceChange);
    },

    /**
     * Initialize camera when component becomes visible
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.show !== nextProps.show) {
            if (nextProps.show) {
                this.setState({ capturedImage: null });
                this.initializeCamera();
            } else {
                setTimeout(() => {
                    this.shutdownCamera();
                    this.setState({ capturedImage: null });
                }, 500);
            }
        }
    },

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera: function() {
        this.createLiveVideoStream().then((stream) => {
            var dim = MediaStreamUtils.getVideoDimensions(stream);
            this.setState({
                liveVideoStream: stream,
                liveVideoError: null,
                liveVideoWidth: dim.width,
                liveVideoHeight: dim.height,
            });
        }).catch((err) => {
            console.error(err);
            this.setState({
                liveVideoStream: null,
                liveVideoError: err,
            });
        });
    },

    /**
     * Release live video stream
     */
    shutdownCamera: function() {
        this.destroyLiveVideoStream().then(() => {
            this.setState({
                liveVideoStream: null,
                liveVideoError: null,
            });
        });
    },

    /**
     * Recreate live video stream after a different camera is selected
     */
    reinitializeCamera: function() {
        this.destroyLiveVideoStream().then(() => {
            this.initializeCamera();
        });
    },

    /**
     * Set the video node and apply live video stream to it
     *
     * @param  {HTMLVideoElement} node
     */
    setLiveVideoNode: function(node) {
        this.videoNode = node;
        if (this.videoNode) {
            this.videoNode.srcObject = this.state.liveVideoStream;
            this.videoNode.play();

            // fix the video dimensions if they're wrong
            MediaStreamUtils.getActualVideoDimensions(node, (dim) => {
                if (this.state.liveVideoWidth !== dim.width || this.state.liveVideoHeight !== dim.height) {
                    this.setState({
                        liveVideoWidth: dim.width,
                        liveVideoHeight: dim.height,
                    });
                }
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="photo-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        {this.renderDeviceSelector()}
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render either live video or captured image
     *
     * @return {ReactElement}
     */
    renderView: function() {
        if (this.state.capturedImage) {
            return this.renderCapturedImage();
        } else if (this.state.liveVideoStream) {
            return this.renderLiveVideo();
        } else {
            return this.renderPlaceholder();
        }
    },

    /**
     * Render placeholder graphic when camera isn't available
     *
     * @return {ReactElement}
     */
    renderPlaceholder: function() {
        var props = {
            blocked: !!this.state.liveVideoError,
            icon: 'camera',
        };
        return <DevicePlaceholder {...props} />;
    },

    /**
     * Render view of live video stream
     *
     * @return {ReactElement}
     */
    renderLiveVideo: function() {
        var videoProps = {
            ref: this.setLiveVideoNode,
            className: 'live-video',
            muted: true,
        };
        return (
            <div>
                {this.renderSpacer()}
                <video {...videoProps} />
            </div>
        );
    },

    /**
     * Render a spacer element
     *
     * @return {ReactElement}
     */
    renderSpacer: function() {
        var spacerProps = {
            className: 'spacer',
            width: this.state.liveVideoWidth,
            height: this.state.liveVideoHeight,
        };
        return <canvas {...spacerProps} />;
    },

    /**
     * Render video captured previously
     *
     * @return {ReactElement}
     */
    renderCapturedImage: function() {
        var imageProps = {
            className: 'preview',
            src: this.state.capturedImage.url
        };
        return (
            <div>
                {this.renderSpacer()}
                <img {...imageProps} />
            </div>
        );
    },

    /**
     * Render a dropdown if there're multiple devices
     *
     * @return {ReactElement|null}
     */
    renderDeviceSelector: function() {
        if (this.state.capturedImage) {
            return null;
        }
        var props = {
            type: 'video',
            devices: this.state.videoDevices,
            selectedDeviceId: this.state.selectedDeviceId,
            locale: this.props.locale,
            onSelect: this.handleDeviceSelect,
        };
        return <DeviceSelector {...props} />;
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (!this.state.capturedImage) {
            var cancelButtonProps = {
                label: t('photo-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            var snapButtonProps = {
                label: t('photo-capture-snap'),
                onClick: this.handleSnapClick,
                disabled: !this.state.liveVideoStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...snapButtonProps} />
                </div>
            );
        } else {
            var retakeButtonProps = {
                label: t('photo-capture-retake'),
                onClick: this.handleRetakeClick,
            };
            var acceptButtonProps = {
                label: t('photo-capture-accept'),
                onClick: this.handleAcceptClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...retakeButtonProps} />
                    <PushButton {...acceptButtonProps} />
                </div>
            );
        }
    },

    /**
     * Change the video's source object when user changes camera
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (this.videoNode) {
            if (prevState.liveVideoStream !== this.state.liveVideoStream) {
                this.setLiveVideoNode(this.videoNode);
            }
        }
    },

    /**
     * Destroy live video stream when component unmounts
     */
    componentWillUnmount: function() {
        this.destroyLiveVideoStream();
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Create a live video stream
     *
     * @return {Promise<MediaStream>}
     */
    createLiveVideoStream: function() {
        if (!this.videoStreamPromise) {
            this.videoStreamPromise = MediaStreamUtils.getSilentVideoStream(this.state.selectedDeviceId);
        }
        return this.videoStreamPromise;
    },

    /**
     * Destroy live video stream created previously
     *
     * @return {Promise}
     */
    destroyLiveVideoStream: function() {
        if (!this.videoStreamPromise) {
            return Promise.resolve();
        }
        var promise = this.videoStreamPromise;
        this.videoStreamPromise = null;
        return promise.then((stream) => {
            MediaStreamUtils.stopAllTracks(stream);
        });
    },

    /**
     * Capture a frame from camera
     *
     * @return {Promise<Object>}
     */
    captureImage: function() {
        var video = this.videoNode;
        return FrameGrabber.capture(video).then((blob) => {
            var localURL = BlobManager.manage(blob);
            return {
                url: localURL,
                blob: blob,
                width: video.videoWidth,
                height: video.videoHeight,
            };
        });
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
     * Called when user clicks snap button
     *
     * @param  {Event} evt
     */
    handleSnapClick: function(evt) {
        this.captureImage().then((image) => {
            this.setState({ capturedImage: image });
        }).catch((err) => {
            console.error(err);
        });
    },

    /**
     * Called when user clicks retake button
     *
     * @param  {Event} evt
     */
    handleRetakeClick: function(evt) {
        BlobManager.release(this.state.capturedImage.blob);
        this.setState({ capturedImage: null });
    },

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick: function(evt) {
        var capturedImage = this.state.capturedImage;
        var payload = this.props.payloads.add('image');
        payload.attachFile(capturedImage.blob);
        var url = payload.token;
        var res = {
            type: 'image',
            payload_token: payload.token,
            width: capturedImage.width,
            height: capturedImage.height,
            format: 'jpeg'
        };
        this.triggerCloseEvent(true);
        this.triggerCaptureEvent(res);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.triggerCloseEvent(false);
    },

    /**
     * Called when user selects a different device
     *
     * @param  {Event} evt
     */
    handleDeviceSelect: function(evt) {
        var selectedDeviceId = evt.currentTarget.value;
        this.setState({ selectedDeviceId }, () => {
            this.reinitializeCamera();
        });
    },

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange: function(evt) {
        var videoDevices = DeviceManager.getDevices('videoinput');
        var selectedDeviceId = this.state.selectedDeviceId;
        var reinitialize = false;
        if (selectedDeviceId) {
            if (!_.some(videoDevices, { deviceId: selectedDeviceId })) {
                // reinitialize the camera when the one we were using disappears
                selectedDeviceId = null;
                reinitialize = true;
            }
        }
        this.setState({ videoDevices, selectedDeviceId }, () => {
            if (reinitialize) {
                this.reinitializeCamera();
            }
        });
    },
});
