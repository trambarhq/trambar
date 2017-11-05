var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var DeviceManager = require('media/device-manager');

var Locale = require('locale/locale');
var Payloads = require('transport/payloads');
var BlobStream = require('transport/blob-stream');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./video-capture-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'VideoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            mediaRecorder: null,
            capturedVideo: null,
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
            URL.revokeObjectURL(this.state.previewUrl);
            this.setState({
                capturedVideo: null,
                previewUrl: null,
            });
        }
    },

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera: function() {
        return this.createLiveVideoStream().then((stream) => {
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
        var url;
        if (stream) {
            url = URL.createObjectURL(stream);
        }
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
                <div className="video-capture-dialog-box">
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
     * Render either live or captured video
     *
     * @return {ReactElement}
     */
    renderView: function() {
        if (this.state.capturedVideo) {
            return this.renderCapturedVideo();
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
    renderCapturedVideo: function() {
        var props = {
            src: this.state.previewUrl,
            controls: true
        };
        return (
            <div className="container">
                <video {...props} />
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
                key: index,
                value: device.deviceId,
            };
            return <option {...props}>{label}</option>;
        });
        var selectProps = {
            value: this.state.selectedDeviceId || '',
            onChange: this.handleDeviceSelect,
        }
        return (
            <div className="device-selector">
                <select {...selectProps}>
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
        if (this.state.mediaRecorder) {
            var pauseButtonProps = {
                label: t('video-capture-pause'),
                onClick: this.handlePauseClick,
                disabled: this.state.mediaRecorder.state === 'paused'
            };
            var stopButtonProps = {
                label: t('video-capture-stop'),
                onClick: this.handleStopClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...pauseButtonProps} />
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
            var type = 'image/jpeg';
            var canvas = document.createElement('CANVAS');
            var context = canvas.getContext('2d');
            var video = this.refs.video;
            var width = video.videoWidth;
            var height = video.videoHeight;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob((file) => {
                resolve({ type, file, width, height });
            }, type, 90);
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
            recorder.outputStream = new BlobStream;
            recorder.addEventListener('dataavailable', function(evt) {
                this.outputStream.push(evt.data)
            });
            recorder.addEventListener('stop', function(evt) {
                this.outputStream.close();
            });
            recorder.start(segmentDuration);
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
     * Stop capturing video, returning what was captured
     *
     * @return {Promise}
     */
    endRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            var poster = this.state.capturedImage;
            if (recorder) {
                recorder.stop();
                return {
                    width: poster.width,
                    height: poster.height,
                    poster_file: poster.file,
                    format: _.last(_.split(recorder.mimeType, '/')),
                    audio_bitrate: recorder.audioBitsPerSecond,
                    video_bitrate: recorder.videoBitsPerSecond,
                    stream: recorder.outputStream,
                };
            }
        });
    },

    /**
     * Report back to parent component that a video has been captured
     *
     * @param  {Object} video
     */
    triggerCaptureEvent: function(video) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                video,
            })
        }
    },

    /**
     * Called when user clicks start button
     *
     * @param  {Event} evt
     */
    handleStartClick: function(evt) {
        return Promise.join(this.captureImage(), this.beginRecording(), (image, recorder) => {
            // start uploading immediately upon receiving data from MediaRecorder
            this.props.payloads.stream(recorder.outputStream);
            this.setState({
                capturedImage: image,
                mediaRecorder: recorder
            });
            return null;
        });
    },

    /**
     * Called when user clicks pause button
     *
     * @param  {Event} evt
     */
    handlePauseClick: function(evt) {
        return this.pauseRecording();
    },

    /**
     * Called when user clicks stop button
     *
     * @param  {Event} evt
     */
    handleStopClick: function(evt) {
        return this.endRecording().then((video) => {
            var blob = video.stream.toBlob();
            var url = URL.createObjectURL(blob);
            this.setState({
                capturedVideo: video,
                previewUrl: url,
                capturedImage: null,
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
        this.triggerCaptureEvent(this.state.capturedVideo);
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
