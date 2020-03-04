import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';

// widgets
import { HeaderButton } from './header-button.jsx';

import './reaction-media-toolbar.scss';

/**
 * Buttons for attaching media to a comment. It also handling the toggling of
 * Markdown formatting.
 */
export function ReactionMediaToolbar(props) {
  const { env, reaction, capturing, onAction } = props;
  const { t } = env.locale;
  const canCaptureImage = _.includes(env.recorders, 'image');
  const canCaptureVideo = _.includes(env.recorders, 'video');
  const canCaptureAudio = _.includes(env.recorders, 'audio');
  const resources = reaction?.details?.resources ?? [];

  const handleClick = useListener((evt) => {
    const action = evt.currentTarget.getAttribute('data-action');
    if (onAction) {
      if (action === 'markdown-set') {
        const value = !reaction.details.markdown;
        onAction({ action, value });
      } else {
        onAction({ action });
      }
    }
  });
  const handleFileChange = useListener((evt) => {
    const files = evt.target.files;
    if (onAction) {
      if (!_.isEmpty(files)) {
        onAction({ action: 'file-import', files });
      }
    }
  });

  const counts = { photo: 0, video: 0, audio: 0, file: 0 };
  for (let resource of resources) {
    if (resource.imported) {
      counts.file++;
    } else {
      switch (resource.type) {
        case 'image': counts.photo++; break;
        case 'video': counts.video++; break;
        case 'audio': counts.audio++; break;
      }
    }
  }

  const photoButtonProps = {
    tooltip: t('story-photo'),
    icon: 'camera',
    hidden: !counts.photo && !canCaptureImage,
    disabled: !canCaptureImage,
    highlighted: (counts.photo > 0 || capturing === 'image'),
    'data-action': 'photo-capture',
    onClick: handleClick,
  };
  const videoButtonProps = {
    tooltip: t('story-video'),
    icon: 'video-camera',
    hidden: !counts.video && !canCaptureVideo,
    disabled: !canCaptureVideo,
    highlighted: (counts.video > 0 || capturing === 'video'),
    'data-action': 'video-capture',
    onClick: handleClick,
  };
  const audioButtonProps = {
    tooltip: t('story-audio'),
    icon: 'microphone',
    hidden: !counts.audio && !canCaptureAudio,
    disabled: !canCaptureAudio,
    highlighted: (counts.audio > 0 || capturing === 'audio'),
    'data-action': 'audio-capture',
    onClick: handleClick,
  };
  const selectButtonProps = {
    tooltip: t('story-file'),
    icon: 'file-photo-o',
    multiple: true,
    highlighted: (counts.file > 0),
    onChange: handleFileChange,
  };
  const markdownProps = {
    tooltip: t('story-markdown'),
    icon: 'pencil-square',
    highlighted: reaction?.details?.markdown ?? false,
    'data-action': 'markdown-set',
    onClick: handleClick,
  };
  return (
    <div className="reaction-media-toolbar">
      <HeaderButton {...photoButtonProps} />
      <HeaderButton {...videoButtonProps} />
      <HeaderButton {...audioButtonProps} />
      <HeaderButton.File {...selectButtonProps} />
      <HeaderButton {...markdownProps} />
    </div>
  );
}
