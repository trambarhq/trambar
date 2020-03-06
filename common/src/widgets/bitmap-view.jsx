import _ from 'lodash';
import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import * as BlobManager from '../transport/blob-manager.js';
import * as BlobReader from '../transport/blob-reader.js';
import * as MediaLoader from '../media/media-loader.js';
import * as JPEGAnalyser from '../media/jpeg-analyser.js';
import * as ImageOrientation from '../media/image-orientation.js';

/**
 * A component that displays a bitmap image file (JPEG, PNG, etc.), with
 * correction for orientation flag.
 */
export const BitmapView = React.forwardRef((props, ref) => {
  const { url, clippingRect, width, height, onLoad, ...otherProps } = props;
  const [ image, setImage ] = useState(null);
  const canvasRef = useRef();
  const [ instance ] = useState({
    src: null,
    naturalWidth: 4,
    naturalHeight: 4,
  });

  useImperativeHandle(ref, () => {
    return instance;
  });

  useEffect(() => {
    instance.src = url;
    const load = async function() {
      // load the image and its bytes
      const blob = await BlobManager.fetch(url);
      const image = await MediaLoader.loadImage(blob);
      const bytes = await BlobReader.loadUint8Array(blob);
      const orientation = JPEGAnalyser.getOrientation(bytes) || 1;
      image.orientation = orientation;
      return image;
    };
    load().then((loadedImage) => {
      setImage(loadedImage);
    }).catch((err) => {
      if (onError) {
        onError({ type: 'error', target: instance });
      }
    });
  }, [ url ]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (image) {
      const { orientation, naturalWidth, naturalHeight } = image;
      const actualWidth = (orientation < 5) ? naturalWidth : naturalHeight;
      const actualHeight = (orientation < 5) ? naturalHeight : naturalWidth;
      let clip = clippingRect;
      if (!clip) {
        clip = {
          left: 0,
          top: 0,
          width: actualWidth,
          height: actualHeight
        };
      }
      const { width, height } = clip;
      canvas.width = width;
    	canvas.height = height;
      const matrix = ImageOrientation.getOrientationMatrix(orientation, naturalWidth, naturalHeight);
      const inverse = ImageOrientation.invertMatrix(matrix);
    	const src = ImageOrientation.transformRect(inverse, clip);
    	const dst = ImageOrientation.transformRect(inverse, { left: 0, top: 0, width, height });
    	const context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
      context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
      instance.naturalWidth = actualWidth;
      instance.naturalHeight = actualHeight;
    } else {
      canvas.width = 4;
    	canvas.height = 4;
      instance.naturalWidth = 4;
      instance.naturalHeight = 4;
    }
  }, [ image, clippingRect ]);
  useEffect(() => {
    if (onLoad) {
      onLoad({  type: 'load', target: instance });
    }
  }, [ image ]);

  const canvasProps = {
    ref: canvasRef,
    width: 4,
    height: 4,
    ...otherProps,
  };
  return <canvas {...canvasProps} />
});
