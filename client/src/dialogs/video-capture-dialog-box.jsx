var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var UploadQueue = require('transport/upload-queue');
var BlobStream = require('transport/blob-stream');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./video-capture-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'VideoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        queue: PropTypes.instanceOf(UploadQueue).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },

    getInitialState: function() {
        return {
            liveVideoStream: null,
            liveVideoUrl: null,
            liveVideoError : null,
            capturingStarted: false,
            capturedVideo: null,
            capturedImage: null,
        };
    },

    componentWillMount: function() {
        if (this.props.show) {
            this.initializeCamera();
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.show !== nextProps.show) {
            if (nextProps.show) {
                this.setState({ capturedVideo: null });
                this.initializeCamera();
            } else {
                setTimeout(() => {
                    this.shutdownCamera();
                    this.setState({ capturedVideo: null });
                }, 500);
            }
        }
    },

    initializeCamera: function() {
        this.createLiveVideoStream().then((stream) => {
            this.setLiveVideoState(null, stream);
        }).catch(function(err) {
            this.setLiveVideoState(err, null);
        });
    },

    shutdownCamera: function() {
        this.destroyLiveVideoStream().then(() => {
            this.setLiveVideoState(null, null);
        });
    },

    setLiveVideoState: function(err, stream) {
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

    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="video-capture-dialog-box">
                    {this.renderView()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    renderView: function() {
        if (this.state.capturedVideo) {
            return this.renderCapturedVideo();
        } else {
            return this.renderLiveVideo();
        }
    },

    renderLiveVideo: function() {
        if (!this.state.liveVideoUrl) {
            // TODO: return placeholder
            return null;
        }
        var videoProps = {
            ref: 'video',
            src: this.state.liveVideoUrl,
            autoPlay: true,
        };
        return (
            <div className="container">
                <video {...videoProps} />
            </div>
        );
    },

    renderCapturedVideo: function() {
        var image = this.state.capturedVideo;
        var url = URL.createObjectURL(image.file);
        var props = {
            src: url,
        };
        return (
            <div className="container">
                <img {...props} />
            </div>
        )
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        if (!this.state.capturedVideo) {
            var cancelButtonProps = {
                label: t('video-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            var startButtonProps = {
                label: t('video-capture-start'),
                onClick: this.handleStartClick,
                disabled: !this.state.liveVideoStream,
                hidden: this.state.capturingStarted,
                emphasized: true,
            };
            var stopButtonProps = {
                label: t('video-capture-stop'),
                onClick: this.handleStopClick,
                disabled: !this.state.liveVideoStream,
                hidden: !this.state.capturingStarted,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...startButtonProps} />
                    <PushButton {...stopButtonProps} />
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

    componentWillUnmount: function() {
        this.destroyLiveVideoStream();
    },

    createLiveVideoStream: function() {
        var promise = this.videoStreamPromise;
        if (!promise) {
            var constraints = { video: true };
            promise = navigator.mediaDevices.getUserMedia(constraints);
            this.videoStreamPromise = promise;
        }
        return Promise.resolve(promise);
    },

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

    beginRecording: function() {
        var segmentDuration = 15 * 1000;
        var options = {
            audioBitsPerSecond : 128000,
            videoBitsPerSecond : 2500000,
            mimeType : 'video/webm'
        };
        this.recorder = new MediaRecorder(this.state.liveVideoStream, options);
        this.recorder.addEventListener('dataavailable', this.handleVideoData);
        this.recorder.start(segmentDuration);
        this.blobStream = new BlobStream;
        this.props.queue.sendStream(this.blobStream);
    },

    endRecording: function() {
        this.blobStream.close();
        this.recorder.stop();
    },

    triggerCaptureEvent: function(image) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                image,
            })
        }
    },

    handleStartClick: function(evt) {
        this.captureImage().then((image) => {
            this.setState({ capturedImage: image, capturingStarted: true });
            this.beginRecording();
        });
    },

    handleVideoData: function(evt) {
        var data = evt.data;
        this.blobStream.push(data);
    },

    handleStopClick: function(evt) {
        this.setState({ capturingStarted: false });
        this.endRecording();
    },

    handleRetakeClick: function(evt) {
        this.setState({ capturedVideo: null });
    },

    handleAcceptClick: function(evt) {
        this.triggerCaptureEvent(this.state.capturedVideo);
    },

    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },
});
