var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

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

    getInitialState: function() {
        return {
            liveVideoStream: null,
            liveVideoUrl: null,
            liveVideoError : null,
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
                <div className="photo-capture-dialog-box">
                    {this.renderView()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    renderView: function() {
        if (this.state.capturedImage) {
            return this.renderCapturedImage();
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

    renderCapturedImage: function() {
        var image = this.state.capturedImage;
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

    triggerCaptureEvent: function(image) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                image,
            })
        }
    },

    handleSnapClick: function(evt) {
        this.captureImage().then((image) => {
            this.setState({ capturedImage: image });
        });
    },

    handleRetakeClick: function(evt) {
        this.setState({ capturedImage: null });
    },

    handleAcceptClick: function(evt) {
        this.triggerCaptureEvent(this.state.capturedImage);
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
