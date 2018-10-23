import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as MediaStreamUtils from 'media/media-stream-utils';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import DevicePlaceholder from 'widgets/device-placeholder';
import DurationIndicator from 'widgets/duration-indicator';

import './audio-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing an audio in the web browser.
 *
 * @extends PureComponent
 */
class AudioCaptureDialogBoxBrowser extends PureComponent {
    static displayName = 'AudioCaptureDialogBoxBrowser';

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
     * Initialize microphone on mount
     */
    componentWillMount() {
        let { show } = this.props;
        if (show) {
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
        let { show } = this.props;
        if (nextProps.show !== show) {
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
        let { capturedAudio, previewURL } = this.state;
        if (capturedAudio) {
            URL.revokeObjectURL(previewURL);
            this.setState({ capturedAudio: null, previewURL: null });
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
        let {
            liveAudioSource,
            liveAudioProcessor,
            liveAudioContext,
            liveAudioLevel,
        } = this.state;
        if (liveAudioProcessor) {
            // disconnect
            liveAudioSource.disconnect(liveAudioProcessor);
            liveAudioProcessor.disconnect(liveAudioContext.destination);
        }

        let url, audioCtx, audioProcessor, audioSource;
        if (stream) {
            // use Web Audio API to capture PCM data
            let audioCtx = new AudioContext();
            let audioProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            let audioSource = audioCtx.createMediaStreamSource(stream);
            audioProcessor.addEventListener('audioprocess', (evt) => {
                let samples = evt.inputBuffer.getChannelData(0);
                let max = 0;
                let count = samples.length;
                for (let i = 0; i < count; i++) {
                    let s = samples[i];
                    if (s > max) {
                        max = s;
                    }
                }
                let level = Math.round(max * 100);
                if (level !== liveAudioLevel) {
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
    setLiveAudioNode = (node) => {
        let { liveAudioStream } = this.state;
        this.audioNode = node;
        if (this.audioNode) {
            this.audioNode.srcObject = liveAudioStream;
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        let overlayProps = { show, onBackgroundClick: this.handleCancelClick };
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
        let { capturedAudio, liveAudioStream } = this.state;
        if (capturedAudio) {
            return this.renderCapturedAudio();
        } else if (liveAudioStream) {
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
        let { liveAudioError } = this.state;
        let props = {
            blocked: !!liveAudioError,
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
        let { liveAudioLevel } = this.state;
        let audioProps = {
            ref: this.setLiveAudioNode,
            autoPlay: true,
            muted: true,
        };
        let volumeIcon;
        if (liveAudioLevel < 10) {
            volumeIcon = 'volume-off';
        } else if (liveAudioLevel < 50) {
            volumeIcon = 'volume-down';
        } else {
            volumeIcon = 'volume-up';
        }
        let width = liveAudioLevel + '%';
        return (
            <div>
                <div className="volume-meter">
                    <div className="icon">
                        <i className={'fa fa-' + volumeIcon} />
                    </div>
                    <div className="bar-container">
                        <div className="bar">
                            <div className="fill" style={{ width }} />
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
        let { previewURL } = this.state;
        let props = {
            src: previewURL,
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
        let { mediaRecorder, duration, startTime } = this.state;
        if (!mediaRecorder) {
            return null;
        }
        let durationProps = { duration, startTime };
        return <DurationIndicator {...durationProps} />;
    }

    /**
     * Render buttons
     *
     * @return {[type]}
     */
    renderButtons() {
        let { env } = this.props;
        let { mediaRecorder, capturedAudio, liveAudioStream } = this.state;
        let { t } = env.locale;
        if (mediaRecorder) {
            let paused = (mediaRecorder.state === 'paused');
            let pauseButtonProps = {
                label: t('audio-capture-pause'),
                onClick: this.handlePauseClick,
                hidden: paused,
            };
            let resumeButtonProps = {
                label: t('audio-capture-resume'),
                onClick: this.handleResumeClick,
                hidden: !paused,
                emphasized: true,
            };
            let stopButtonProps = {
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
        } else if (!capturedAudio) {
            let cancelButtonProps = {
                label: t('audio-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            let startButtonProps = {
                label: t('audio-capture-start'),
                onClick: this.handleStartClick,
                disabled: !liveAudioStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...startButtonProps} />
                </div>
            );
        } else {
            let rerecordButtonProps = {
                label: t('audio-capture-rerecord'),
                onClick: this.handleRerecordClick,
            };
            let acceptButtonProps = {
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
        let promise = this.audioStreamPromise;
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
        let { payloads } = this.props;
        let { liveAudioStream } = this.state;
        return Promise.try(() => {
            let segmentDuration = 3 * 1000;
            let options = {
                audioBitsPerSecond : 128000,
                mimeType : 'audio/webm'
            };
            let mediaRecorder = new MediaRecorder(liveAudioStream, options);
            let stream = payloads.stream();
            mediaRecorder.promise = new Promise((resolve, reject) => {
                mediaRecorder.resolve = resolve;
                mediaRecorder.reject = reject;
            });
            mediaRecorder.outputStream = stream;
            mediaRecorder.addEventListener('dataavailable', (evt) => {
                stream.push(evt.data)
            });
            mediaRecorder.addEventListener('stop', (evt) => {
                stream.close();
                mediaRecorder.resolve();
            });
            mediaRecorder.start(segmentDuration);
            // start uploading immediately upon receiving data from MediaRecorder
            stream.start();
            return mediaRecorder;
        });
    }

    /**
     * Pause recording
     *
     * @return {Promise}
     */
    pauseRecording() {
        let { mediaRecorder } = this.state;
        return Promise.try(() => {
            if (mediaRecorder) {
                mediaRecorder.pause();
            }
        });
    }

    /**
     * Resume recording
     *
     * @return {Promise}
     */
    resumeRecording() {
        let { mediaRecorder } = this.state;
        return Promise.try(() => {
            if (mediaRecorder) {
                mediaRecorder.resume();
            }
        });
    }

    /**
     * End recording
     *
     * @return {Promise}
     */
    endRecording() {
        let { mediaRecorder } = this.state;
        return Promise.try(() => {
            if (mediaRecorder) {
                mediaRecorder.stop();

                // wait till all data is encoded
                return mediaRecorder.promise;
            }
        });
    }

    /**
     * Inform parent component that an audio has been captured and accepted
     *
     * @param {Object} resource
     */
    triggerCaptureEvent(resource) {
        let { onCapture } = this.props;
        if (onCapture) {
            onCapture({
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
        let { onClose } = this.props;
        if (onClose) {
            onClose({
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
        let { payloads } = this.props;
        return this.beginRecording().then((mediaRecorder) => {
            // start uploading immediately upon receiving data from MediaRecorder
            payloads.stream(mediaRecorder.outputStream);
            this.setState({
                mediaRecorder,
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
        let { startTime, duration } = this.state;
        return this.pauseRecording().then(() => {
            let now = new Date;
            let elapsed = now - startTime;
            duration += elapsed;
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
            let now = new Date;
            this.setState({ startTime: now });
        });
    }

    /**
     * Called when user clicks stop button
     *
     * @param  {Event} evt
     */
    handleStopClick = (evt) => {
        let { mediaRecorder, startTime, duration } = this.state;
        return this.endRecording().then(() => {
            let blob = mediaRecorder.outputStream.toBlob();
            let url = URL.createObjectURL(blob);
            let elapsed = 0;
            if (startTime) {
                let now = new Date;
                elapsed = now - startTime;
            }
            let audio = {
                format: _.last(_.split(mediaRecorder.mimeType, '/')),
                audioBitsPerSecond: mediaRecorder.audioBitsPerSecond,
                stream: mediaRecorder.outputStream,
                duration: duration + elapsed
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
        let { payloads } = this.props;
        let { capturedAudio } = this.state;
        let payload = payloads.add('audio');
        payload.attachStream(capturedAudio.stream);
        let res = {
            type: 'audio',
            payload_token: payload.id,
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
    AudioCaptureDialogBoxBrowser as default,
    AudioCaptureDialogBoxBrowser,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AudioCaptureDialogBoxBrowser.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onCancel: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
