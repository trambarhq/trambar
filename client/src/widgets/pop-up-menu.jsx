import _ from 'lodash';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import ScrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import Overlay from 'widgets/overlay';
import ComponentRefs from 'utils/component-refs';

import './pop-up-menu.scss';

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
        let children = React.Children.toArray(this.props.children);
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
        let className = 'pop-up-menu';
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        if (this.state.open) {
            className += ' open';
        }
        return (
            <span className={className}>
                {this.renderButton()}
                {!this.props.popOut ? this.renderMenu() : null}
            </span>
        );
    }

    /**
     * Render button for opening the menu
     *
     * @return {ReactElement}
     */
    renderButton() {
        let className = 'button';
        if (!this.props.disabled) {
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
        if (!this.state.open) {
            return null;
        }
        let setters = this.components.setters;
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
        let node = ReactDOM.findDOMNode(this);
        let page = getPageNode();
        let setters = this.components.setters;
        let nodePos = getRelativePosition(node, page);
        let style = {
            position: 'absolute',
            left: nodePos.left + node.offsetWidth,
            top: nodePos.top,
        };
        let className = 'pop-up-menu';
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
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
        let appContainer = document.getElementById('application');
        if (!prevState.open && this.state.open) {
            appContainer.addEventListener('mousedown', this.handleBodyMouseDown);
            if (this.props.popOut) {
                this.addPopOutContainer();
            }
        } else if (prevState.open && !this.state.open) {
            appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
            if (this.props.popOut) {
                this.removePopOutContainer();
            }
        }

        if (this.state.open && this.props.popOut) {
            this.redrawPopOutMenu();
        }
        if (this.state.open && !prevProps.open) {
            setTimeout(() => {
                let menu = this.components.menu;
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
        if (open) {
            if (this.props.onOpen) {
                this.props.onOpen({
                    type: 'open',
                    target: this,
                });
            }
        } else {
            if (this.props.onClose) {
                this.props.onClose({
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
        if (!this.props.disabled) {
            this.triggerEvent(!this.state.open);
            this.setState({ open: !this.state.open });
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
    let left = node.offsetLeft;
    let top = node.offsetTop;
    for (let p = node.offsetParent; p && p !== container; p = p.offsetParent) {
        left += p.offsetLeft - p.scrollLeft;
        top += p.offsetTop - p.scrollTop;
    }
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
