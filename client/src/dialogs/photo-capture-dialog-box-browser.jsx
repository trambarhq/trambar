import React from 'react';
import Relaks, { useProgress, useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { LiveVideo } from 'common/widgets/live-video.jsx';
import { DeviceSelector } from '../widgets/device-selector.jsx';
import { DevicePlaceholder } from '../widgets/device-placeholder.jsx';

// custom hooks
import { useMediaCapture } from '../hooks.js';

import './photo-capture-dialog-box-browser.scss';

/**
 * Dialog box for taking a picture in the web browser.
 */
export const PhotoCaptureDialogBoxBrowser = Overlay.create(async (props) => {
  const { env, payloads, onCapture, onClose } = props;
  const { t } = env.locale;
  const [ show ] = useProgress(50, 50);
  const capture = useMediaCapture({
    video: true,
    audio: false,
    preferredDevice: 'front',
    watchVolume: false,
    captureImageOnly: true,
  });

  const handleSnapClick = useListener((evt) => capture.snap());
  const handleRetakeClick = useListener((evt) => capture.clear());
  const handleCancelClick = useListener((evt) => {
    if (onClose) {
      onClose({});
    }
  });
  const handleAcceptClick = useListener((evt) => {
    if (onCapture) {
      const { capturedImage } = capture;
      const payload = payloads.add('image');
      payload.attachFile(capturedImage.blob);
      const resource = {
        type: 'image',
        payload_token: payload.id,
        width: capturedImage.width,
        height: capturedImage.height,
        format: capture.options.imageMIMEType.split('/')[1] || '',
      };
      onCapture({ resource });
    }
    handleCancelClick();
  })
  const handleDeviceSelection = useListener((evt) => capture.choose(evt.id));

  do {
    render();
    await capture.change();
  } while (capture.active);

  function render() {
    show(
      <div className="photo-capture-dialog-box">
        <div className="container">
          {renderView()}
        </div>
        <div className="controls">
          <div className="left">
            {renderDeviceSelector()}
          </div>
          <div className="right">
            {renderButtons()}
          </div>
        </div>
      </div>
    );
  }

  function renderView() {
    const { status, liveVideo, capturedImage } = capture;
    switch (status) {
      case 'acquiring':
      case 'denied':
        const placeholderProps = {
          blocked: (status === 'denied'),
          icon: 'camera',
        };
        return <DevicePlaceholder {...placeholderProps} />;
      case 'initiating':
        return <LiveVideo muted />;
      case 'previewing':
        const liveVideoProps = {
          srcObject: liveVideo.stream,
          width: liveVideo.width,
          height: liveVideo.height,
          muted: true,
        };
        return <LiveVideo  {...liveVideoProps} />;
      case 'captured':
        const previewImageProps = {
          className: 'preview',
          src: capturedImage.url,
          width: capturedImage.width,
          height: capturedImage.height,
        };
        return <img {...previewImageProps} />;
    }
  }

  function renderDeviceSelector() {
    const { devices, chosenDeviceID } = capture;
    const props = {
      type: 'video',
      chosenDeviceID,
      devices,
      env,
      onSelect: handleDeviceSelection,
    };
    return <DeviceSelector {...props} />;
  }

  function renderButtons() {
    const { status } = capture;
    switch (status) {
      case 'acquiring':
      case 'denied':
      case 'initiating':
      case 'previewing':
        const cancelButtonProps = {
          label: t('photo-capture-cancel'),
          onClick: handleCancelClick,
        };
        const snapButtonProps = {
          label: t('photo-capture-snap'),
          onClick: handleSnapClick,
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
        const retakeButtonProps = {
          label: t('photo-capture-retake'),
          onClick: handleRetakeClick,
        };
        const acceptButtonProps = {
          label: t('photo-capture-accept'),
          onClick: handleAcceptClick,
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
});
