import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import * as FrameGrabber from 'media/frame-grabber';
import * as DeviceManager from 'media/device-manager';
import * as MediaStreamUtils from 'media/media-stream-utils';
import * as BlobManager from 'transport/blob-manager';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import DeviceSelector from 'widgets/device-selector';
import DevicePlaceholder from 'widgets/device-placeholder';
import DurationIndicator from 'widgets/duration-indicator';

import './video-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing a video in the web browser.
 *
 * @extends PureComponent
 */
class VideoCaptureDialogBox extends PureComponent {
    static displayName = 'VideoCaptureDialogBox';

    constructor(props) {
        super(props);
        let devices = DeviceManager.getDevices('videoinput');
        let preferredDevice = DeviceSelector.choose(devices, props.cameraDirection);
        this.state = {
            liveVideoStream: null,
            liveVideoError : null,
            liveVideoWidth: 640,
            liveVideoHeight: 480,
            mediaRecorder: null,
            capturedVideo: null,
            capturedImage: null,
            previewURL: null,
            videoDevices: devices,
            selectedDeviceID: (preferredDevice) ? preferredDevice.deviceID : null,
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
        return true;
    }

    /**
     * Initialize camera if component is mounted as shown (probably not)
     */
    componentWillMount() {
        let { show } = this.props;
        if (show) {
            this.initializeCamera();
        }
        DeviceManager.addEventListener('change', this.handleDeviceChange);
    }

    /**
     * Initialize camera when component becomes visible
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (nextProps.show !== show) {
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
    }

    /**
     * Removed video that was captured earlier
     */
    clearCapturedVideo() {
        let { capturedVideo, previewURL } = this.state;
        if (capturedVideo) {
            URL.revokeObjectURL(previewURL);
            this.setState({
                capturedVideo: null,
                capturedImage: null,
                previewURL: null,
            });
        }
    }

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera() {
        return this.createLiveVideoStream().then((stream) => {
            let dim = MediaStreamUtils.getVideoDimensions(stream);
            this.setState({
                liveVideoStream: stream,
                liveVideoError: null,
                liveVideoWidth: dim.width,
                liveVideoHeight: dim.height,
            });
        }).catch((err) => {
            this.setState({
                liveVideoStream: null,
                liveVideoError: err,
            });
        });
    }

    /**
     * Release live video stream
     */
    shutdownCamera() {
        this.destroyLiveVideoStream().then(() => {
            this.setState({
                liveVideoStream: null,
                liveVideoError: null,
            });
        });
    }

    /**
     * Recreate live video stream after a different camera is selected
     */
    reinitializeCamera() {
        this.destroyLiveVideoStream().then(() => {
            this.initializeCamera();
        });
    }

    /**
     * Set the video node and apply live video stream to it
     *
     * @param  {HTMLVideoElement} node
     */
    setLiveVideoNode = (node) => {
        let { liveVideoStream, liveVideoWidth, liveVideoHeight } = this.state;
        this.videoNode = node;
        if (this.videoNode) {
            this.videoNode.srcObject = liveVideoStream;
            this.videoNode.play();

            // fix the video dimensions if they're wrong
            MediaStreamUtils.getActualVideoDimensions(node, (dim) => {
                if (liveVideoWidth !== dim.width || liveVideoHeight !== dim.height) {
                    this.setState({
                        liveVideoWidth: dim.width,
                        liveVideoHeight: dim.height,
                    });
                }
            });
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
                <div className="video-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        {this.renderDeviceSelector()}
                        {this.renderButtons()}
                        {this.renderDuration()}
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
        let { capturedVideo, liveVideoStream } = this.state;
        if (capturedVideo) {
            return this.renderCapturedVideo();
        } else if (liveVideoStream) {
            return this.renderLiveVideo();
        } else {
            return this.renderPlaceholder();
        }
    }

    /**
     * Render placeholder graphic when camera isn't available
     *
     * @return {ReactElement}
     */
    renderPlaceholder() {
        let { liveVideoError } = this.state;
        let props = {
            blocked: !!liveVideoError,
            icon: 'video-camera',
        };
        return <DevicePlaceholder {...props} />;
    }

    /**
     * Render view of live video stream
     *
     * @return {ReactElement}
     */
    renderLiveVideo() {
        let videoProps = {
            ref: this.setLiveVideoNode,
            key: 'live',
            className: 'live-video',
            muted: true,
        };
        return (
            <div>
                {this.renderSpacer()}
                <video {...videoProps} />
            </div>
        );
    }

    /**
     * Render a spacer element
     *
     * @return {ReactElement}
     */
    renderSpacer() {
        let { liveVideoWidth, liveVideoHeight } = this.state;
        let spacerProps = {
            className: 'spacer',
            width: liveVideoWidth,
            height: liveVideoHeight,
        };
        return <canvas {...spacerProps} />;
    }

    /**
     * Render video captured previously
     *
     * @return {ReactElement}
     */
    renderCapturedVideo() {
        let { previewURL } = this.state;
        let videoProps = {
            key: 'preview',
            className: 'preview',
            src: previewURL,
            controls: true
        };
        return (
            <div>
                {this.renderSpacer()}
                <video {...videoProps} />
            </div>
        );
    }

    /**
     * Render a dropdown if there're multiple devices
     *
     * @return {ReactElement|null}
     */
    renderDeviceSelector() {
        let { env } = this.props;
        let {
            mediaRecorder,
            capturedVideo,
            videoDevices,
            selectedDeviceID
        } = this.state;
        if (mediaRecorder) {
            return null;
        }
        if (capturedVideo) {
            return null;
        }
        let props = {
            type: 'video',
            devices: videoDevices,
            selectedDeviceID,
            env,
            onSelect: this.handleDeviceSelect,
        };
        return <DeviceSelector {...props} />;
    }

    /**
     * Show duration when we're recording
     *
     * @return {ReactElement|null}
     */
    renderDuration() {
        let { mediaRecorder, startTime, duration } = this.state;
        if (!mediaRecorder) {
            return null;
        }
        let durationProps = { duration, startTime };
        return <DurationIndicator {...durationProps} />
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { mediaRecorder, capturedVideo, liveVideoStream } = this.state;
        let { t } = env.locale;
        if (mediaRecorder) {
            let paused = (mediaRecorder.state === 'paused');
            let pauseButtonProps = {
                label: t('video-capture-pause'),
                onClick: this.handlePauseClick,
                hidden: paused,
            };
            let resumeButtonProps = {
                label: t('video-capture-resume'),
                onClick: this.handleResumeClick,
                hidden: !paused,
                emphasized: true
            };
            let stopButtonProps = {
                label: t('video-capture-stop'),
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
        } else if (!capturedVideo) {
            let cancelButtonProps = {
                label: t('video-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            let startButtonProps = {
                label: t('video-capture-start'),
                onClick: this.handleStartClick,
                disabled: !liveVideoStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...startButtonProps} />
                </div>
            );
        } else {
            let retakeButtonProps = {
                label: t('video-capture-retake'),
                onClick: this.handleRetakeClick,
            };
            let acceptButtonProps = {
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
    }

    /**
     * Change the video's source object when user changes camera
     */
    componentDidUpdate(prevProps, prevState) {
        let { liveVideoStream } = this.state;
        if (this.videoNode) {
            if (prevState.liveVideoStream !== liveVideoStream) {
                this.setLiveVideoNode(this.videoNode);
            }
        }
    }

    /**
     * Destroy live video stream when component unmounts
     */
    componentWillUnmount() {
        this.destroyLiveVideoStream();
        this.clearCapturedVideo();
        DeviceManager.removeEventListener('change', this.handleDeviceChange);
    }

    /**
     * Create a live video stream
     *
     * @return {Promise<MediaStream>}
     */
    createLiveVideoStream() {
        let { selectedDeviceID } = this.state;
        if (!this.videoStreamPromise) {
            this.videoStreamPromise = MediaStreamUtils.getVideoStream(selectedDeviceID);
        }
        return this.videoStreamPromise;
    }

    /**
     * Destroy live video stream created previously
     *
     * @return {Promise}
     */
    destroyLiveVideoStream() {
        if (!this.videoStreamPromise) {
            return Promise.resolve();
        }
        let promise = this.videoStreamPromise;
        this.videoStreamPromise = null;
        return promise.then((stream) => {
            MediaStreamUtils.stopAllTracks(stream);
        });
    }

    /**
     * Capture a frame from camera
     *
     * @return {Promise<Object>}
     */
    captureImage() {
        let video = this.videoNode;
        return FrameGrabber.capture(video).then((blob) => {
            return {
                blob: blob,
                width: video.videoWidth,
                height: video.videoHeight,
            };
        });
    }

    /**
     * Start capturing video
     *
     * @return {Promise}
     */
    beginRecording() {
        let { payloads } = this.props;
        let { liveVideoStream } = this.state;
        return Promise.try(() => {
            let segmentDuration = 3 * 1000;
            let options = {
                audioBitsPerSecond : 128000,
                videoBitsPerSecond : 2500000,
                mimeType : 'video/webm'
            };
            let mediaRecorder = new MediaRecorder(liveVideoStream, options);
            let stream = payloads.stream();
            mediaRecorder.outputStream = stream;
            mediaRecorder.promise = new Promise((resolve, reject) => {
                mediaRecorder.resolve = resolve;
                mediaRecorder.reject = reject;
            });
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
     * Pause capturing
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
     * Resume capturing
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
     * Stop capturing video, returning what was captured
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
     * Report back to parent component that a video has been captured
     *
     * @param  {Object} resource
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
        return Promise.join(this.captureImage(), this.beginRecording(), (capturedImage, mediaRecorder) => {
            this.setState({
                capturedImage,
                mediaRecorder,
                startTime: new Date,
                duration: 0,
            });
            return null;
        }).catch((err) => {
            console.error(err);
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
            let video = {
                format: _.last(_.split(mediaRecorder.mimeType, '/')),
                audioBitsPerSecond: mediaRecorder.audioBitsPerSecond,
                videoBitsPerSecond: mediaRecorder.videoBitsPerSecond,
                stream: mediaRecorder.outputStream,
                duration: duration + elapsed,
            };
            this.setState({
                capturedVideo: video,
                previewURL: url,
                mediaRecorder: null
            });
        });
    }

    /**
     * Called when user clicks retake button
     *
     * @param  {Event} evt
     */
    handleRetakeClick = (evt) => {
        this.clearCapturedVideo();
    }

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick = (evt) => {
        let { payloads } = this.props;
        let { capturedVideo, capturedImage } = this.state;
        let payload = payloads.add('video');
        payload.attachStream(capturedVideo.stream);
        payload.attachFile(capturedImage.blob, 'poster');
        let res = {
            type: 'video',
            payload_token: payload.id,
            width: capturedImage.width,
            height: capturedImage.height,
            duration: capturedVideo.duration,
            format: capturedVideo.format,
            bitrates: {
                audio: capturedVideo.audioBitsPerSecond,
                video: capturedVideo.videoBitsPerSecond,
            }
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

    /**
     * Called when user selects a different device
     *
     * @param  {Event} evt
     */
    handleDeviceSelect = (evt) => {
        let selectedDeviceID = evt.currentTarget.value;
        this.setState({ selectedDeviceID }, () => {
            this.reinitializeCamera();
        });
    }

    /**
     * Called when the list of media devices changes
     *
     * @param  {Object} evt
     */
    handleDeviceChange = (evt) => {
        let { selectedDeviceID } = this.state;
        let videoDevices = DeviceManager.getDevices('videoinput');
        let reinitialize = false;
        if (selectedDeviceID) {
            if (!_.some(videoDevices, { deviceID: selectedDeviceID })) {
                // reinitialize the camera when the one we were using disappears
                selectedDeviceID = null;
                reinitialize = true;
            }
        }
        this.setState({ videoDevices, selectedDeviceID }, () => {
            if (reinitialize) {
                this.reinitializeCamera();
            }
        });
    }
}

export {
    VideoCaptureDialogBox as default,
    VideoCaptureDialogBox,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VideoCaptureDialogBox.propTypes = {
        show: PropTypes.bool,

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
