import React from 'react';
import { useProgress, useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { LiveVideo } from 'common/widgets/live-video.jsx';
import { DeviceSelector } from '../widgets/device-selector.jsx';
import { DevicePlaceholder } from '../widgets/device-placeholder.jsx';
import { DurationIndicator } from '../widgets/duration-indicator.jsx';
import { VolumeIndicator } from '../widgets/volume-indicator.jsx';

// custom hooks
import { useMediaCapture, useStreamHandling } from '../hooks.js';

import './video-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing a video in the web browser.
 */
export const VideoCaptureDialogBoxBrowser = Overlay.create(async (props) => {
  const { env, payloads, onCapture, onClose } = props;
  const { t } = env.locale;
  const [ show ] = useProgress(50, 50);
  const stream = useStreamHandling(payloads);
  const capture = useMediaCapture({
    video: true,
    audio: true,
    preferredDevice: 'front',
    watchVolume: true,
    segmentDuration: 2000,
  }, stream);

  const handleStartClick = useListener((evt) => {
    stream.start();
    capture.start();
    capture.snap();
  });
  const handleStopClick = useListener((evt) => capture.stop());
  const handlePauseClick = useListener((evt) => capture.pause());
  const handleResumeClick = useListener((evt) => capture.resume());
  const handleRetakeClick = useListener((evt) => {
    capture.clear();
    stream.cancel();
  });
  const handleCancelClick = useListener((evt) => {
    if (onClose) {
      onClose({});
    }
  }, [ onClose ]);
  const handleAcceptClick = useListener((evt) => {
    if (onCapture) {
      const { capturedVideo, capturedImage } = capture;
      const payload = payloads.add('video');
      payload.attachStream(stream.current);
      payload.attachFile(capturedImage.blob, 'poster');
      const resource = {
        type: 'video',
        payload_token: payload.id,
        width: capturedVideo.width,
        height: capturedVideo.height,
        duration: capturedVideo.duration,
        format: capture.options.videoMIMEType.split('/')[1] || '',
        bitrates: {
          audio: capture.options.audioBitsPerSecond,
          video: capture.options.videoBitsPerSecond,
        }
      };
      onCapture({ resource });
    }
    if (onClose) {
      onClose({});
    }
  }, [ payloads, onClose, onCapture ]);
  const handleDeviceSelection = useListener((evt) => capture.choose(evt.id));

  do {
    render();
    await capture.change();
  } while (capture.active);

  function render() {
    show(
      <div className="video-capture-dialog-box">
        <div className="container">
          {renderView()}
        </div>
        <div className="controls">
          <div className="left">
            {renderDuration() || renderDeviceSelector()}
          </div>
          <div className="center">
            {renderVolume()}
          </div>
          <div className="right">
            {renderButtons()}
          </div>
        </div>
      </div>
    );
  }

  function renderView() {
    const { status, liveVideo, capturedVideo, capturedImage } = capture;
    switch (status) {
      case 'acquiring':
      case 'denied':
        const placeholderProps = {
          blocked: (status === 'denied'),
          icon: 'video-camera',
        };
        return <DevicePlaceholder {...placeholderProps} />;
      case 'initiating':
        return <LiveVideo muted />;
      case 'previewing':
      case 'capturing':
      case 'paused':
        const liveVideoProps = {
          srcObject: liveVideo.stream,
          width: liveVideo.width,
          height: liveVideo.height,
          muted: true,
        };
        return <LiveVideo  {...liveVideoProps} />;
      case 'captured':
        const previewVideoProps = {
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

  function renderDeviceSelector() {
    const { devices, chosenDeviceID, onChoose } = capture;
    const props = {
      type: 'video',
      chosenDeviceID,
      devices,
      env,
      onSelect: handleDeviceSelection,
    };
    return <DeviceSelector {...props} />;
  }

  function renderDuration() {
    const { status, duration } = capture;
    if (typeof(duration) !== 'number') {
      return null;
    }
    const durationProps = { duration, recording: (status === 'capturing') };
    return <DurationIndicator {...durationProps} />
  }

  function renderVolume() {
    const { status, volume } = capture;
    if (typeof(volume) !== 'number' || status === 'captured') {
      return null;
    }
    const volumeProps = { volume, recording: (status === 'capturing') };
    return <VolumeIndicator {...volumeProps} />;
  }

  function renderButtons() {
    const { status } = capture;
    switch (status) {
      case 'acquiring':
      case 'denied':
      case 'initiating':
      case 'previewing':
        const cancelButtonProps = {
          label: t('video-capture-cancel'),
          onClick: handleCancelClick,
        };
        const startButtonProps = {
          label: t('video-capture-start'),
          onClick: handleStartClick,
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
        const pauseButtonProps = {
          label: t('video-capture-pause'),
          onClick: handlePauseClick,
        };
        const stopButtonProps = {
          label: t('video-capture-stop'),
          onClick: handleStopClick,
          emphasized: true
        };
        return (
          <div className="buttons">
            <PushButton {...pauseButtonProps} />
            <PushButton {...stopButtonProps} />
          </div>
        );
      case 'paused':
        const resumeButtonProps = {
          label: t('video-capture-resume'),
          onClick: handleResumeClick,
          emphasized: true
        };
        const stopButton2Props = {
          label: t('video-capture-stop'),
          onClick: handleStopClick,
        };
        return (
          <div className="buttons">
            <PushButton {...resumeButtonProps} />
            <PushButton {...stopButton2Props} />
          </div>
        );
      case 'captured':
        const retakeButtonProps = {
          label: t('video-capture-retake'),
          onClick: handleRetakeClick,
        };
        const acceptButtonProps = {
          label: t('video-capture-accept'),
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
