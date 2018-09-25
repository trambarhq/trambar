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

import './photo-capture-dialog-box-browser.scss';

class PhotoCaptureDialogBox extends PureComponent {
    static displayName = 'PhotoCaptureDialogBox';

    constructor(props) {
        let { cameraDirection } = props;
        super(props);
        let devices = DeviceManager.getDevices('videoinput');
        let preferredDevice = DeviceSelector.choose(devices, cameraDirection);
        this.state = {
            liveVideoStream: null,
            liveVideoError : null,
            liveVideoWidth: 640,
            liveVideoHeight: 480,
            capturedImage: null,
            videoDevices: devices,
            selectedDeviceID: (preferredDevice) ? preferredDevice.deviceID : null,
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
        if (typeof(HTMLCanvasElement.prototype.toBlob) !== 'function') {
            if (typeof(HTMLCanvasElement.prototype.toDataURL) !== 'function') {
                return false;
            }
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
                this.setState({ capturedImage: null });
                this.initializeCamera();
            } else {
                setTimeout(() => {
                    this.shutdownCamera();
                    this.setState({ capturedImage: null });
                }, 500);
            }
        }
    }

    /**
     * Create live video stream, asking user for permission if necessary
     */
    initializeCamera() {
        this.createLiveVideoStream().then((stream) => {
            let dim = MediaStreamUtils.getVideoDimensions(stream);
            this.setState({
                liveVideoStream: stream,
                liveVideoError: null,
                liveVideoWidth: dim.width,
                liveVideoHeight: dim.height,
            });
        }).catch((err) => {
            console.error(err);
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
    setLiveVideoNode(node) {
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
                <div className="photo-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        {this.renderDeviceSelector()}
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    }

    /**
     * Render either live video or captured image
     *
     * @return {ReactElement}
     */
    renderView() {
        let { capturedImage, liveVideoStream } = this.state;
        if (capturedImage) {
            return this.renderCapturedImage();
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
            icon: 'camera',
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
    renderCapturedImage() {
        let { capturedImage } = this.state;
        let imageProps = {
            className: 'preview',
            src: capturedImage.url
        };
        return (
            <div>
                {this.renderSpacer()}
                <img {...imageProps} />
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
        let { capturedImage, videoDevices, selectedDeviceID } = this.state;
        if (capturedImage) {
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
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { capturedImage, liveVideoStream } = this.state;
        let { t } = env.locale;
        if (!capturedImage) {
            let cancelButtonProps = {
                label: t('photo-capture-cancel'),
                onClick: this.handleCancelClick,
            };
            let snapButtonProps = {
                label: t('photo-capture-snap'),
                onClick: this.handleSnapClick,
                disabled: !liveVideoStream,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...snapButtonProps} />
                </div>
            );
        } else {
            let retakeButtonProps = {
                label: t('photo-capture-retake'),
                onClick: this.handleRetakeClick,
            };
            let acceptButtonProps = {
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
            this.videoStreamPromise = MediaStreamUtils.getSilentVideoStream(selectedDeviceID);
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
            let localURL = BlobManager.manage(blob);
            return {
                url: localURL,
                blob: blob,
                width: video.videoWidth,
                height: video.videoHeight,
            };
        });
    }

    /**
     * Report back to parent component that an image has been captured and
     * accepted by user
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
            });
        }
    }

    /**
     * Inform parent component that dialog box should be closed
     */
    triggerCloseEvent() {
        let { onClose } = this.onClose;
        if (onClose) {
            onClose({
                type: 'close',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks snap button
     *
     * @param  {Event} evt
     */
    handleSnapClick = (evt) => {
        this.captureImage().then((image) => {
            this.setState({ capturedImage: image });
        }).catch((err) => {
            console.error(err);
        });
    }

    /**
     * Called when user clicks retake button
     *
     * @param  {Event} evt
     */
    handleRetakeClick = (evt) => {
        let { capturedImage } = this.state;
        BlobManager.release(capturedImage.blob);
        this.setState({ capturedImage: null });
    }

    /**
     * Called when user clicks accept button
     *
     * @param  {Event} evt
     */
    handleAcceptClick = (evt) => {
        let { payloads } = this.props;
        let { capturedImage } = this.state;
        let payload = payloads.add('image');
        payload.attachFile(capturedImage.blob);
        let url = payload.token;
        let res = {
            type: 'image',
            payload_token: payload.token,
            width: capturedImage.width,
            height: capturedImage.height,
            format: 'jpeg'
        };
        this.triggerCloseEvent(true);
        this.triggerCaptureEvent(res);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        this.triggerCloseEvent(false);
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
    PhotoCaptureDialogBox as default,
    PhotoCaptureDialogBox,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PhotoCaptureDialogBox.propTypes = {
        show: PropTypes.bool,
        cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),

        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapturePending: PropTypes.func,
        onCaptureError: PropTypes.func,
        onCapture: PropTypes.func,
    };
}
