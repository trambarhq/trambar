var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

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

    getInitialState: function() {
        return {
            liveVideoStream: null,
            liveVideoUrl: null,
            liveVideoError : null,
            mediaRecorder: null,
            capturedVideo: null,
            capturedImage: null,
            previewUrl: null,
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

    clearCapturedVideo: function() {
        if (this.state.capturedVideo) {
            URL.revokeObjectURL(this.state.previewUrl);
            this.setState({
                capturedVideo: null,
                previewUrl: null,
            });
        }
    },

    initializeCamera: function() {
        this.createLiveVideoStream().then((stream) => {
            this.setLiveVideoState(null, stream);
        }).catch((err) => {
            this.setLiveVideoState(err, null);
        });
    },

    shutdownCamera: function() {
        this.destroyLiveVideoStream().then(() => {
            this.setLiveVideoState(null, null);
        });
    },

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
            muted: true,
        };
        return (
            <div className="container">
                <video {...videoProps} />
            </div>
        );
    },

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

    componentWillUnmount: function() {
        this.destroyLiveVideoStream();
    },

    createLiveVideoStream: function() {
        var promise = this.videoStreamPromise;
        if (!promise) {
            var constraints = { video: true, audio: true };
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

    pauseRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.pause();
            }
        });
    },

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
                    type: recorder.mimeType,
                    audio_bitrate: recorder.audioBitsPerSecond,
                    video_bitrate: recorder.videoBitsPerSecond,
                    stream: recorder.outputStream,
                };
            }
        });
    },

    triggerCaptureEvent: function(video) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                video,
            })
        }
    },

    handleStartClick: function(evt) {
        return Promise.join(this.captureImage(), this.beginRecording(), (image, recorder) => {
            // start uploading immediately upon receiving data from MediaRecorder
            this.props.payloads.stream(recorder.outputStream);
            this.setState({
                capturedImage: image,
                mediaRecorder: recorder
            });
        });
    },

    handlePauseClick: function(evt) {
        return this.pauseRecording();
    },

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

    handleRetakeClick: function(evt) {
        this.clearCapturedVideo();
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
