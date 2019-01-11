import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import RelaksMediaCapture from 'relaks-media-capture';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import DevicePlaceholder from 'widgets/device-placeholder';
import DurationIndicator from 'widgets/duration-indicator';
import VolumeIndicator from 'widgets/volume-indicator';

import './audio-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing a audio in the web browser.
 *
 * @extends AsyncComponent
 */
class AudioCaptureDialogBoxBrowser extends AsyncComponent {
    constructor(props) {
        super(props);
        let options = {
            video: false,
            audio: true,
            watchVolume: true,
            segmentDuration: 5000,
        };
        this.capture = new RelaksMediaCapture(options);
        this.capture.addEventListener('chunk', this.handleCaptureChunk);
        this.capture.addEventListener('end', this.handleCaptureEnd);
        this.stream = null;
    }

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile}  meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { env, show } = this.props;
        meanwhile.delay(50, 50);
        let props = {
            env,
            show,
            onStart: this.handleStart,
            onStop: this.handleStop,
            onPause: this.handlePause,
            onResume: this.handleResume,
            onClear: this.handleClear,
            onChoose: this.handleChoose,
            onAccept: this.handleAccept,
            onCancel: this.handleCancel,
        };
        if (show) {
            meanwhile.show(<AudioCaptureDialogBoxBrowserSync {...props} />);
            this.capture.activate();
            do {
                props.status = this.capture.status;
                props.devices = this.capture.devices;
                props.selectedDeviceID = this.capture.selectedDeviceID;
                props.duration = this.capture.duration;
                props.volume = this.capture.volume;
                props.capturedImage = this.capture.capturedImage;
                props.capturedAudio = this.capture.capturedAudio;
                meanwhile.show(<AudioCaptureDialogBoxBrowserSync {...props} />);
                await this.capture.change();
            } while (this.capture.active);
        }
        return <AudioCaptureDialogBoxBrowserSync {...props} />;
    }

    /**
     * Deactivate media capture object when dialog box is hidden
     */
    componentDidUpdate() {
        setTimeout(() => {
            let { show } = this.props;
            if (!show) {
                this.capture.deactivate();
                this.capture.clear();
            }
        }, 500);
    }

    /**
     * Deactivate media capture object when component unmounts
     */
    componentWillUnmount() {
        this.capture.deactivate();
    }

    /**
     * Called when user wants to start recording
     *
     * @param  {Event} evt
     */
    handleStart = (evt) => {
        let { payloads } = this.props;
        this.stream = payloads.stream();
        this.stream.start();
        this.capture.start();
    }

    /**
     * Called when user wants to stop recording
     *
     * @param  {Event} evt
     */
    handleStop = (evt) => {
        this.capture.stop();
    }

    /**
     * Called when user wants to pause recording
     *
     * @param  {Event} evt
     */
    handlePause = (evt) => {
        this.capture.pause();
    }

    /**
     * Called when user wants to resume recording
     *
     * @param  {Event} evt
     */
    handleResume = (evt) => {
        this.capture.resume();
    }

    /**
     * Called when user wants to start over
     *
     * @param  {Event} evt
     */
    handleClear = (evt) => {
        this.capture.clear();
        if (this.stream) {
            this.stream.cancel();
            this.stream = null;
        }
    }

    /**
     * Called when user selects a different input device
     *
     * @param  {Object} evt
     */
    handleChoose = (evt) => {
        this.capture.choose(evt.id);
    }

    /**
     * Called when user closes the dialog box
     *
     * @param  {Event} evt
     */
    handleCancel = (evt) => {
        let { onClose } = this.props;
        if (onClose) {
            onClose({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user accepts the recorded audio
     *
     * @param  {Event} evt
     */
    handleAccept = (evt) => {
        let { payloads, onCapture } = this.props;
        if (onCapture) {
            let media = this.capture.extract();
            let payload = payloads.add('audio');
            payload.attachStream(this.stream);
            let resource = {
                type: 'audio',
                payload_token: payload.id,
                duration: media.audio.duration,
                format: _.last(_.split(this.capture.options.audioMIMEType, '/')),
                bitrates: {
                    audio: this.capture.options.audioBitsPerSecond,
                }
            };
            onCapture({
                type: 'capture',
                target: this,
                resource
            });
        }
        this.capture.deactivate();
        this.handleCancel();
    }

    /**
     * Called after a chunk of audio has been recorded
     *
     * @param  {Object} evt
     */
    handleCaptureChunk = (evt) => {
        if (this.stream) {
            this.stream.push(evt.blob);
        }
    }

    /**
     * Called when recording endeds, after the last chunk was received
     *
     * @param  {Object} evt
     */
    handleCaptureEnd = (evt) => {
        if (this.stream) {
            this.stream.close();
        }
    }
}

/**
 * Synchronous component that actually draws the interface
 *
 * @extends PureComponent
 */
class AudioCaptureDialogBoxBrowserSync extends PureComponent {
    static displayName = 'AudioCaptureDialogBoxBrowserSync';

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
                        <div className="left">
                            {this.renderDuration()}
                        </div>
                        <div className="right">
                            {this.renderButtons()}
                        </div>
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
        let { status, capturedAudio } = this.props;
        switch (status) {
            case 'acquiring':
            case 'denied':
                let placeholderProps = {
                    blocked: (status === 'denied'),
                    icon: 'microphone',
                };
                return <DevicePlaceholder {...placeholderProps} />;
            case 'initiating':
            case 'previewing':
            case 'capturing':
            case 'paused':
                return this.renderVolume();
            case 'captured':
                let previewAudioProps = {
                    className: 'preview',
                    src: capturedAudio.url,
                    controls: true,
                };
                return <audio {...previewAudioProps} />;
        }
    }

    /**
     * Render a dropdown if there're multiple devices
     *
     * @return {ReactElement|null}
     */
    renderDeviceSelector() {
        let { env, devices, selectedDeviceID, onChoose } = this.props;
        let props = {
            type: 'audio',
            selectedDeviceID,
            devices,
            env,
            onSelect: onChoose,
        };
        return <DeviceSelector {...props} />;
    }

    /**
     * Render duration when we're recording
     *
     * @return {ReactElement|null}
     */
    renderDuration() {
        let { status, duration } = this.props;
        if (typeof(duration) !== 'number') {
            return null;
        }
        let durationProps = { duration, recording: (status === 'capturing') };
        return <DurationIndicator {...durationProps} />
    }

    /**
     * Show microphone volume
     *
     * @return {ReactElement}
     */
    renderVolume() {
        let { status, volume } = this.props;
        if (typeof(volume) !== 'number' || status === 'captured') {
            return null;
        }
        let volumeProps = { volume, recording: (status === 'capturing') };
        return <VolumeIndicator {...volumeProps} />;
    }

    /**
     * Render buttons
     *
     * @return {[type]}
     */
    renderButtons() {
        let { env, status } = this.props;
        let { onCancel, onStart, onPause, onResume, onStop, onClear, onAccept } = this.props;
        let { t } = env.locale;
        switch (status) {
            case 'acquiring':
            case 'denied':
            case 'initiating':
            case 'previewing':
                let cancelButtonProps = {
                    label: t('audio-capture-cancel'),
                    onClick: onCancel,
                };
                let startButtonProps = {
                    label: t('audio-capture-start'),
                    onClick: onStart,
                    disabled: (status !== 'previewing'),
                    emphasized: (status === 'previewing'),
                };
                return (
                    <div className="buttons">
                        <PushButton {...cancelButtonProps} />
                        <PushButton {...startButtonProps} />
                    </div>
                );
            case 'capturing':
                let pauseButtonProps = {
                    label: t('audio-capture-pause'),
                    onClick: onPause,
                };
                let stopButtonProps = {
                    label: t('audio-capture-stop'),
                    onClick: onStop,
                    emphasized: true
                };
                return (
                    <div className="buttons">
                        <PushButton {...pauseButtonProps} />
                        <PushButton {...stopButtonProps} />
                    </div>
                );
            case 'paused':
                let resumeButtonProps = {
                    label: t('audio-capture-resume'),
                    onClick: onResume,
                    emphasized: true
                };
                let stopButton2Props = {
                    label: t('audio-capture-stop'),
                    onClick: onStop,
                };
                return (
                    <div className="buttons">
                        <PushButton {...resumeButtonProps} />
                        <PushButton {...stopButton2Props} />
                    </div>
                );
            case 'captured':
                let retakeButtonProps = {
                    label: t('audio-capture-rerecord'),
                    onClick: onClear,
                };
                let acceptButtonProps = {
                    label: t('audio-capture-accept'),
                    onClick: onAccept,
                    emphasized: true,
                };
                return (
                    <div className="buttons">
                        <PushButton {...retakeButtonProps} />
                        <PushButton {...acceptButtonProps} />
                    </div>
                );
        }
    }
}

export {
    AudioCaptureDialogBoxBrowser as default,
    AudioCaptureDialogBoxBrowser,
    AudioCaptureDialogBoxBrowserSync,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AudioCaptureDialogBoxBrowser.propTypes = {
        show: PropTypes.bool,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapture: PropTypes.func,
    };
    AudioCaptureDialogBoxBrowserSync.propTypes = {
        show: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,

        status: PropTypes.oneOf([
            'acquiring',
            'denied',
            'initiating',
            'previewing',
            'capturing',
            'paused',
            'captured',
        ]),
        capturedAudio: PropTypes.shape({
            url: PropTypes.string.isRequired,
            blob: PropTypes.instanceOf(Blob).isRequired,
        }),
        duration: PropTypes.number,
        devices: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string,
        })),
        selectedDeviceID: PropTypes.string,

        onChoose: PropTypes.func,
        onCancel: PropTypes.func,
        onStart: PropTypes.func,
        onStop: PropTypes.func,
        onPause: PropTypes.func,
        onResume: PropTypes.func,
        onClear: PropTypes.func,
        onAccept: PropTypes.func,
    };
}
