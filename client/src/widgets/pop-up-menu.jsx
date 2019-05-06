import _ from 'lodash';
import React, { PureComponent, Children } from 'react';
import ReactDOM from 'react-dom';
import ScrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import ComponentRefs from 'common/utils/component-refs.mjs';
import TopLevelMouseTrap from 'common/utils/top-level-mouse-trap.mjs';

import './pop-up-menu.scss';

/**
 * A button that opens a pop-up menu when clicked.
 *
 * @extends PureComponent
 */
class PopUpMenu extends PureComponent {
    static displayName = 'PopUpMenu';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
            menu: HTMLDivElement,
        });
        this.state = {
            open: false,
        };
    }

    /**
     * Find child by tag name
     *
     * @return {tagName}
     */
    getContents(tagName) {
        let { children } = this.props;
        children = Children.toArray(children);
        let child = _.find(children, { type: tagName });
        if (child) {
            return child.props.children;
        }
    }

    /**
     * Close menu
     */
    close() {
        return this.setState({ open: false });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { className } = this.props;
        let { open } = this.state;
        let { setters } = this.components;
        let props = {
            ref: setters.container,
            className: 'pop-up-menu' + ((className) ? ` ${className}` : ''),
            onMouseDown: this.handleMouseDown,
        }
        if (open) {
            props.className += ' open';
        }
        return (
            <span {...props}>
                {this.renderButton()}
                {this.renderMenu()}
            </span>
        );
    }

    /**
     * Render button for opening the menu
     *
     * @return {ReactElement}
     */
    renderButton() {
        let { disabled } = this.props;
        let className = 'button';
        if (!disabled) {
            className += ' active';
        }
        return (
            <span className={className} onClick={this.handleButtonClick}>
                {this.getContents('button')}
            </span>
        );
    }

    /**
     * Render the menu if it's open
     *
     * @return {ReactElement}
     */
    renderMenu() {
        let { className, popOut } = this.props;
        let { open } = this.state;
        let { setters, container } = this.components;
        if (!open || !container) {
            return null;
        }
        if (popOut) {
            let page = getPageNode();
            let nodePos = getRelativePosition(container, page);
            let style = {
                position: 'absolute',
                left: nodePos.left + container.offsetWidth,
                top: nodePos.top,
            };
            className = 'pop-up-menu' + ((className) ? ` ${className}` : '');
            let element = (
                <div className={className} style={style}>
                    <div className="container">
                        <div ref={setters.menu} className="menu" onClick={this.handleMenuClick}>
                            {this.getContents('menu')}
                        </div>
                    </div>
                </div>
            );
            this.addPopOutContainer();
            return ReactDOM.createPortal(element, this.popOutContainer);
        } else {
            return (
                <div className="container">
                    <div ref={setters.menu} className="menu">
                        {this.getContents('menu')}
                    </div>
                </div>
            );
        }
    }

    /**
     * Add/remove document-level mousedown handler when menu opens and closes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { open } = this.state;
        let { menu } = this.components;
        if (!prevState.open && open) {
            TopLevelMouseTrap.addEventListener('mousedown', this.handleTopLevelMouseDown);
        } else if (prevState.open && !open) {
            TopLevelMouseTrap.removeEventListener('mousedown', this.handleTopLevelMouseDown);
        }
        if (open && !prevProps.open) {
            setTimeout(() => {
                if (menu) {
                    let options = {
                        behavior: 'smooth',
                        scrollMode: 'if-needed',
                        block: 'end',
                    };
                    ScrollIntoViewIfNeeded(menu, options);
                }
            }, 50);
        }
    }

    /**
     * Remove mousedown handler on unmount
     */
    componentWillUnmount() {
        TopLevelMouseTrap.removeEventListener('mousedown', this.handleTopLevelMouseDown);
        this.removePopOutContainer();
    }

    /**
     * Add pop-out container, used when menu cannot be positioned relatively
     * due to parent container having overflow of hidden or scroll
     */
    addPopOutContainer() {
        if (!this.popOutContainer) {
            let page = getPageNode();
            this.popOutContainer = document.createElement('DIV');
            this.popOutContainer.style.left = '0';
            this.popOutContainer.style.top = '0';
            page.appendChild(this.popOutContainer);
            this.popOutContainer.style.position = 'absolute';
        }
    }

    /**
     * Remove pop-out container if there's one
     */
    removePopOutContainer() {
        if (this.popOutContainer) {
            this.popOutContainer.parentNode.removeChild(this.popOutContainer);
            this.popOutContainer = null;
        }
    }

    /**
     * Trigger onOpen or onClose event
     *
     * @param  {Boolean} open
     */
    triggerEvent(open) {
        let { onOpen, onClose } = this.props;
        if (open) {
            if (onOpen) {
                onOpen({
                    type: 'open',
                    target: this,
                });
            }
        } else {
            if (onClose) {
                onClose({
                    type: 'close',
                    target: this,
                });
            }
        }
    }

    /**
     * Called when user clicks the corner button
     *
     * @param  {Event} evt
     */
    handleButtonClick = (evt) => {
        let { disabled } = this.props;
        let { open } = this.state;
        if (!disabled) {
            this.triggerEvent(!open);
            this.setState({ open: !open });
        }
    }

    /**
     * Stop event propagation when the menu itself is clicked so the handler
     * below won't close it
     *
     * @param  {Event} evt
     */
    handleMouseDown = (evt) => {
        evt.stopPropagation();
    }

    /**
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleTopLevelMouseDown = (evt) => {
        if (evt.button !== 0) {
            return;
        }
        this.setState({ open: false });
        this.triggerEvent(false);
    }
}

function getRelativePosition(node, container) {
    let rect1 = node.getBoundingClientRect()
    let rect2 = container.getBoundingClientRect();
    let left = rect1.left - rect2.left + container.scrollLeft;
    let top = rect1.top - rect2.top + container.scrollTop;
    return { left, top };
}

function getPageNode() {
    let container = document.getElementById('react-container');
    return container.getElementsByClassName('page-container')[0];
}

PopUpMenu.defaultProps = {
    disabled: false,
    popOut: false,
};

export {
    PopUpMenu as default,
    PopUpMenu,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PopUpMenu.propTypes = {
        disabled: PropTypes.bool,
        popOut: PropTypes.bool,
    };
}
