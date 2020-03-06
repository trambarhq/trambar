import _ from 'lodash';
import React from 'react';
import { useProgress, useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { DevicePlaceholder } from '../widgets/device-placeholder.jsx';
import { DurationIndicator } from '../widgets/duration-indicator.jsx';
import { VolumeIndicator } from '../widgets/volume-indicator.jsx';

// custom hooks
import {
  useMediaCapture,
  useStreamHandling,
} from '../hooks.js';

import './audio-capture-dialog-box-browser.scss';

/**
 * Dialog box for capturing a audio in the web browser.
 */
export const AudioCaptureDialogBoxBrowser = Overlay.create(async (props) => {
  const { env, payloads, onCapture, onClose } = props;
  const { t } = env.locale;
  const [ show ] = useProgress(50, 50);
  const stream = useStreamHandling(payloads);
  const capture = useMediaCapture({
    video: false,
    audio: true,
    watchVolume: true,
    segmentDuration: 5000,
  }, stream);

  const handleStartClick = useListener((evt) => {
    stream.start();
    capture.start();
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
  });
  const handleAcceptClick = useListener((evt) => {
    if (onCapture) {
      const { capturedAudio } = capture;
      const payload = payloads.add('audio');
      payload.attachStream(stream.current);
      const resource = {
        type: 'audio',
        payload_token: payload.id,
        duration: capturedAudio.duration,
        format: _.last(_.split(capture.options.audioMIMEType, '/')),
        bitrates: {
          audio: capture.options.audioBitsPerSecond,
        }
      };
      onCapture({ resource });
    }
    if (onClose) {
      onClose({});
    }
  });
  const handleDeviceSelection = useListener((evt) => capture.choose(evt.id));

  do {
    render();
    await capture.change();
  } while (capture.active);

  function render() {
    show(
      <div className="audio-capture-dialog-box">
        <div className="container">
          {renderView()}
        </div>
        <div className="controls">
          <div className="left">
            {renderDuration()}
          </div>
          <div className="right">
            {renderButtons()}
          </div>
        </div>
      </div>
    );
  }

  function renderView() {
    const { status, capturedAudio } = capture;
    switch (status) {
      case 'acquiring':
      case 'denied':
        const placeholderProps = {
          blocked: (status === 'denied'),
          icon: 'microphone',
        };
        return <DevicePlaceholder {...placeholderProps} />;
      case 'initiating':
      case 'previewing':
      case 'capturing':
      case 'paused':
        return renderVolume();
      case 'captured':
        const previewAudioProps = {
          className: 'preview',
          src: capturedAudio.url,
          controls: true,
        };
        return <audio {...previewAudioProps} />;
    }
  }

  function renderDeviceSelector() {
    const { devices, chosenDeviceID } = capture;
    let props = {
      type: 'audio',
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
    const volumeProps = {
      type: 'gauge',
      volume,
      recording: (status === 'capturing')
    };
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
          label: t('audio-capture-cancel'),
          onClick: handleCancelClick,
        };
        const startButtonProps = {
          label: t('audio-capture-start'),
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
          label: t('audio-capture-pause'),
          onClick: handlePauseClick,
        };
        const stopButtonProps = {
          label: t('audio-capture-stop'),
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
          label: t('audio-capture-resume'),
          onClick: handleResumeClick,
          emphasized: true
        };
        const stopButton2Props = {
          label: t('audio-capture-stop'),
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
          label: t('audio-capture-rerecord'),
          onClick: handleRetakeClick,
        };
        const acceptButtonProps = {
          label: t('audio-capture-accept'),
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
