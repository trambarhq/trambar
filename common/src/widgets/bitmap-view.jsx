import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import { BlobManager } from '../transport/blob-manager.js';
import { loadUint8Array } from '../transport/blob-reader.js';
import { loadImage } from '../media/media-loader.js';
import { getOrientation } from '../media/jpeg-analyser.js';
import { getOrientationMatrix, invertMatrix, transformRect } from '../media/image-orientation.js';

/**
 * A component that displays a bitmap image file (JPEG, PNG, etc.), with
 * correction for orientation flag.
 */
export const BitmapView = React.forwardRef((props, ref) => {
  const { url, clippingRect, width, height, onLoad, onError, ...otherProps } = props;
  const [ image, setImage ] = useState(null);
  const canvasRef = useRef();
  const [ instance ] = useState({
    src: null,
    naturalWidth: 4,
    naturalHeight: 4,
    orientation: 1,
  });

  useImperativeHandle(ref, () => {
    return instance;
  });

  useEffect(() => {
    instance.src = url;
    const load = async function() {
      // load the image and its bytes
      const blob = await BlobManager.fetch(url);
      const image = await loadImage(blob);
      const bytes = await loadUint8Array(blob);
      const orientation = getOrientation(bytes) || 1;
      image.orientation = orientation;
      return image;
    };
    let unmounted = false;
    load().then((loadedImage) => {
      if (!unmounted) {
        setImage(loadedImage);
      }
    }).catch((err) => {
      if (!unmounted && onError) {
        onError({ type: 'error', target: instance });
      }
    });
    return () => { unmounted = true };
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
      const matrix = getOrientationMatrix(orientation, naturalWidth, naturalHeight);
      const inverse = invertMatrix(matrix);
    	const src = transformRect(inverse, clip);
    	const dst = transformRect(inverse, { left: 0, top: 0, width, height });
    	const context = canvas.getContext('2d');
    	context.transform.apply(context, matrix);
      context.drawImage(image, src.left, src.top, src.width, src.height, dst.left, dst.top, dst.width, dst.height);
      instance.naturalWidth = actualWidth;
      instance.naturalHeight = actualHeight;
      instance.orientation = orientation;
    } else {
      canvas.width = 4;
    	canvas.height = 4;
      instance.naturalWidth = 4;
      instance.naturalHeight = 4;
      instance.orientation = 1;
    }
  }, [ image, clippingRect ]);
  useEffect(() => {
    if (image) {
      if (onLoad) {
        onLoad({  type: 'load', target: instance });
      }
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
