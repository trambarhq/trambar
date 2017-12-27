var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Payloads = require('transport/payloads');
var BlobStream = require('transport/blob-stream');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var DevicePlaceholder = require('widgets/device-placeholder');
var DurationIndicator = require('widgets/duration-indicator');

require('./audio-capture-dialog-box-browser.scss');

module.exports = React.createClass({
    displayName: 'AudioCaptureDialogBox',
    mixins: [ UpdateCheck ],
    propTypes: {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }
            if (typeof(MediaRecorder) !== 'function') {
                return false;
            }
            if (typeof(AudioContext) !== 'function') {
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
        return {
            liveAudioStream: null,
            liveAudioContext: null,
            liveAudioProcessor: null,
            liveAudioSource: null,
            liveAudioLevel: 0,
            liveAudioError : null,
            liveAudioRecorder: null,
            mediaRecorder: null,
            capturedAudio: null,
            previewURL: null,
            startTime: null,
            duration: 0,
        };
    },

    /**
     * Initialize microphone on mount
     */
    componentWillMount: function() {
        if (this.props.show) {
            this.initializeMicrophone();
        }
    },

    /**
     * Initialize microphone when dialog box is shown and shut it down when
     * dialog closes
     *
     * @param  {Object} nextProps
     */
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

    /**
     * Clear captured audio
     */
    clearCapturedAudio: function() {
        if (this.state.capturedAudio) {
            URL.revokeObjectURL(this.state.previewURL);
            this.setState({
                capturedAudio: null,
                previewURL: null,
            });
        }
    },

    /**
     * Create audio stream
     */
    initializeMicrophone: function() {
        this.createLiveAudioStream().then((stream) => {
            this.setLiveAudioState(null, stream);
        }).catch((err) => {
            this.setLiveAudioState(err, null);
        });
    },

    /**
     * Destroy audio stream
     */
    shutdownMicrophone: function() {
        this.destroyLiveAudioStream().then(() => {
            this.setLiveAudioState(null, null);
        });
    },

    /**
     * Set audio state
     *
     * @param  {Error} err
     * @param  {MediaStream} stream
     */
    setLiveAudioState: function(err, stream) {
        if (this.state.liveAudioProcessor) {
            // disconnect
            this.state.liveAudioSource.disconnect(this.state.liveAudioProcessor);
            this.state.liveAudioProcessor.disconnect(this.state.liveAudioContext.destination);
        }

        var url, audioCtx, audioProcessor, audioSource;
        if (stream) {
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
            liveAudioError: err,
        });
        if (err) {
            console.error(err);
        }
    },

    /**
     * Set the video node and apply live video stream to it
     *
     * @param  {HTMLAudioElement} node
     */
    setLiveAudioNode: function(node) {
        this.audioNode = node;
        if (this.audioNode) {
            this.audioNode.srcObject = this.state.liveAudioStream;
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
                <div className="audio-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        {this.renderDuration()}
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render either playback control for captured audio or volume bar
     *
     * @return {ReactElement}
     */
    renderView: function() {
        if (this.state.capturedAudio) {
            return this.renderCapturedAudio();
        } else if (this.state.liveAudioStream) {
            return this.renderLiveAudio();
        } else {
            return this.renderPlaceholder();
        }
    },

    /**
     * Render placeholder graphic when microphone isn't available
     *
     * @return {ReactElement}
     */
    renderPlaceholder: function() {
        var props = {
            blocked: !!this.state.liveAudioError,
            icon: 'microphone',
        };
        return <DevicePlaceholder {...props} />;
    },

    /**
     * Render volume level coming from mic
     *
     * @return {ReactElement|null}
     */
    renderLiveAudio: function() {
        var audioProps = {
            ref: this.setLiveAudioNode,
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
            <div>
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

    /**
     * Render audio playback control
     *
     * @return {ReactElement}
     */
    renderCapturedAudio: function() {
        var props = {
            src: this.state.previewURL,
            controls: true
        };
        return <audio {...props} />;
    },

    /**
     * Render duration when we're recording
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
        return <DurationIndicator {...durationProps} />;
    },

    /**
     * Render buttons
     *
     * @return {[type]}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.state.mediaRecorder) {
            var paused = this.state.mediaRecorder.state === 'paused';
            var pauseButtonProps = {
                label: t('audio-capture-pause'),
                onClick: this.handlePauseClick,
                hidden: paused,
            };
            var resumeButtonProps = {
                label: t('audio-capture-resume'),
                onClick: this.handleResumeClick,
                hidden: !paused,
                emphasized: true,
            };
            var stopButtonProps = {
                label: t('audio-capture-stop'),
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

    /**
     * Destroy audio stream on unmount
     */
    componentWillUnmount: function() {
        this.destroyLiveAudioStream();
    },

    /**
     * Create audio stream
     *
     * @return {Promise}
     */
    createLiveAudioStream: function() {
        var promise = this.audioStreamPromise;
        if (!promise) {
            var constraints = { audio: true };
            promise = navigator.mediaDevices.getUserMedia(constraints);
            this.audioStreamPromise = promise;
        }
        // return Bluebird promise instead of native promise
        return Promise.resolve(promise);
    },

    /**
     * Destroy audio stream
     *
     * @return {Promise}
     */
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

    /**
     * Start recording audio
     *
     * @return {Promise<MediaRecorder>}
     */
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

    /**
     * Pause recording
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
     * Resume recording
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
     * End recording
     *
     * @return {Promise}
     */
    endRecording: function() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.stop();
                return {
                    format: _.last(_.split(recorder.mimeType, '/')),
                    audio_bitrate: recorder.audioBitsPerSecond,
                    stream: recorder.outputStream,
                };
            }
        });
    },

    /**
     * Inform parent component that an audio has been captured and accepted
     */
    triggerCaptureEvent: function(audio) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                audio,
            })
        }
    },

    /**
     * Called when user clicks start button
     *
     * @param  {Event} evt
     */
    handleStartClick: function(evt) {
        return this.beginRecording().then((recorder) => {
            // start uploading immediately upon receiving data from MediaRecorder
            this.props.payloads.stream(recorder.outputStream);
            this.setState({
                mediaRecorder: recorder,
                startTime: new Date,
                duration: 0,
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
        return this.endRecording().then((audio) => {
            var blob = audio.stream.toBlob();
            var url = URL.createObjectURL(blob);
            var elapsed = 0;
            if (this.state.startTime) {
                var now = new Date;
                elapsed = now - this.state.startTime;
            }
            audio.duration = this.state.duration + elapsed;
            this.setState({
                capturedAudio: audio,
                previewURL: url,
                capturedImage: null,
                mediaRecorder: null
            });
        });
    },

    /**
     * Called when user clicks rerecord button
     *
     * @param  {Event} evt
     */
    handleRerecordClick: function(evt) {
        this.clearCapturedAudio();
    },

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick: function(evt) {
        console.log(this.state.capturedAudio);
        this.triggerCaptureEvent(this.state.capturedAudio);
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
});
