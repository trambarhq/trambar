import React, { PureComponent } from 'react';
import ComponentRefs from 'common/utils/component-refs.mjs';

// widgets
import PopUpMenu from './pop-up-menu.jsx';

import './corner-pop-up.scss';

/**
 * A button that brings up a pop-up menu when clicked. Children given to the
 * component will be the menu's contents.
 *
 * @extends PureComponent
 */
class CornerPopUp extends PureComponent {
    static displayName = 'CornerPopUp';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            popUpMenu: PopUpMenu,
        });
        this.state = {
            open: false
        };
    }

    /**
     * Close the pop-up menu
     */
    close() {
        let { popUpMenu } = this.components;
        this.setState({ open: false });
        popUpMenu.close();
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { children } = this.props;
        let { setters } = this.components;
        let { open } = this.state;
        let handlers = {
            onOpen: this.handleOpen,
            onClose: this.handleClose,
        };
        let dir = (open) ? 'left' : 'down';
        return (
            <PopUpMenu ref={setters.popUpMenu} className="corner-pop-up" {...handlers} >
                <button>
                    <i className={`fa fa-chevron-circle-${dir}`} />
                </button>
                <menu>
                    {children}
                </menu>
            </PopUpMenu>
        );
    }

    /**
     * Called when user opens the menu
     *
     * @param  {Object} evt
     */
    handleOpen = (evt) => {
        let { onOpen } = this.props;
        this.setState({ open: true });
        if (onOpen) {
            onOpen({
                type: open,
                target: this,
            });
        }
    }

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleClose = (evt) => {
        let { onClose } = this.props;
        this.setState({ open: false });
        if (onClose) {
            onClose({
                type: open,
                target: this,
            });
        }
    }
}

export {
    CornerPopUp as default,
    CornerPopUp,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CornerPopUp.ropType = {
        onOpen: PropTypes.func,
        onClose: PropTypes.func,
    };
}
