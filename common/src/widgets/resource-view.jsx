import _ from 'lodash';
import React, { useState } from 'react';
import { useAsyncEffect } from 'relaks';
import * as MediaLoader from '../media/media-loader.js';
import * as ImageCropping from '../media/image-cropping.js';
import * as ResourceUtils from '../objects/utils/resource-utils.js';

import { BitmapView } from './bitmap-view.jsx';
import { VectorView } from './vector-view.jsx';

import './resource-view.scss';

/**
 * A component for displaying a media resource (image, video, audio, web-link).
 * It's capable of displaying local files that have just need selected for
 * uploading to remote server.
 */
function ResourceView(props) {
  const { env, resource, width, height, clip, showAnimation, showMosaic, children, ...otherProps } = props;
  const [ remoteURLLoaded, setRemoteURLLoaded ] = useState('');
  const remoteParams = { remote: true };
  const localParams = { local: true, original: true };
  if (showAnimation && resource.format === 'gif') {
    // use the original file when it's a gif and we wish to show animation
    remoteParams.original = true;
  } else {
    if (!clip) {
      // don't apply clip rectangle
      remoteParams.clip = null;
    }
    // resize source image
    remoteParams.width = width;
    remoteParams.height = height;
  }
  const localURL = ResourceUtils.getImageURL(resource, localParams, env);
  const remoteURL = ResourceUtils.getImageURL(resource, remoteParams, env);

  useAsyncEffect(async () => {
    if (localURL && remoteURL) {
      // the image has just become available on the remote server
      // pre-cache it before switching from the local copy
      await MediaLoader.loadImage(remoteURL);
      setRemoteURLLoaded(remoteURL);
    }
  }, [ localURL, remoteURL ]);

  // if we have a blob of the image, then it's just been uploaded
  // use it until we've loaded the remote copy
  if (localURL && (remoteURLLoaded !== remoteURL)) {
    return renderLocalImage();
  } else if (remoteURL) {
    return renderRemoteImage();
  } else {
    return children || null;
  }

  function renderRemoteImage() {
    const dims = ResourceUtils.getImageDimensions(resource, { original: !clip });
    let imageWidth, imageHeight;
    if (width) {
      imageWidth = width;
      imageHeight = Math.round(width * dims.height / dims.width);
    } else if (height) {
      imageWidth = Math.round(height * dims.width / dims.height);
      imageHeight = height;
    } else {
      imageWidth = dims.width;
      imageHeight = dims.height;
    }
    const imageProps = {
      src: remoteURL,
      width: imageWidth,
      height: imageHeight,
      onLoad: (evt) => { setRemoteURLLoaded(remoteURL) },
      ...otherProps,
    };
    const classNames = [ 'resource-view' ];
    let style;
    if (remoteURLLoaded !== remoteURL && showMosaic) {
      const mosaic = (clip) ? _.get(resource, 'mosaic') : null;
      classNames.push('loading');
      style = getMosaicStyle(mosaic, width, height);
    }
    return (
      <div className={classNames.join(' ')} style={style}>
        <img {...imageProps} />
      </div>
    );
  }

  function renderLocalImage() {
    const clippingRect = (clip) ? ResourceUtils.getClippingRect(resource) : null;
    const imageProps = {
      url: localURL,
      width,
      height,
      clippingRect,
    }
    if (resource.format === 'svg') {
      return <VectorView {...imageProps} />;
    } else {
      return <BitmapView {...imageProps} />;
    }
  }
}

function formatColor(color) {
  if (color.length < 6) {
    color = '000000'.substr(color.length) + color;
  }
  return '#' + color;
}

function getMosaicStyle(mosaic, width, height) {
  const heightToWidthRatio = height / width;
  const style = { paddingTop: (heightToWidthRatio * 100) + '%' };
  if (_.size(mosaic) === 16) {
    const scanlines = _.chunk(mosaic, 4);
    const gradients  = _.map(scanlines, (pixels) => {
      let [ c1, c2, c3, c4 ] = _.map(pixels, formatColor);
      return `linear-gradient(90deg, ${c1} 0%, ${c1} 25%, ${c2} 25%, ${c2} 50%, ${c3} 50%, ${c3} 75%, ${c4} 75%, ${c4} 100%)`;
    });
    const positions = [ `0 0%`, `0 ${100 / 3}%`, `0 ${200 / 3}%`, `0 100%` ];
    style.backgroundRepeat = 'no-repeat';
    style.backgroundSize = `100% 25.5%`;
    style.backgroundImage = gradients.join(', ');
    style.backgroundPosition = positions.join(', ');
  }
  return style;
}

ResourceView.defaultProps = {
  clip: true,
  showAnimation: false,
  showMosaic: false,
};

export {
  ResourceView as default,
  ResourceView,
};
