var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

require('./pop-up-menu.scss');

module.exports = React.createClass({
    displayName: 'PopUpMenu',
    propTypes: {
        disabled: PropTypes.bool,
        popOut: PropTypes.bool,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            disabled: false,
            popOut: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            open: false,
        };
    },

    /**
     * Find child by tag name
     *
     * @return {tagName}
     */
    getContents: function(tagName) {
        var children = React.Children.toArray(this.props.children);
        var child = _.find(children, { type: tagName });
        if (child) {
            return child.props.children;
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var className = 'pop-up-menu';
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        return (
            <span className={className}>
                {this.renderButton()}
                {!this.props.popOut ? this.renderMenu() : null}
            </span>
        );
    },

    /**
     * Render button for opening the menu
     *
     * @return {ReactElement}
     */
    renderButton: function() {
        var className = 'button';
        if (!this.props.disabled) {
            className += ' active';
        }
        return (
            <span className={className} onClick={this.handleButtonClick}>
                {this.getContents('button')}
            </span>
        );
    },

    /**
     * Render the menu if it's open
     *
     * @return {ReactElement}
     */
    renderMenu: function() {
        if (!this.state.open) {
            return null;
        }
        return (
            <div className="container">
                <div className="menu" onClick={this.handleMenuClick}>
                    {this.getContents('menu')}
                </div>
            </div>
        );
    },

    /**
     * Render menu into pop-out container
     */
    redrawPopOutMenu: function() {
        var node = ReactDOM.findDOMNode(this);
        var viewport = getViewportNode();
        var nodePos = getRelativePosition(node, viewport);
        var style = {
            position: 'absolute',
            left: nodePos.left + node.offsetWidth,
            top: nodePos.top,
        };
        var className = 'pop-up-menu';
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        var element = (
            <div className={className} style={style}>
                <div className="container">
                    <div className="menu" onClick={this.handleMenuClick}>
                        {this.getContents('menu')}
                    </div>
                </div>
            </div>
        );
        ReactDOM.render(element, this.popOutContainer);
    },

    /**
     * Add/remove document-level mousedown handler when menu opens and closes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        var appContainer = document.getElementById('app-container');
        if (!prevState.open && this.state.open) {
            appContainer.addEventListener('mousedown', this.handleBodyMouseDown);

            if (this.props.popOut) {
                var viewport = getViewportNode();
                this.popOutContainer = document.createElement('DIV');
                this.popOutContainer.style.left = '0';
                this.popOutContainer.style.top = '0';
                viewport.appendChild(this.popOutContainer);
                this.popOutContainer.style.position = 'absolute';
            }
        } else if (prevState.open && !this.state.open) {
            appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);

            if (this.props.popOut) {
                this.popOutContainer.parentNode.removeChild(this.popOutContainer);
            }
        }

        if (this.state.open && this.props.popOut) {
            this.redrawPopOutMenu();
        }
    },

    /**
     * Remove mousedown handler on unmount
     */
    componentWillUnmount: function() {
        var appContainer = document.getElementById('app-container');
        appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
    },

    /**
     * Trigger onOpen or onClose event
     *
     * @param  {Boolean} open
     */
    triggerEvent: function(open) {
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
    },

    /**
     * Called when user clicks the corner button
     *
     * @param  {Event} evt
     */
    handleButtonClick: function(evt) {
        if (!this.props.disabled) {
            this.triggerEvent(!this.state.open);
            this.setState({ open: !this.state.open });
        }
    },

    /**
     * Called when user clicks on an item in the menu
     *
     * @param  {Event} evt
     */
    handleMenuClick: function(evt) {
        this.setState({ open: false });
        this.triggerEvent(false);
    },

    /**
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleBodyMouseDown: function(evt) {
        var containerNode = ReactDOM.findDOMNode(this);
        var insideMenu = isInside(evt.target, containerNode);
        if (!insideMenu && this.popOutContainer) {
            insideMenu = isInside(evt.target, this.popOutContainer);
        }
        if (!insideMenu) {
            this.setState({ open: false });
        }
    },
});

function isInside(node, container) {
    for (var n = node; n !== document.body.parentNode; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

function getRelativePosition(node, container) {
    var left = node.offsetLeft;
    var top = node.offsetTop;
    for (var p = node.offsetParent; p && p !== container; p = p.offsetParent) {
        left += p.offsetLeft;
        top += p.offsetTop;
    }
    return { left, top };
}

function getViewportNode() {
    var appContainer = document.getElementById('app-container');
    return appContainer.getElementsByClassName('page-view-port')[0];
}
