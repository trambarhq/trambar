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

import './photo-capture-dialog-box-browser.scss';

/**
 * Dialog box for taking a picture in the web browser.
 *
 * @extends AsyncComponent
 */
class PhotoCaptureDialogBoxBrowser extends AsyncComponent {
    constructor(props) {
        super(props);
        let options = {
            video: true,
            audio: false,
            preferredDevice: 'front',
            watchVolume: false,
            captureImageOnly: true,
        };
        this.capture = new RelaksMediaCapture(options);
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
            onSnap: this.handleSnap,
            onClear: this.handleClear,
            onChoose: this.handleChoose,
            onAccept: this.handleAccept,
            onCancel: this.handleCancel,
        };
        if (show) {
            this.capture.activate();
            do {
                props.status = this.capture.status;
                props.devices = this.capture.devices;
                props.selectedDeviceID = this.capture.selectedDeviceID;
                props.liveVideo = this.capture.liveVideo;
                props.capturedImage = this.capture.capturedImage;
                meanwhile.show(<PhotoCaptureDialogBoxBrowserSync {...props} />);
                await this.capture.change();
            } while (this.capture.active);
        }
        return <PhotoCaptureDialogBoxBrowserSync {...props} />;
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
     * Called when user wants to capture the camera input
     *
     * @param  {Event} evt
     */
    handleSnap = (evt) => {
        this.capture.snap();
    }

    /**
     * Called when user wants to start over
     *
     * @param  {Event} evt
     */
    handleClear = (evt) => {
        this.capture.clear();
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
     * Called when user accepts the captured image
     *
     * @param  {Event} evt
     */
    handleAccept = (evt) => {
        let { payloads, onCapture } = this.props;
        if (onCapture) {
            let media = this.capture.extract();
            let payload = payloads.add('image');
            payload.attachFile(media.image.blob);
            let resource = {
                type: 'image',
                payload_token: payload.id,
                width: media.image.width,
                height: media.image.height,
                format: _.last(_.split(this.capture.options.imageMIMEType, '/')),
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
}

/**
 * Synchronous component that actually draws the interface
 *
 * @extends PureComponent
 */
class PhotoCaptureDialogBoxBrowserSync extends PureComponent {
    static displayName = 'PhotoCaptureDialogBoxBrowserSync';

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
                <div className="photo-capture-dialog-box">
                    <div className="container">
                        {this.renderView()}
                    </div>
                    <div className="controls">
                        <div className="left">
                            {this.renderDeviceSelector()}
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
     * Render either live video or captured image
     *
     * @return {ReactElement}
     */
    renderView() {
        let { status, liveVideo, capturedImage } = this.props;
        switch (status) {
            case 'acquiring':
            case 'denied':
                let placeholderProps = {
                    blocked: (status === 'denied'),
                    icon: 'camera',
                };
                return <DevicePlaceholder {...placeholderProps} />;
            case 'initiating':
                return <LiveVideo muted />;
            case 'previewing':
                let liveVideoProps = {
                    srcObject: liveVideo.stream,
                    width: liveVideo.width,
                    height: liveVideo.height,
                    muted: true,
                };
                return <LiveVideo  {...liveVideoProps} />;
            case 'captured':
                let previewImageProps = {
                    className: 'preview',
                    src: capturedImage.url,
                    width: capturedImage.width,
                    height: capturedImage.height,
                };
                return <img {...previewImageProps} />;
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
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, status } = this.props;
        let { onCancel, onSnap, onClear, onAccept } = this.props;
        let { t } = env.locale;
        switch (status) {
            case 'acquiring':
            case 'denied':
            case 'initiating':
            case 'previewing':
                let cancelButtonProps = {
                    label: t('photo-capture-cancel'),
                    onClick: onCancel,
                };
                let snapButtonProps = {
                    label: t('photo-capture-snap'),
                    onClick: onSnap,
                    disabled: (status !== 'previewing'),
                    emphasized: (status === 'previewing'),
                };
                return (
                    <div className="buttons">
                        <PushButton {...cancelButtonProps} />
                        <PushButton {...snapButtonProps} />
                    </div>
                );
            case 'captured':
                let retakeButtonProps = {
                    label: t('photo-capture-retake'),
                    onClick: onClear,
                };
                let acceptButtonProps = {
                    label: t('photo-capture-accept'),
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
    PhotoCaptureDialogBoxBrowser as default,
    PhotoCaptureDialogBoxBrowser,
    PhotoCaptureDialogBoxBrowserSync,
};

import Payloads from 'transport/payloads';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PhotoCaptureDialogBoxBrowser.propTypes = {
        show: PropTypes.bool,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
        onCapture: PropTypes.func,
    };
    PhotoCaptureDialogBoxBrowserSync.propTypes = {
        show: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,

        status: PropTypes.oneOf([
            'acquiring',
            'denied',
            'initiating',
            'previewing',
            'captured',
        ]),
        liveVideo: PropTypes.shape({
            stream: PropTypes.instanceOf(Object).isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }),
        capturedImage: PropTypes.shape({
            url: PropTypes.string.isRequired,
            blob: PropTypes.instanceOf(Blob).isRequired,
            width: PropTypes.number.isRequired,
            height: PropTypes.number.isRequired,
        }),
        devices: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string,
        })),
        selectedDeviceID: PropTypes.string,

        onChoose: PropTypes.func,
        onCancel: PropTypes.func,
        onSnap: PropTypes.func,
        onClear: PropTypes.func,
        onAccept: PropTypes.func,
    };
}
