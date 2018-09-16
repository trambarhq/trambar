import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import PopUpMenu from 'widgets/pop-up-menu';

import './corner-pop-up.scss';

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
        this.setState({ open: false });
        this.components.popUpMenu.close();
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let setters = this.components.setters;
        let handlers = {
            onOpen: this.handleOpen,
            onClose: this.handleClose,
        };
        let dir = (this.state.open) ? 'left' : 'down';
        return (
            <PopUpMenu ref={setters.popUpMenu} className="corner-pop-up" {...handlers} >
                <button>
                    <i className={`fa fa-chevron-circle-${dir}`} />
                </button>
                <menu>
                    {this.props.children}
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
        this.setState({ open: true });
        if (this.props.onOpen) {
            this.props.onOpen({
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
        this.setState({ open: false });
        if (this.props.onClose) {
            this.props.onClose({
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
