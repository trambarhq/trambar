import React from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { centerSquare } from 'common/media/image-cropping.js';
import { getImageURL } from 'common/objects/utils/resource-utils.js';
import { isEqual } from 'common/utils/object-utils.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ImageCropper } from 'common/widgets/image-cropper.jsx';

import './image-cropping-dialog-box.scss';

/**
 * Dialog box for cropping/resizing an image.
 */
export const ImageCroppingDialogBox = Overlay.create((props) => {
  const { env, show, image, desiredWidth, desiredHeight } = props;
  const { onCancel, onSelect } = props;
  const { t } = env.locale;
  const ratio = desiredWidth / desiredHeight;
  const clippingRect = useSaveBuffer({
    original: getDefault(image, ratio),
    compare: isEqual,
  });

  const handleChange = useListener((evt) => {
    clippingRect.set(round(evt.rect));
  });
  const handleCancelClick = useListener((evt) => {
    if (onCancel) {
      onCancel({});
    }
    clippingRect.reset();
  });
  const handleSelectClick = useListener((evt) => {
    if (onSelect) {
      onSelect({ clippingRect: clippingRect.current });
    }
  });
  const handleZoomInClick = useListener((evt) => {
    const rect = resize(clippingRect.current, 0.9, ratio, image);
    clippingRect.set(rect);
  });
  const handleZoomOutClick = useListener((evt) => {
    const rect = resize(clippingRect.current, 1 / 0.9, ratio, image);
    clippingRect.set(rect);
  });

  return (
    <div className="image-cropping-dialog-box">
      {renderImage()}
      {renderButtons()}
    </div>
  );

  function renderImage() {
    const url = getImageURL(image, { original: true }, env);
    const props = {
      url,
      clippingRect: clippingRect.current,
      vector: image.format === 'svg',
      onChange: handleChange,
    };
    const style = {
      width: desiredWidth,
      height: desiredHeight,
    };
    return (
      <div className="image" style={style}>
        <ImageCropper {...props} />
      </div>
    );
  }

  function renderButtons() {
    const zoomOutProps = {
      className: 'zoom',
      disabled: !canZoom(1 / 0.9),
      onClick: handleZoomOutClick,
    };
    const zoomInProps = {
      className: 'zoom',
      disabled: !canZoom(0.9),
      onClick: handleZoomInClick,
    };
    const cancelProps = {
      className: 'cancel',
      onClick: handleCancelClick,
    };
    const selectProps = {
      className: 'select',
      disabled: !clippingRect.changed,
      onClick: handleSelectClick,
    };
    return (
      <div key="select" className="buttons">
        <div className="left">
          <PushButton {...zoomOutProps}><i className="fas fa-search-minus" /></PushButton>
          <PushButton {...zoomInProps}><i className="fas fa-search-plus" /></PushButton>
        </div>
        <div className="right">
          <PushButton {...cancelProps}>{t('image-cropping-cancel')}</PushButton>
          {' '}
          <PushButton {...selectProps}>{t('image-cropping-select')}</PushButton>
        </div>
      </div>
    );
  }

  function canZoom(amount) {
    const rect = clippingRect.current;
    const newRect = resize(rect, amount, ratio, image);
    return !isEqual(rect, newRect);
  }
});

function resize(rect, amount, ratio, image) {
  let width = rect.width * amount;
  let height = rect.height * amount;
  if (image) {
    if (width > image.width) {
      width = image.width;
      height = width / ratio;
    }
    if (height > image.height) {
      height = image.height;
      width = height * ratio;
    }
  }
  let left = rect.left - (width - rect.width) / 2;
  let top = rect.top - (height - rect.height) / 2;
  if (left < 0) {
    left = 0;
  }
  if (top < 0) {
    top = 0;
  }
  return round({ left, top, width, height });
}

function round(rect) {
  const result = {};
  for (let [ name, value ] of Object.entries(rect)) {
    result[name] = Math.round(value);
  }
  return result;
}

function getDefault(image) {
  let rect;
  if (image) {
    if (image.clip) {
      rect = image.clip;
    } else {
      rect = centerSquare(image.width, image.height);
    }
  } else {
    rect = centerSquare(0, 0);
  }
  return round(rect);
}
