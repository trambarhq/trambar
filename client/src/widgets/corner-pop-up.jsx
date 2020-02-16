import React from 'react';

// widgets
import PopUpMenu from './pop-up-menu.jsx';

import './corner-pop-up.scss';

/**
 * A button that brings up a pop-up menu when clicked. Children given to the
 * component will be the menu's contents.
 */
function CornerPopUp(props) {
  const { open, children } = props;
  const dir = (open) ? 'left' : 'down';
  return (
    <PopUpMenu className="corner-pop-up" {...props} >
      <button>
        <i className={`fa fa-chevron-circle-${dir}`} />
      </button>
      <menu>
        {children}
      </menu>
    </PopUpMenu>
  );
}

export {
  CornerPopUp as default,
  CornerPopUp,
};
