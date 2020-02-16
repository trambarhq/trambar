import React, { useState, useRef, useEffect } from 'react';
import { useListener } from 'relaks';

import './collapsible-container.scss';

/**
 * A HTML container that can collapse to nothing.
 */
function CollapsibleContainer(props) {
  const { open, animateIn, children } = props;
  const [ state, setState ] = useState({
    contents: null,
    contentHeight: undefined,
  });
  const contentsRef = useRef();

  const handleTransitionEnd = useListener(() => {
    if (!open) {
      setState({ contents: null, contentHeight: 0 });
    }
  });

  const updateState = useListener(() => {
    if (open) {
      const contentHeight = getContentHeight(contentsRef.current);
      if (state.contents !== contents || state.contentHeight !== contentHeight) {
        setState({ contents, contentHeight });
      }
    }
  });
  useEffect(() => {
    updateState();
    const timeout = setTimeout(updateState, 10);
    return () => {
      clearTimeout(timeout);
    }
  });

  let contents, style;
  if (open) {
    contents = children;
    if (state.contentHeight === undefined && animateIn) {
      style = { height: 0 };
    } else {
      style = { height: state.contentHeight };
    }
  } else {
    contents = state.contents;
    style = { height: 0 };
  }
  return (
    <div className="collapsible-container" style={style} onTransitionEnd={handleTransitionEnd}>
      <div ref={contentsRef} className="collapsible-contents">
        {contents}
      </div>
    </div>
  );

}

function getContentHeight(div) {
  let height = div.offsetHeight;
  // find nexted collapsible containers
  const others = div.getElementsByClassName('collapsible-container');
  for (let other of others) {
    // remove the container's current height
    height -= other.offsetHeight;
    // then add its eventual height when transition completes
    // (zero or height of its contents)
    if (parseInt(other.style.height) > 0) {
      const contents = other.children[0];
      height += contents.offsetHeight;
    }
  }
  return height;
}

export {
  CollapsibleContainer as default,
  CollapsibleContainer,
};
