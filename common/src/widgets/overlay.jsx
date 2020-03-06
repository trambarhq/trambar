import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useListener, useLastAcceptable } from 'relaks';

import './overlay.scss';

/**
 * A component for displaying pop-up contents whose HTML nodes aren't contained
 * in the HTML node of the parent.
 */
export function Overlay(props) {
  const { className, show, children, onBackgroundClick, ...otherProps } = props;
  const [ container, setContainer ] = useState(null);
  const [ rendering, setRendering ] = useState(show);
  const [ transitioning, setTransitioning ] = useState(false);
  const contents = useLastAcceptable(children, !(rendering && !show));

  const handleClick = useListener((evt) => {
    if (evt.button !== 0) {
      return;
    }
    const targetClass = evt.target.className;
    if (targetClass === 'foreground' || targetClass === 'background') {
      if (onBackgroundClick) {
        onBackgroundClick(evt);
      }
    }
  });
  const handleTouchMove = useListener((evt) => {
    // prevent scrolling of contents underneath
    const targetNode = evt.target;
    let scrollableNode = null;
    for (let p = targetNode; p && p !== window && p !== container; p = p.parentNode) {
      const style = getComputedStyle(p);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        if (p.scrollHeight > p.clientHeight) {
          scrollableNode = p;
        }
        break;
      }
    }
    if (!scrollableNode) {
      evt.preventDefault();
    }
  });
  const handleKeyDown = useListener((evt) => {
    if (evt.keyCode === 27) {   // ESC
      if (onBackgroundClick) {
        onBackgroundClick(evt);
      }
    }
  });
  const handleTransitionEnd = useListener((evt) => {
    if (evt.propertyName === 'opacity') {
      if (!show) {
        setRendering(false);
      }
    }
  });

  useEffect(() => {
    if (rendering) {
      const frontEnd = document.getElementById('react-container');
      const root = frontEnd.firstChild;
      const node = document.createElement('DIV');
      root.appendChild(node);
      setContainer(node);
      return () => {
        root.removeChild(node);
        setContainer(null);
        setTransitioning(false);
      };
    }
  }, [ rendering ]);
  useEffect(() => {
    if (rendering) {
      // save focus
      const el = document.activeElement;
      if (el && el !== document.body) {
        el.blur();
      }
      return () => {
        // restore it
        if (el && el !== document.body) {
          el.focus();
        }
      };
    }
  }, [ rendering ]);
  useEffect(() => {
    if (show) {
      if (!rendering) {
        setRendering(true);
      } else if (!transitioning) {
        setTimeout(() => {
          setTransitioning(true);
        }, 25);
      }
    }
  }, [ show, rendering, container, transitioning ]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  if (container) {
    const classNames = [ 'overlay' ];
    if (show && transitioning) {
      classNames.push('show');
    } else {
      classNames.push('hide');
    }
    if (className) {
      classNames.push(className);
    }
    const containerProps = {
      className: classNames.join(' '),
      onClick: handleClick,
      onTouchMove: handleTouchMove,
      onTransitionEnd: handleTransitionEnd,
      ...otherProps
    };
    const overlay = (
      <div {...containerProps}>
        <div className="background" />
        <div className="foreground">{contents}</div>
      </div>
    );
    return ReactDOM.createPortal(overlay, container);
  } else {
    return null;
  }
}

Overlay.create = function(Component) {
  const newComponent = function (props) {
    const { show, onCancel, onClose } = props;
    const overlayProps = { show, onBackgroundClick: onCancel || onClose };
    const contents = (show) ? <Component {...props} /> : undefined;
    return <Overlay {...overlayProps}>{contents}</Overlay>;
  };

  let componentName = 'Contents';
  if (typeof(Component) === 'function') {
    if (Component.name) {
      componentName = Component.name;
    } else {
      Object.defineProperty(Component, 'name', {
        value: componentName,
        writable: false
      });
    }
  } else if (Component.displayName) {
    componentName = Component.displayName;
  }

  // set display name
  Object.defineProperty(newComponent, 'name', {
    value: `Overlay(${componentName})`,
    writable: false
  });
  return newComponent;
};
