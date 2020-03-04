import _ from 'lodash';
import React, { useMemo, useRef, useEffect } from 'react';
import { useListener } from 'relaks';
import ReactDOM from 'react-dom';
import ScrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import TopLevelMouseTrap from 'common/utils/top-level-mouse-trap.mjs';

import './pop-up-menu.scss';

/**
 * A button that opens a pop-up menu when clicked.
 */
export function PopUpMenu(props) {
  const { className, children, open, name, disabled, popOut } = props;
  const { onOpen, onClose } = props;
  const containerRef = useRef();
  const menuRef = useRef();
  const popOutContainer = useMemo(() => {
    if (popOut) {
      const node = document.createElement('DIV');
      node.style.left = '0';
      node.style.top = '0';
      node.style.position = 'absolute';
      return node;
    }
  }, [ popOut ]);

  const handleButtonClick = useListener((evt) => {
    if (!disabled) {
      if (!open) {
        if (onOpen) {
          onOpen({ name });
        }
      } else {
        if (onClose) {
          onClose({ name });
        }
      }
    }
  });
  const handleMouseDown = useListener((evt) => {
    // stop event propagation when the menu itself is clicked so the
    // top-level mouse down handler won't close it
    evt.stopPropagation();
  });

  useEffect(() => {
    if (popOutContainer) {
      const page = getPageNode();
      page.appendChild(popOutContainer);
      return () => {
        page.removeChild(popOutContainer);
      };
    }
  }, [ popOutContainer ])
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (menuRef.current) {
          const options = {
            behavior: 'smooth',
            scrollMode: 'if-needed',
            block: 'end',
          };
          ScrollIntoViewIfNeeded(menuRef.current, options);
        }
      }, 50);

      const handleMouseDown = (evt) => {
        if (evt.button !== 0) {
          return;
        }
        if (onClose) {
          onClose({});
        }
      };
      TopLevelMouseTrap.addEventListener('mousedown', handleMouseDown);
      return () => {
        TopLevelMouseTrap.removeEventListener('mousedown', handleMouseDown);
      }
    }
  }, [ open, onClose ])

  const classNames = [ 'pop-up-menu' ];
  if (className) {
    classNames.push(className);
  }
  if (open) {
    classNames.push('open');
  }
  const spanProps = {
    className: classNames.join(' '),
    onMouseDown: handleMouseDown,
  };
  return (
    <span ref={containerRef} {...spanProps}>
      {renderButton()}
      {renderMenu()}
    </span>
  );

  function renderButton() {
    const classNames = [ 'button' ];
    if (!disabled) {
      classNames.join('active');
    }
    const props = {
      className: classNames.join(' '),
      onClick: handleButtonClick,
    };
    return  <span {...props}>{renderContents('button')}</span>;
  }

  function renderMenu() {
    if (!open) {
      return null;
    }
    if (popOut) {
      const page = getPageNode();
      const nodePos = getRelativePosition(containerRef.current, page);
      const classNames = [ 'pop-up-menu' ];
      if (className) {
        classNames.join(className);
      }
      const props = {
        className: classNames.join(' '),
        style: {
          position: 'absolute',
          left: nodePos.left + containerRef.current.offsetWidth,
          top: nodePos.top,
        }
      };
      const element = (
        <div {...props}>
          <div className="container">
            <div ref={menuRef} className="menu" onClick={handleMenuClick}>
              {renderContents('menu')}
            </div>
          </div>
        </div>
      );
      const popOutContainer = addPopOutContainer();
      return ReactDOM.createPortal(element, popOutContainer);
    } else {
      return (
        <div className="container">
          <div ref={menuRef} className="menu">
            {renderContents('menu')}
          </div>
        </div>
      );
    }
  }

  function renderContents(tagName) {
    const list = React.Children.toArray(children);
    let child = _.find(list, { type: tagName });
    if (child) {
      return child.props.children;
    }
  }
}

function getRelativePosition(node, container) {
  const rect1 = node.getBoundingClientRect()
  const rect2 = container.getBoundingClientRect();
  const left = rect1.left - rect2.left + container.scrollLeft;
  const top = rect1.top - rect2.top + container.scrollTop;
  return { left, top };
}

function getPageNode() {
  const container = document.getElementById('react-container');
  return container.getElementsByClassName('page-container')[0];
}

PopUpMenu.defaultProps = {
  open: false,
  disabled: false,
  popOut: false,
};
