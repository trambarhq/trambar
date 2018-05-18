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
var DurationIndicator = require('widgets/duration-indicator');

require('./video-capture-dialog-box-browser.scss');

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
            if (!MediaStreamUtils.hasSupport()) {
                return false;
            }
            if (typeof(MediaRecorder) !== 'function') {
                return false;
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
            mediaRecorder: null,
            capturedVideo: null,
            capturedImage: null,
            previewURL: null,
            videoDevices: devices,
            selectedDeviceId: (preferredDevice) ? preferredDevice.deviceId : null,
            startTime: null,
            duration: 0,
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
                this.clearCapturedVideo();
                this.initializeCamera();
            } else {
                setTimeout(() => {
                    this.shutdownCamera();
                    this.clearCapturedVideo();
                }, 500);
            }
        }
    },

    /**
     * Removed video that was captured earlier
     */
    clearCapturedVideo: function() {
        if (this.state.capturedVideo) {
            URL.revokeObjectURL(this.state.previewURL);
            this.setState({
                capturedVideo: null,
                capturedImage: null,
                previewURL: null,
            });
        }
    },

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera: function() {
        return this.createLiveVideoStream().then((stream) => {
            var dim = MediaStreamUtils.getVideoDimensions(stream);
            this.setState({
                liveVideoStream: stream,
                liveVideoError: null,
                liveVideoWidth: dim.width,
                liveVideoHeight: dim.height,
            });
        }).catch((err) => {
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
                <div className="video-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        {this.renderDeviceSelector()}
                        {this.renderButtons()}
                        {this.renderDuration()}
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render either live or captured video
     *
     * @return {ReactElement}
     */
    renderView: function() {
        if (this.state.capturedVideo) {
            return this.renderCapturedVideo();
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
            icon: 'video-camera',
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
            key: 'live',
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
    renderCapturedVideo: function() {
        var videoProps = {
            key: 'preview',
            className: 'preview',
            src: this.state.previewURL,
            controls: true
        };
        return (
            <div>
                {this.renderSpacer()}
                <video {...videoProps} />
            </div>
        );
    },

    /**
     * Render a dropdown if there're multiple devices
     *
     * @return {ReactElement|null}
     */
    renderDeviceSelector: function() {
        if (this.state.mediaRecorder) {
            return null;
        }
        if (this.state.capturedVideo) {
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
     * Show duration when we're recording
     *
     * @return {ReactElement|null}
     */
    renderDuration: function() {
        if (!this.state.mediaRecorder) {
            return null;
        }
        var durationProps = {
            duration: this.state.duration,
            startTime: this.state.startTime,
        };
        return <DurationIndicator {...durationProps} />
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.state.mediaRecorder) {
            var paused = this.state.mediaRecorder.state === 'paused';
            var pauseButtonProps = {
                label: t('video-capture-pause'),
                onClick: this.handlePauseClick,
                hidden: paused,
            };
            var resumeButtonProps = {
                label: t('video-capture-resume'),
                onClick: this.handleResumeClick,
                hidden: !paused,
                emphasized: true
            };
            var stopButtonProps = {
                label: t('video-capture-stop'),
                onClick: this.handleStopClick,
                emphasized: !paused,
            };
            return (
                <div className="buttons">
                    <PushButton {...pauseButtonProps} />
                    <PushButton {...resumeButtonProps} />
                    <PushButton {...stopButtonProps} />
                </div>
            );
        } else if (!this.state.capturedVideo) {
            var cancelButtonProps = {
                label: t('video-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            var startButtonProps = {
                label: t('video-capture-start'),
                onClick: this.handleStartClick,
                disabled: !this.state.liveVideoStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...startButtonProps} />
                </div>
            );
        } else {
            var retakeButtonProps = {
                label: t('video-capture-retake'),
                onClick: this.handleRetakeClick,
            };
            var acceptButtonProps = {
                label: t('video-capture-accept'),
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
        this.clearCapturedVideo();
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    },

    /**
     * Create a live video stream
     *
     * @return {Promise<MediaStream>}
     */
    createLiveVideoStream: function() {
        if (!this.videoStreamPromise) {
            this.videoStreamPromise = MediaStreamUtils.getVideoStream(this.state.selectedDeviceId);
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
            return {
                blob: blob,
                width: video.videoWidth,
                height: video.videoHeight,
            };
        });
    },

    /**
     * Start capturing video
     *
     * @return {Promise}
     */
    beginRecording: function() {
        return Promise.try(() => {
            var segmentDuration = 3 * 1000;
            var options = {
                audioBitsPerSecond : 128000,
                videoBitsPerSecond : 2500000,
                mimeType : 'video/webm'
            };
            var recorder = new MediaRecorder(this.state.liveVideoStream, options);
            var stream = this.props.payloads.stream();
            recorder.outputStream = stream;
            recorder.promise = new Promise((resolve, reject) => {
                recorder.resolve = resolve;
                recorder.reject = reject;
            });
            recorder.addEventListener('dataavailable', function(evt) {
                this.outputStream.push(evt.data)
            });
            recorder.addEventListener('stop', function(evt) {
                this.outputStream.close();
                recorder.resolve();
            });
            recorder.start(segmentDuration);
            // start uploading immediately upon receiving data from MediaRecorder
            stream.start();
            return recorder;
        });
    },

    /**
     * Pause capturing
     *
     * @return {Promise}
     */
    pauseRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.pause();
            }
        });
    },

    /**
     * Resume capturing
     *
     * @return {Promise}
     */
    resumeRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.resume();
            }
        });
    },

    /**
     * Stop capturing video, returning what was captured
     *
     * @return {Promise}
     */
    endRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.stop();

                // wait till all data is encoded
                return recorder.promise;
            }
        });
    },

    /**
     * Report back to parent component that a video has been captured
     *
     * @param  {Object} resource
     */
    triggerCaptureEvent: function(resource) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                resource,
            })
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
     * Called when user clicks start button
     *
     * @param  {Event} evt
     */
    handleStartClick: function(evt) {
        return Promise.join(this.captureImage(), this.beginRecording(), (image, recorder) => {
            this.setState({
                capturedImage: image,
                mediaRecorder: recorder,
                startTime: new Date,
                duration: 0,
            });
            return null;
        }).catch((err) => {
            console.error(err);
        });
    },

    /**
     * Called when user clicks pause button
     *
     * @param  {Event} evt
     */
    handlePauseClick: function(evt) {
        return this.pauseRecording().then(() => {
            var now = new Date;
            var elapsed = now - this.state.startTime;
            var duration = this.state.duration + elapsed;
            this.setState({ duration, startTime: null });
        });
    },

    /**
     * Called when user clicks resume button
     *
     * @param  {Event} evt
     */
    handleResumeClick: function(evt) {
        return this.resumeRecording().then(() => {
            var now = new Date;
            this.setState({ startTime: now });
        });
    },

    /**
     * Called when user clicks stop button
     *
     * @param  {Event} evt
     */
    handleStopClick: function(evt) {
        return this.endRecording().then(() => {
            var recorder = this.state.mediaRecorder;
            var blob = recorder.outputStream.toBlob();
            var url = URL.createObjectURL(blob);
            var elapsed = 0;
            if (this.state.startTime) {
                var now = new Date;
                elapsed = now - this.state.startTime;
            }
            var video = {
                format: _.last(_.split(recorder.mimeType, '/')),
                audioBitsPerSecond: recorder.audioBitsPerSecond,
                videoBitsPerSecond: recorder.videoBitsPerSecond,
                stream: recorder.outputStream,
                duration: this.state.duration + elapsed,
            };
            this.setState({
                capturedVideo: video,
                previewURL: url,
                mediaRecorder: null
            });
        });
    },

    /**
     * Called when user clicks retake button
     *
     * @param  {Event} evt
     */
    handleRetakeClick: function(evt) {
        this.clearCapturedVideo();
    },

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick: function(evt) {
        var capturedVideo = this.state.capturedVideo;
        var capturedImage = this.state.capturedImage;
        var payload = this.props.payloads.add('video');
        payload.attachStream(capturedVideo.stream);
        payload.attachFile(capturedImage.blob, 'poster');
        var res = {
            type: 'video',
            payload_token: payload.token,
            width: capturedImage.width,
            height: capturedImage.height,
            duration: capturedVideo.duration,
            format: capturedVideo.format,
            bitrates: {
                audio: capturedVideo.audioBitsPerSecond,
                video: capturedVideo.videoBitsPerSecond,
            }
        }
        this.triggerCloseEvent();
        this.triggerCaptureEvent(res);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.triggerCloseEvent();
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
