var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var DeviceManager = require('media/device-manager');

var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./photo-capture-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'PhotoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            liveVideoStream: null,
            liveVideoUrl: null,
            liveVideoError : null,
            capturedImage: null,
            previewUrl: null,
            videoDevices: DeviceManager.getDevices('videoinput'),
            selectedDeviceId: null,
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
                this.clearCapturedImage();
                this.initializeCamera();
            } else {
                setTimeout(() => {
                    this.shutdownCamera();
                    this.clearCapturedImage();
                }, 500);
            }
        }
    },

    /**
     * Removed image that was captured earlier
     */
    clearCapturedImage: function() {
        if (this.state.capturedImage) {
            URL.revokeObjectURL(this.state.previewUrl);
            this.setState({
                capturedImage: null,
                previewUrl: null,
            });
        }
    },

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera: function() {
        this.createLiveVideoStream().then((stream) => {
            this.setLiveVideoState(null, stream);
        }).catch((err) => {
            this.setLiveVideoState(err, null);
        });
    },

    /**
     * Release live video stream
     */
    shutdownCamera: function() {
        this.destroyLiveVideoStream().then(() => {
            this.setLiveVideoState(null, null);
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
     * Update state of component depending on whether we have a video stream
     *
     * @param  {Error} err
     * @param  {MediaStream} stream
     */
    setLiveVideoState: function(err, stream) {
        if (this.state.liveVideoUrl) {
            URL.revokeObjectURL(this.state.liveVideoUrl);
        }
        var url = (stream) ? URL.createObjectURL(stream) : null;
        this.setState({
            liveVideoStream: stream,
            liveVideoUrl: url,
            liveVideoError: err,
        });
        if (err) {
            console.error(err);
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
                    {this.renderView()}
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
        } else {
            return this.renderLiveVideo();
        }
    },

    /**
     * Render view of live video stream
     *
     * @return {ReactElement}
     */
    renderLiveVideo: function() {
        if (!this.state.liveVideoUrl) {
            // TODO: return placeholder
            return null;
        }
        var videoProps = {
            ref: 'video',
            src: this.state.liveVideoUrl,
            autoPlay: true,
            muted: true,
        };
        return (
            <div className="container">
                <video {...videoProps} />
            </div>
        );
    },

    /**
     * Render video captured previously
     *
     * @return {ReactElement}
     */
    renderCapturedImage: function() {
        var props = {
            src: this.state.previewUrl,
        };
        return (
            <div className="container">
                <img {...props} />
            </div>
        )
    },

    /**
     * Render a dropdown if there're multiple devices
     *
     * @return {ReactElement|null}
     */
    renderDeviceSelector: function() {
        if (this.state.videoDevices.length < 2) {
            return null;
        }
        var options = _.map(this.state.videoDevices, (device, index) => {
            var label = device.label;
            label = _.replace(device.label, /\(\w{4}:\w{4}\)/g, '');
            var props = {
                value: device.deviceId,
                selected: device.deviceId === this.state.selectedDeviceId,
            };
            return <option key={index} {...props}>{label}</option>;
        });
        return (
            <div className="device-selector">
                <select onChange={this.handleDeviceSelect}>
                    {options}
                </select>
            </div>
        );
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
     * Destroy live video stream when component unmounts
     */
    componentWillUnmount: function() {
        this.destroyLiveVideoStream();
        this.clearCapturedImage();
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Create a live video stream
     *
     * @return {Promise<MediaStream>}
     */
    createLiveVideoStream: function() {
        var promise = this.videoStreamPromise;
        if (!promise) {
            var constraints;
            if (this.state.selectedDeviceId) {
                constraints = {
                    video: {
                        mandatory: {
                            sourceId: this.state.selectedDeviceId
                        }
                    }
                };
            } else {
                constraints = {
                    video: true,
                };
            }
            promise = navigator.mediaDevices.getUserMedia(constraints);
            this.videoStreamPromise = promise;
        }
        return Promise.resolve(promise);
    },

    /**
     * Destroy live video stream created previously
     *
     * @return {Promise}
     */
    destroyLiveVideoStream: function() {
        var promise = this.videoStreamPromise;
        this.videoStreamPromise = null;
        return Promise.resolve(promise).then((stream) => {
            if (stream) {
                var tracks = stream.getTracks();
                _.each(tracks, (track) => {
                    track.stop();
                });
            }
        });
    },

    /**
     * Capture a frame from camera
     *
     * @return {Promise<Object>}
     */
    captureImage: function() {
        return new Promise((resolve, reject) => {
            var format = 'jpeg';
            var canvas = document.createElement('CANVAS');
            var context = canvas.getContext('2d');
            var video = this.refs.video;
            var width = video.videoWidth;
            var height = video.videoHeight;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob((file) => {
                resolve({ format, file, width, height });
            }, 'image/jpeg', 90);
        });
    },

    /**
     * Report back to parent component that an image has been captured and
     * accepted by user
     *
     * @param  {Object} video
     */
    triggerCaptureEvent: function(image) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                image,
            })
        }
    },

    /**
     * Called when user clicks snap button
     *
     * @param  {Event} evt
     */
    handleSnapClick: function(evt) {
        this.captureImage().then((image) => {
            var url = URL.createObjectURL(image.file);
            this.setState({
                capturedImage: image,
                previewUrl: url,
            });
        });
    },

    /**
     * Called when user clicks retake button
     *
     * @param  {Event} evt
     */
    handleRetakeClick: function(evt) {
        this.clearCapturedImage();
    },

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick: function(evt) {
        this.triggerCaptureEvent(this.state.capturedImage);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
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
