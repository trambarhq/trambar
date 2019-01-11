import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import RelaksMediaCapture from 'relaks-media-capture';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import LiveVideo from 'widgets/live-video';
import DeviceSelector from 'widgets/device-selector';
import DevicePlaceholder from 'widgets/device-placeholder';
import DurationIndicator from 'widgets/duration-indicator';
import VolumeIndicator from 'widgets/volume-indicator';

import './video-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing a video in the web browser.
 *
 * @extends AsyncComponent
 */
class VideoCaptureDialogBoxBrowser extends AsyncComponent {
    constructor(props) {
        super(props);
        let options = {
            video: true,
            audio: true,
            preferredDevice: 'front',
            watchVolume: true,
            segmentDuration: 2000,
        };
        this.capture = new RelaksMediaCapture(options);
        this.capture.addEventListener('chunk', this.handleCaptureChunk);
        this.capture.addEventListener('end', this.handleCaptureEnd);
        this.stream = null;
    }

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
            meanwhile.show(<VideoCaptureDialogBoxBrowserSync {...props} />);
            this.capture.activate();
            do {
                props.status = this.capture.status;
                props.devices = this.capture.devices;
                props.selectedDeviceID = this.capture.selectedDeviceID;
                props.liveVideo = this.capture.liveVideo;
                props.duration = this.capture.duration;
                props.volume = this.capture.volume;
                props.capturedImage = this.capture.capturedImage;
                props.capturedVideo = this.capture.capturedVideo;
                meanwhile.show(<VideoCaptureDialogBoxBrowserSync {...props} />);
                await this.capture.change();
            } while (this.capture.active);
        }
        return <VideoCaptureDialogBoxBrowserSync {...props} />;
    }

    componentDidUpdate() {
        setTimeout(() => {
            let { show } = this.props;
            if (!show) {
                this.capture.deactivate();
                this.capture.clear();
            }
        }, 500);
    }

    componentWillUnmount() {
        this.capture.deactivate();
    }

    handleStart = (evt) => {
        let { payloads } = this.props;
        this.stream = payloads.stream();
        this.stream.start();
        this.capture.start();
        this.capture.snap();
    }

    handleStop = (evt) => {
        this.capture.stop();
    }

    handlePause = (evt) => {
        this.capture.pause();
    }

    handleResume = (evt) => {
        this.capture.resume();
    }

    handleClear = (evt) => {
        this.capture.clear();
        if (this.stream) {
            this.stream.cancel();
            this.stream = null;
        }
    }

    handleChoose = (evt) => {
        this.capture.choose(evt.id);
    }

    handleCancel = (evt) => {
        let { onClose } = this.props;
        if (onClose) {
            onClose({
                type: 'cancel',
                target: this,
            });
        }
    }

    handleAccept = (evt) => {
        let { payloads, onCapture } = this.props;
        if (onCapture) {
            let media = this.capture.extract();
            let payload = payloads.add('video');
            payload.attachStream(this.stream);
            payload.attachFile(media.image.blob, 'poster');
            let resource = {
                type: 'video',
                payload_token: payload.id,
                width: media.video.width,
                height: media.video.height,
                duration: media.video.duration,
                format: _.last(_.split(this.capture.options.videoMIMEType, '/')),
                bitrates: {
                    audio: this.capture.options.audioBitsPerSecond,
                    video: this.capture.options.videoBitsPerSecond,
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

    handleCaptureChunk = (evt) => {
        if (this.stream) {
            this.stream.push(evt.blob);
        }
    }

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
class VideoCaptureDialogBoxBrowserSync extends PureComponent {
    static displayName = 'VideoCaptureDialogBoxBrowserSync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show, onCancel } = this.props;
        let overlayProps = { show, onBackgroundClick: onCancel };
        return (
            <Overlay {...overlayProps}>
                <div className="video-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        <div className="left">
                            {this.renderDuration() || this.renderDeviceSelector()}
                        </div>
                        <div className="center">
                            {this.renderVolume()}
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
     * Render either live or captured video
     *
     * @return {ReactElement}
     */
    renderView() {
        let { status, liveVideo, capturedVideo, capturedImage } = this.props;
        switch (status) {
            case 'acquiring':
            case 'denied':
                let placeholderProps = {
                    blocked: (status === 'denied'),
                    icon: 'video-camera',
                };
                return <DevicePlaceholder {...placeholderProps} />;
            case 'initiating':
                return <LiveVideo muted />;
            case 'previewing':
            case 'capturing':
            case 'paused':
                let liveVideoProps = {
                    srcObject: liveVideo.stream,
                    width: liveVideo.width,
                    height: liveVideo.height,
                    muted: true,
                };
                return <LiveVideo  {...liveVideoProps} />;
            case 'captured':
                let previewVideoProps = {
                    className: 'preview',
                    src: capturedVideo.url,
                    poster: capturedImage.url,
                    width: capturedVideo.width,
                    height: capturedVideo.height,
                    controls: true,
                };
                return <video {...previewVideoProps} />;
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
            type: 'video',
            selectedDeviceID,
            devices,
            env,
            onSelect: onChoose,
        };
        return <DeviceSelector {...props} />;
    }

    /**
     * Show duration when we're recording
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
     * @return {ReactElement}
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
                    label: t('video-capture-cancel'),
                    onClick: onCancel,
                };
                let startButtonProps = {
                    label: t('video-capture-start'),
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
                    label: t('video-capture-pause'),
                    onClick: onPause,
                };
                let stopButtonProps = {
                    label: t('video-capture-stop'),
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
                    label: t('video-capture-resume'),
                    onClick: onResume,
                    emphasized: true
                };
                let stopButton2Props = {
                    label: t('video-capture-stop'),
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
                    label: t('video-capture-retake'),
                    onClick: onClear,
                };
                let acceptButtonProps = {
                    label: t('video-capture-accept'),
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
    VideoCaptureDialogBoxBrowser as default,
    VideoCaptureDialogBoxBrowser,
    VideoCaptureDialogBoxBrowserSync,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VideoCaptureDialogBoxBrowser.propTypes = {
        show: PropTypes.bool,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapture: PropTypes.func,
    };
    VideoCaptureDialogBoxBrowserSync.propTypes = {
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
        liveVideo: PropTypes.shape({
            stream: PropTypes.instanceOf(Object).isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }),
        capturedVideo: PropTypes.shape({
            url: PropTypes.string.isRequired,
            blob: PropTypes.instanceOf(Blob).isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }),
        capturedImage: PropTypes.shape({
            url: PropTypes.string.isRequired,
            blob: PropTypes.instanceOf(Blob).isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
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
