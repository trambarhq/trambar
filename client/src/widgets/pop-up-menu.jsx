import _ from 'lodash';
import React, { PureComponent, Children } from 'react';
import ReactDOM from 'react-dom';
import ScrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import Overlay from 'widgets/overlay';
import ComponentRefs from 'utils/component-refs';

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
        let { className, popOut } = this.props;
        let { open } = this.state;
        className = 'pop-up-menu' + ((className) ? ` ${className}` : '');
        if (open) {
            className += ' open';
        }
        return (
            <span className={className}>
                {this.renderButton()}
                {!popOut ? this.renderMenu() : null}
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
        let { open } = this.state;
        let { setters } = this.components;
        if (!open) {
            return null;
        }
        return (
            <div ref={setters.container} className="container">
                <div ref={setters.menu} className="menu">
                    {this.getContents('menu')}
                </div>
            </div>
        );
    }

    /**
     * Render menu into pop-out container
     */
    redrawPopOutMenu() {
        let { className } = this.props;
        let { setters } = this.components;
        let node = ReactDOM.findDOMNode(this);
        let page = getPageNode();
        let nodePos = getRelativePosition(node, page);
        let style = {
            position: 'absolute',
            left: nodePos.left + node.offsetWidth,
            top: nodePos.top,
        };
        className = 'pop-up-menu' + ((className) ? ` ${className}` : '');
        let element = (
            <div className={className} style={style}>
                <div ref={setters.container} className="container">
                    <div ref={setters.menu} className="menu" onClick={this.handleMenuClick}>
                        {this.getContents('menu')}
                    </div>
                </div>
            </div>
        );
        ReactDOM.render(element, this.popOutContainer);
    }

    /**
     * Add/remove document-level mousedown handler when menu opens and closes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { popOut } = this.props;
        let { open } = this.state;
        let { menu } = this.components;
        let appContainer = document.getElementById('application');
        if (!prevState.open && open) {
            appContainer.addEventListener('mousedown', this.handleBodyMouseDown);
            if (popOut) {
                this.addPopOutContainer();
            }
        } else if (prevState.open && !open) {
            appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
            if (popOut) {
                this.removePopOutContainer();
            }
        }

        if (open && popOut) {
            this.redrawPopOutMenu();
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
        let appContainer = document.getElementById('application');
        appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
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
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleBodyMouseDown = (evt) => {
        if (evt.button !== 0) {
            return;
        }
        if (!Overlay.active) {
            let containerNode = ReactDOM.findDOMNode(this);
            let insideMenu = isInside(evt.target, containerNode);
            if (!insideMenu && this.popOutContainer) {
                insideMenu = isInside(evt.target, this.popOutContainer);
            }
            if (!insideMenu) {
                this.setState({ open: false });
                this.triggerEvent(false);
            }
        }
    }
}

function isInside(node, container) {
    for (let n = node; n !== document.body.parentNode; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

function getRelativePosition(node, container) {
    let rect1 = node.getBoundingClientRect()
    let rect2 = container.getBoundingClientRect();
    let left = rect1.left - rect2.left + container.scrollLeft;
    let top = rect1.top - rect2.top + container.scrollTop;
    return { left, top };
}

function getPageNode() {
    let appContainer = document.getElementById('app-container');
    return appContainer.getElementsByClassName('page-container')[0];
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
