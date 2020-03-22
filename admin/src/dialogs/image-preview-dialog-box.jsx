import React, { useState } from 'react';
import { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './image-preview-dialog-box.scss';

export const ImagePreviewDialogBox = Overlay.create((props) => {
  const { env, image, onClose } = props;
  const { t } = env.locale;

  return (
    <div className="image-preview-dialog-box">
      {renderImage()}
      {renderButtons()}
    </div>
  );

  function renderImage() {
    if (image) {
      const maxWidth = env.viewportWidth - 100;
      const maxHeight = env.viewportHeight - 150;
      const maxAspectRatio = maxWidth / maxHeight;
      const aspectRation = image.width / image.height;
      let width, height;
      if (aspectRation > maxAspectRatio) {
        width = Math.min(maxWidth, image.width);
      } else {
        height = Math.min(maxHeight, image.height);
      }
      const options = {
        ratio: env.devicePixelRatio,
        width,
        height,
        server: env.address,
      };
      const resized = image.transform(options);
      return <img src={resized.url} width={resized.width} height={resized.height} />;
    }
  }

  function renderButtons() {
    const closeProps = {
      onClick: onClose,
    };
    return (
      <div className="buttons">
        <div className="left">
          {renderLink()}
        </div>
        <div className="right">
          <PushButton {...closeProps}>{t('image-preview-close')}</PushButton>
        </div>
      </div>
    );
  }

  function renderLink() {
    const source = getImageSource(image);
    if (!source) {
      return;
    }
    return (
      <a href={image.source} className="link" target="_blank">
        {t(`image-preview-${source}`)}
        {' '}
        <i className="fas fa-external-link-alt" />
      </a>
    );
  }
});

const isOneDrive = /^https:\/\/(1drv\.ms|onedrive\.live\.com)\//;
const isDropbox = /^https:\/\/(www\.dropbox\.com)\//;

function getImageSource(image) {
  if (image) {
    const { source } = image;
    if (isOneDrive.test(source)) {
      return 'onedrive';
    } else if (isDropbox.test(source)) {
      return 'dropbox';
    }
  }
}
