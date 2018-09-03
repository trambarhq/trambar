import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import MediaStreamUtils from 'media/media-stream-utils';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import DevicePlaceholder from 'widgets/device-placeholder';
import DurationIndicator from 'widgets/duration-indicator';

import './audio-capture-dialog-box-browser.scss';

class AudioCaptureDialogBox extends PureComponent {
    static displayName = 'AudioCaptureDialogBox';

    constructor(props) {
        super(props);
        this.state = {
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
    }

    /**
     * Return true if the browser has the necessary functionalities
     *
     * @return {Boolean}
     */
    static isAvailable() {
        if (!MediaStreamUtils.hasSupport()) {
            return false;
        }
        if (typeof(MediaRecorder) !== 'function') {
            return false;
        }
        if (typeof(AudioContext) !== 'function') {
            return false;
        }
        return true;
    }

    /**
     * Initialize microphone on mount
     */
    componentWillMount() {
        if (this.props.show) {
            this.initializeMicrophone();
        }
    }

    /**
     * Initialize microphone when dialog box is shown and shut it down when
     * dialog closes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
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
    }

    /**
     * Clear captured audio
     */
    clearCapturedAudio() {
        if (this.state.capturedAudio) {
            URL.revokeObjectURL(this.state.previewURL);
            this.setState({
                capturedAudio: null,
                previewURL: null,
            });
        }
    }

    /**
     * Create audio stream
     */
    initializeMicrophone() {
        this.createLiveAudioStream().then((stream) => {
            this.setLiveAudioState(null, stream);
        }).catch((err) => {
            this.setLiveAudioState(err, null);
        });
    }

    /**
     * Destroy audio stream
     */
    shutdownMicrophone() {
        this.destroyLiveAudioStream().then(() => {
            this.setLiveAudioState(null, null);
        });
    }

    /**
     * Set audio state
     *
     * @param  {Error} err
     * @param  {MediaStream} stream
     */
    setLiveAudioState(err, stream) {
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
    }

    /**
     * Set the video node and apply live video stream to it
     *
     * @param  {HTMLAudioElement} node
     */
    setLiveAudioNode(node) {
        this.audioNode = node;
        if (this.audioNode) {
            this.audioNode.srcObject = this.state.liveAudioStream;
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
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
    }

    /**
     * Render either playback control for captured audio or volume bar
     *
     * @return {ReactElement}
     */
    renderView() {
        if (this.state.capturedAudio) {
            return this.renderCapturedAudio();
        } else if (this.state.liveAudioStream) {
            return this.renderLiveAudio();
        } else {
            return this.renderPlaceholder();
        }
    }

    /**
     * Render placeholder graphic when microphone isn't available
     *
     * @return {ReactElement}
     */
    renderPlaceholder() {
        var props = {
            blocked: !!this.state.liveAudioError,
            icon: 'microphone',
        };
        return <DevicePlaceholder {...props} />;
    }

    /**
     * Render volume level coming from mic
     *
     * @return {ReactElement|null}
     */
    renderLiveAudio() {
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
    }

    /**
     * Render audio playback control
     *
     * @return {ReactElement}
     */
    renderCapturedAudio() {
        var props = {
            src: this.state.previewURL,
            controls: true
        };
        return <audio {...props} />;
    }

    /**
     * Render duration when we're recording
     *
     * @return {ReactElement|null}
     */
    renderDuration() {
        if (!this.state.mediaRecorder) {
            return null;
        }
        var durationProps = {
            duration: this.state.duration,
            startTime: this.state.startTime,
        };
        return <DurationIndicator {...durationProps} />;
    }

    /**
     * Render buttons
     *
     * @return {[type]}
     */
    renderButtons() {
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
    }

    /**
     * Destroy audio stream on unmount
     */
    componentWillUnmount() {
        this.destroyLiveAudioStream();
    }

    /**
     * Create audio stream
     *
     * @return {Promise}
     */
    createLiveAudioStream() {
        if (!this.audioStreamPromise) {
            this.audioStreamPromise = MediaStreamUtils.getAudioStream();
        }
        return this.audioStreamPromise;
    }

    /**
     * Destroy audio stream
     *
     * @return {Promise}
     */
    destroyLiveAudioStream() {
        if (!this.audioStreamPromise) {
            return Promise.resolve();
        }
        var promise = this.audioStreamPromise;
        this.audioStreamPromise = null;
        return promise.then((stream) => {
            MediaStreamUtils.stopAllTracks(stream);
        });
    }

    /**
     * Start recording audio
     *
     * @return {Promise<MediaRecorder>}
     */
    beginRecording() {
        return Promise.try(() => {
            var segmentDuration = 3 * 1000;
            var options = {
                audioBitsPerSecond : 128000,
                mimeType : 'audio/webm'
            };
            var recorder = new MediaRecorder(this.state.liveAudioStream, options);
            var stream = this.props.payloads.stream();
            recorder.promise = new Promise((resolve, reject) => {
                recorder.resolve = resolve;
                recorder.reject = reject;
            });
            recorder.outputStream = stream;
            recorder.addEventListener('dataavailable', (evt) => {
                this.outputStream.push(evt.data)
            });
            recorder.addEventListener('stop', (evt) => {
                this.outputStream.close();
                recorder.resolve();
            });
            recorder.start(segmentDuration);
            // start uploading immediately upon receiving data from MediaRecorder
            stream.start();
            return recorder;
        });
    }

    /**
     * Pause recording
     *
     * @return {Promise}
     */
    pauseRecording() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.pause();
            }
        });
    }

    /**
     * Resume recording
     *
     * @return {Promise}
     */
    resumeRecording() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.resume();
            }
        });
    }

    /**
     * End recording
     *
     * @return {Promise}
     */
    endRecording() {
        return Promise.try(() => {
            var recorder = this.state.mediaRecorder;
            if (recorder) {
                recorder.stop();

                // wait till all data is encoded
                return recorder.promise;
            }
        });
    }

    /**
     * Inform parent component that an audio has been captured and accepted
     *
     * @param {Object} resource
     */
    triggerCaptureEvent(resource) {
        if (this.props.onCapture) {
            this.props.onCapture({
                type: 'capture',
                target: this,
                resource,
            })
        }
    }

    /**
     * Inform parent component that dialog box should be closed
     */
    triggerCloseEvent() {
        if (this.props.onClose) {
            this.props.onClose({
                type: 'close',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks start button
     *
     * @param  {Event} evt
     */
    handleStartClick = (evt) => {
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
    }

    /**
     * Called when user clicks pause button
     *
     * @param  {Event} evt
     */
    handlePauseClick = (evt) => {
        return this.pauseRecording().then(() => {
            var now = new Date;
            var elapsed = now - this.state.startTime;
            var duration = this.state.duration + elapsed;
            this.setState({ duration, startTime: null });
        });
    }

    /**
     * Called when user clicks resume button
     *
     * @param  {Event} evt
     */
    handleResumeClick = (evt) => {
        return this.resumeRecording().then(() => {
            var now = new Date;
            this.setState({ startTime: now });
        });
    }

    /**
     * Called when user clicks stop button
     *
     * @param  {Event} evt
     */
    handleStopClick = (evt) => {
        return this.endRecording().then(() => {
            var recorder = this.state.mediaRecorder;
            var blob = recorder.outputStream.toBlob();
            var url = URL.createObjectURL(blob);
            var elapsed = 0;
            if (this.state.startTime) {
                var now = new Date;
                elapsed = now - this.state.startTime;
            }
            var audio = {
                format: _.last(_.split(recorder.mimeType, '/')),
                audioBitsPerSecond: recorder.audioBitsPerSecond,
                stream: recorder.outputStream,
                duration: this.state.duration + elapsed
            };
            this.setState({
                capturedAudio: audio,
                previewURL: url,
                mediaRecorder: null
            });
        });
    }

    /**
     * Called when user clicks rerecord button
     *
     * @param  {Event} evt
     */
    handleRerecordClick = (evt) => {
        this.clearCapturedAudio();
    }

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick = (evt) => {
        var capturedAudio = this.state.capturedAudio;
        var payload = this.props.payloads.add('audio');
        payload.attachStream(capturedAudio.stream);
        var res = {
            type: 'audio',
            payload_token: payload.token,
            duration: capturedAudio.duration,
            format: capturedAudio.format,
            bitrates: {
                audio: capturedAudio.audioBitsPerSecond,
            },
        }
        this.triggerCloseEvent();
        this.triggerCaptureEvent(res);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        this.triggerCloseEvent();
    }
}

export {
    AudioCaptureDialogBox as default,
    AudioCaptureDialogBox,
};

import Payloads from 'transport/payloads';
import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AudioCaptureDialogBox.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
