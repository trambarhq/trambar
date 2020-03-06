import _ from 'lodash';
import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import { useListener, useStickySelection } from 'relaks';

import './autosize-text-area.scss';

/**
 * A text area that automatically expands its height to accommodate the text
 * within it.
 */
export const AutosizeTextArea = React.forwardRef((props, ref) => {
  const { value, style, ...otherProps } = props;
  const [ requiredHeight, setRequiredHeight ] = useState();
  const actualRef = useRef();
  const shadowRef = useRef();

  useImperativeHandle(ref, () => {
    return actualRef.current;
  }, [ actualRef.current ]);

  const handleResize = useListener((evt) => {
    const oHeight = shadowRef.current.offsetHeight;
    const sHeight = shadowRef.current.scrollHeight;
    const cHeight = shadowRef.current.clientHeight;
    const aHeight = actualRef.current.offsetHeight;
    const requiredHeightAfter = sHeight + (oHeight - cHeight) + 1;
    if (requiredHeight !== requiredHeightAfter) {
      if (aHeight > requiredHeightAfter && aHeight > requiredHeight) {
        // don't apply the new height if it's the textarea is taller than
        // expected--i.e. the user has manually resized it
        return;
      }
      setRequiredHeight(requiredHeightAfter);
    }
  });

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  useEffect(handleResize, [ value ]);
  useStickySelection([ actualRef ]);

  const stylePlus = { height: requiredHeight, ...style };
  return (
    <div className="autosize-text-area">
      <textarea ref={shadowRef} style={stylePlus} value={value} className="shadow" readOnly />
      <textarea ref={actualRef} style={stylePlus} value={value} {...otherProps} />
    </div>
  );
});
