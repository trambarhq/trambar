var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Payloads = require('transport/payloads');
var BlobStream = require('transport/blob-stream');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./audio-capture-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'AudioCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },

    getInitialState: function() {
        return {
            liveAudioStream: null,
            liveAudioContext: null,
            liveAudioProcessor: null,
            liveAudioSource: null,
            liveAudioLevel: 0,
            liveAudioUrl: null,
            liveAudioError : null,
            liveAudioRecorder: null,
            mediaRecorder: null,
            capturedAudio: null,
            previewUrl: null,
        };
    },

    componentWillMount: function() {
        if (this.props.show) {
            this.initializeMicrophone();
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.show !== nextProps.show) {
            if (nextProps.show) {
                this.clearCapturedAudio();
                this.initializeMicrophone();
            } else {
                setTimeout(() => {
                    this.shutdownMicrophone();
                    this.clearCapturedAudio();
                }, 500);
            }
        }
    },

    clearCapturedAudio: function() {
        if (this.state.capturedAudio) {
            URL.revokeObjectURL(this.state.previewUrl);
            this.setState({
                capturedAudio: null,
                previewUrl: null,
            });
        }
    },

    initializeMicrophone: function() {
        this.createLiveAudioStream().then((stream) => {
            this.setLiveAudioState(null, stream);
        }).catch((err) => {
            this.setLiveAudioState(err, null);
        });
    },

    shutdownMicrophone: function() {
        this.destroyLiveAudioStream().then(() => {
            this.setLiveAudioState(null, null);
        });
    },

    setLiveAudioState: function(err, stream) {
        if (this.state.liveAudioUrl) {
            URL.revokeObjectURL(this.state.liveAudioUrl);
        }
        if (this.state.liveAudioProcessor) {
            // disconnect
            this.state.liveAudioSource.disconnect(this.state.liveAudioProcessor);
            this.state.liveAudioProcessor.disconnect(this.state.liveAudioContext.destination);
        }

        var url, audioCtx, audioProcessor, audioSource;
        if (stream) {
            url = URL.createObjectURL(stream);

            // use Web Audio API to capture PCM data
            var audioCtx = new AudioContext();
            var audioProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            var audioSource = audioCtx.createMediaStreamSource(stream);
            audioProcessor.addEventListener('audioprocess', (evt) => {
                var samples = evt.inputBuffer.getChannelData(0);
                var max = 0;
                var count = samples.length;
                for (var i = 0; i < count; i++) {
                    var s = samples[i];
                    if (s > max) {
                        max = s;
                    }
                }
                var level = Math.round(max * 100);
                if (level !== this.state.liveAudioLevel) {
                    this.setState({ liveAudioLevel: level });
                }
            });
            audioSource.connect(audioProcessor);
            audioProcessor.connect(audioCtx.destination);
        }
        this.setState({
            liveAudioStream: stream,
            liveAudioContext: audioCtx,
            liveAudioProcessor: audioProcessor,
            liveAudioSource: audioSource,
            liveAudioUrl: url,
            liveAudioError: err,
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
                <div className="audio-capture-dialog-box">
                    {this.renderView()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    renderView: function() {
        if (this.state.capturedAudio) {
            return this.renderCapturedAudio();
        } else {
            return this.renderLiveAudio();
        }
    },

    renderLiveAudio: function() {
        if (!this.state.liveAudioUrl) {
            // TODO: return placeholder
            return null;
        }
        var audioProps = {
            ref: 'audio',
            src: this.state.liveAudioUrl,
            autoPlay: true,
            muted: true,
        };
        var level = this.state.liveAudioLevel;
        var volumeIcon;
        if (level < 10) {
            volumeIcon = 'volume-off';
        } else if (level < 50) {
            volumeIcon = 'volume-down';
        } else {
            volumeIcon = 'volume-up';
        }
        return (
            <div className="container">
                <div className="volume-meter">
                    <div className="icon">
                        <i className={'fa fa-' + volumeIcon} />
                    </div>
                    <div className="bar-container">
                        <div className="bar">
                            <div className="fill" style={{ width: level + '%' }} />
                        </div>
                    </div>
                </div>
                <audio {...audioProps} />
            </div>
        );
    },

    renderCapturedAudio: function() {
        var props = {
            src: this.state.previewUrl,
            controls: true
        };
        return (
            <div className="container">
                <audio {...props} />
            </div>
        )
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.state.mediaRecorder) {
            var pauseButtonProps = {
                label: t('audio-capture-pause'),
                onClick: this.handlePauseClick,
                disabled: this.state.mediaRecorder.state === 'paused'
            };
            var stopButtonProps = {
                label: t('audio-capture-stop'),
                onClick: this.handleStopClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...pauseButtonProps} />
                    <PushButton {...stopButtonProps} />
                </div>
            );
        } else if (!this.state.capturedAudio) {
            var cancelButtonProps = {
                label: t('audio-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            var startButtonProps = {
                label: t('audio-capture-start'),
                onClick: this.handleStartClick,
                disabled: !this.state.liveAudioStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...startButtonProps} />
                </div>
            );
        } else {
            var rerecordButtonProps = {
                label: t('audio-capture-rerecord'),
                onClick: this.handleRerecordClick,
            };
            var acceptButtonProps = {
                label: t('audio-capture-accept'),
                onClick: this.handleAcceptClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...rerecordButtonProps} />
                    <PushButton {...acceptButtonProps} />
                </div>
            );
        }
    },

    componentWillUnmount: function() {
        this.destroyLiveAudioStream();
    },

    createLiveAudioStream: function() {
        var promise = this.audioStreamPromise;
        if (!promise) {
            var constraints = { audio: true };
            promise = navigator.mediaDevices.getUserMedia(constraints);
            this.audioStreamPromise = promise;
        }
        return Promise.resolve(promise);
    },

    destroyLiveAudioStream: function() {
        var promise = this.audioStreamPromise;
        this.audioStreamPromise = null;
        return Promise.resolve(promise).then((stream) => {
            if (stream) {
                var tracks = stream.getTracks();
                _.each(tracks, (track) => {
                    track.stop();
                });
            }
        });
    },

    beginRecording: function() {
        return Promise.try(() => {
            var segmentDuration = 3 * 1000;
            var options = {
                audioBitsPerSecond : 128000,
                mimeType : 'audio/webm'
            };
            var recorder = new MediaRecorder(this.state.liveAudioStream, options);
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
            if (recorder) {
                recorder.stop();
                return {
                    type: recorder.mimeType,
                    audio_bitrate: recorder.audioBitsPerSecond,
                    stream: recorder.outputStream,
                };
            }
        });
    },

    triggerCaptureEvent: function(audio) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                audio,
            })
        }
    },

    handleStartClick: function(evt) {
        return this.beginRecording().then((recorder) => {
            // start uploading immediately upon receiving data from MediaRecorder
            this.props.payloads.stream(recorder.outputStream);
            this.setState({
                mediaRecorder: recorder
            });
            return null;
        });
    },

    handlePauseClick: function(evt) {
        return this.pauseRecording();
    },

    handleStopClick: function(evt) {
        return this.endRecording().then((audio) => {
            var blob = audio.stream.toBlob();
            var url = URL.createObjectURL(blob);
            this.setState({
                capturedAudio: audio,
                previewUrl: url,
                capturedImage: null,
                mediaRecorder: null
            });
        });
    },

    handleRerecordClick: function(evt) {
        this.clearCapturedAudio();
    },

    handleAcceptClick: function(evt) {
        this.triggerCaptureEvent(this.state.capturedAudio);
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
