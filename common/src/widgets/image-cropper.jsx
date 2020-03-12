import _ from 'lodash';
import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import { useListener, useSaveBuffer, useAutoSave } from 'relaks';
import Hammer from 'hammerjs';

import { BitmapView } from './bitmap-view.jsx';
import { VectorView } from './vector-view.jsx';

import './image-cropper.scss';

/**
 * A component for cropping images. It handles both mouse and touch input.
 */
export const ImageCropper = React.forwardRef((props, ref) => {
  const { url, clippingRect, disabled, vector, onLoad, onChange } = props;
  const containerRef = useRef();
  const imageRef = useRef();
  const [ hasFocus, setHasFocus ] = useState(false);
  const [ dragStart, setDragStart ] = useState(null);
  const [ panStart, setPanStart ] = useState(null);

  useImperativeHandle(ref, () => {
    function focus() {
      if (containerRef.current) {
        containerRef.current.focus();
      }
    }
    return { focus };
  }, []);

  const rect = useSaveBuffer({
    original: clippingRect,
    transform: (ours) => {
      if (imageRef.current) {
        const { naturalWidth, naturalHeight } = imageRef.current;
        constrainPosition(ours, naturalWidth, naturalHeight);
      }
      return ours;
    },
  });
  const save = useAutoSave(rect, 100, () => {
    if (onChange) {
      onChange({ rect: rect.current });
    }
  });

  const handleFocus = useListener((evt) => {
    setHasFocus(true);
  });
  const handleBlur = useListener((evt) => {
    setHasFocus(false);
  });
  const handleMouseDown = useListener((evt) => {
    if (evt.button !== 0) {
      // not the primary mouse button (usually left)
      return;
    }
    setDragStart({
      clippingRect: rect.current,
      boundingRect: containerRef.current.getBoundingClientRect(),
      pageX: evt.pageX,
      pageY: evt.pageY,
    });
  });
  const handleMouseMove = useListener((evt) => {
    if (evt.cancelable) {
      evt.preventDefault();
    }

    // just in case an event manages to slip through
    if (!dragStart) {
      return;
    }
    const offset = {
      x: dragStart.pageX - evt.pageX,
      y: dragStart.pageY - evt.pageY,
    };
    const boundingRect = dragStart.boundingRect;
    const newRect = { ...dragStart.clippingRect };
    const dX = offset.x * newRect.width / boundingRect.width;
    const dY = offset.y * newRect.height / boundingRect.height;
    newRect.left += Math.round(dX);
    newRect.top += Math.round(dY);
    rect.update(newRect);
  });
  const handleMouseUp = useListener((evt) => {
    if (!dragStart) {
      return;
    }
    save();
    setDragStart(null);
  });
  const handleMouseWheel = useListener((evt) => {
    //if (evt.cancelable) {
      evt.preventDefault();
    //}

    if (!hasFocus) {
      containerRef.current.focus();
    }
    const divider = (evt.shiftKey) ? 1 : 4; // faster zoom when shift is pressed
    let deltaY;
    switch (evt.deltaMode) {
      case 0: // pixel
        deltaY = evt.deltaY;
        break;
      case 1: // line
        deltaY = evt.deltaY * 18;
        break;
      case 2: // page
        deltaY = evt.deltaY * 480;
        break;
    }
    const boundingRect = containerRef.current.getBoundingClientRect();
    let expansion = Math.round((deltaY * rect.current.height / boundingRect.height) / divider);
    let newClippingWidth = rect.current.width + expansion;
    const { naturalWidth, naturalHeight } = imageRef.current;
    // prevent expansion of the clipping rect that'd that it outside the image
    if (newClippingWidth > naturalWidth) {
      newClippingWidth = naturalWidth;
      expansion = newClippingWidth - rect.current.width;
    }
    let newClippingHeight = rect.current.height + expansion;
    if (newClippingHeight > naturalHeight) {
      newClippingHeight = naturalHeight;
      expansion = newClippingHeight - rect.current.height;
      newClippingWidth = rect.current.width + expansion;
    }

    // center the change at the mouse cursor
    const cursorPos = {
      x: evt.pageX - boundingRect.left,
      y: evt.pageY - boundingRect.top
    };
    const dX = - cursorPos.x * expansion / boundingRect.width;
    const dY = - cursorPos.y * expansion / boundingRect.height;
    const newRect = { ...rect.current };
    newRect.left += Math.round(dX);
    newRect.top += Math.round(dY);
    newRect.width = newClippingWidth;
    newRect.height = newClippingHeight;
    rect.update(newRect);

    // if the zooming occur during dragging, update the drag-start state
    if (dragStart) {
      dragStart.clippingRect = rect.current;
      dragStart.pageX = evt.pageX;
      dragStart.pageY = evt.pageY;
    }
  });
  const handlePanStart = useListener((evt) => {
    if (evt.pointerType === 'mouse') {
      // don't handle mouse events through Hammer
      return;
    }
    setPanStart({
      clippingRect: rect.current,
      boundingRect: container.getBoundingClientRect(),
    });
  });
  const handlePanMove = useListener((evt) => {
    if (!panStart) {
      return;
    }
    const boundingRect = panStart.boundingRect;
    const newRect = { ...panStart.clippingRect };
    const dX = - evt.deltaX * newRect.width / boundingRect.width;
    const dY = - evt.deltaY * newRect.height / boundingRect.height;
    newRect.left += Math.round(dX);
    newRect.top += Math.round(dY);
    rect.update(newRect);
  });
  const handlePanEnd = useListener((evt) => {
    if (!panStart) {
      return;
    }
    save();
    setPanStart(null);
  });
  const handlePinchStart = useListener((evt) => {
    if (evt.pointerType === 'mouse') {
      return;
    }
    setPinchStart({
      clippingRect: rect.current,
      boundingRect: container.getBoundingClientRect(),
      pointers: _.map(evt.pointers, (pointer) => {
        return {
          pageX: pointer.pageX,
          pageY: pointer.pageY,
        };
      })
    });
  });
  const handlePinchMove = useListener((evt) => {
    if (!pinchStart) {
      return;
    }
    const newRect = { ...pinchStart.clippingRect };
    const boundingRect = pinchStart.boundingRect;
    const { naturalWidth, naturalHeight } = imageRef.current;
    let scale = 1 / evt.scale;
    let newClippingWidth = Math.round(newRect.width * scale);
    if (newClippingWidth > naturalWidth) {
      newClippingWidth = naturalWidth;
      scale = newClippingWidth / newRect.width;
    }
    let newClippingHeight = Math.round(newRect.height * scale);
    if (newClippingHeight > naturalHeight) {
      newClippingHeight = naturalHeight;
      scale = newClippingHeight / newRect.height;
      newClippingWidth = Math.round(newRect.width * scale);
    }

    // try to keep the pointers to the same place on the image
    const p1B = {
      x: pinchStart.pointers[0].pageX - boundingRect.left,
      y: pinchStart.pointers[0].pageY - boundingRect.top,
    };
    const p2B = {
      x: pinchStart.pointers[1].pageX - boundingRect.left,
      y: pinchStart.pointers[1].pageY - boundingRect.top,
    };
    const p1A = {
      x: evt.pointers[0].pageX - boundingRect.left,
      y: evt.pointers[0].pageY - boundingRect.top,
    };
    const p2A = {
      x: evt.pointers[1].pageX - boundingRect.left,
      y: evt.pointers[1].pageY - boundingRect.top,
    };
    // calculate the offsets using each pointer
    const dX1 = (p1B.x * newRect.width - p1A.x * newClippingWidth) / boundingRect.width;
    const dX2 = (p2B.x * newRect.width - p2A.x * newClippingWidth) / boundingRect.width;
    const dY1 = (p1B.y * newRect.height - p1A.y * newClippingHeight) / boundingRect.height;
    const dY2 = (p2B.y * newRect.height - p2A.y * newClippingHeight) / boundingRect.height;
    // use the average of the two
    newRect.left += Math.round((dX1 + dX2) / 2);
    newRect.top += Math.round((dY1 + dY2) / 2);
    newRect.width = newClippingWidth;
    newRect.height = newClippingHeight;
    rect.update(newRect);
  });

  const handlePinchEnd = useListener((evt) => {
    if (!pinchStart) {
      return;
    }
    save();
    setPinchStart(null);
  });
  const handleKeyDown = useListener((evt) => {
    if (hasFocus && evt.keyCode === 27) {   // ESC
      containerRef.current.blur();
    }
  });

  useEffect(() => {
    // attach global mouse handlers when dragging
    if (dragStart) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [ dragStart ]);
  useEffect(() => {
    if (hasFocus) {
      const hammer = new Hammer(containerRef.current);
      const pan = hammer.get('pan').set({
        direction: Hammer.DIRECTION_ALL,
        threshold: 5
      });
      const pinch = hammer.get('pinch').set({
        enable: true
      });
      pinch.recognizeWith(pan);
      hammer.on('panstart', handlePanStart);
      hammer.on('panmove', handlePanMove);
      hammer.on('panend', handlePanEnd);
      hammer.on('pinchstart', handlePinchStart);
      hammer.on('pinchmove', handlePinchMove);
      hammer.on('pinchend', handlePinchEnd);
      return () => {
        hammer.off('panstart', handlePanStart);
        hammer.off('panmove', handlePanMove);
        hammer.off('panend', handlePanEnd);
        hammer.off('pinchstart', handlePinchStart);
        hammer.off('pinchmove', handlePinchMove);
        hammer.off('pinchend', handlePinchEnd)
        hammer.stop(true);
        // Hammer.js doesn't clear this
        hammer.element.style.touchAction = '';
        hammer.destroy();
      };
    }
  }, [ hasFocus ]);
  useEffect(() => {
    // work around change in Chrome 73 regarding passive element
    const options = { passive: false };
    const container = containerRef.current;
    container.addEventListener('mousewheel', handleMouseWheel, options);
    return () => {
      container.removeEventListener('mousewheel', handleMouseWheel, options);
    };
  }, []);

  const containerProps = {
    className: 'image-cropper',
    ... (disabled) ? null : {
      tabIndex: 0,
      onMouseDown: handleMouseDown,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    }
  };
  const imageProps = {
    url,
    clippingRect: rect.current,
    onLoad,
  };
  const View = (vector) ? VectorView : BitmapView;
  return (
    <div ref={containerRef} {...containerProps}>
      <View ref={imageRef} {...imageProps} />
    </div>
  );
});

/**
 * Keep clipping rect from going outside of the image
 *
 * @param  {Object} clippingRect
 * @param  {Number} imageWidth
 * @param  {Number} imageHeight
 */
function constrainPosition(clippingRect, imageWidth, imageHeight) {
  if (clippingRect.left < 0) {
    clippingRect.left = 0;
  } else if (clippingRect.left + clippingRect.width > imageWidth) {
    clippingRect.left = imageWidth - clippingRect.width;
  }
  if (clippingRect.top < 0) {
    clippingRect.top = 0;
  } else if (clippingRect.top + clippingRect.height > imageHeight) {
    clippingRect.top = imageHeight - clippingRect.height;
  }
}

ImageCropper.defaultProps = {
  vector: false,
};
