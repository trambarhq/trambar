import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

import './overlay.scss';

/**
 * A component for displaying pop-up contents whose HTML nodes aren't contained
 * in the HTML node of the parent.
 *
 * @extends {PureComponent}
 */
class Overlay extends PureComponent {
    static displayName = 'Overlay';

    constructor(props) {
        super(props);
        this.state = {
            contents: null,
            rendering: false,
            transitioning: false,
        };
    }

    static getDerivedStateFromProps(props, state) {
        // save contents in state if show = true, so that we don't need them
        // when show become false
        let { show, children } = props;
        let { rendering } = state;
        if (show) {
            return {
                contents: children,
                rendering: true,
                transitioning: !rendering
            };
        }
        return null;
    }

    getPortalDestination() {
        let node = document.getElementById('overlay');
        if (!node) {
            let app = document.getElementById('application');
            node = document.createElement('DIV');
            node.id = 'overlay';
            app.appendChild(node);
        }
        return node;
    }

    /**
     * Don't render anything
     */
    render() {
        let { contents, rendering, transitioning } = this.state;
        let dest = this.getPortalDestination();
        if (rendering) {
            let { className, show, onBackgroundClick, ...containerProps } = this.props;
            containerProps.className = 'overlay';
            if (show && !transitioning) {
                containerProps.className += ' show';
            } else {
                containerProps.className += ' hide';
            }
            if (className) {
                containerProps.className += ' ' + className;
            }
            containerProps.onClick = this.handleClick;
            containerProps.onKeyDown = this.handleKeyDown;
            containerProps.onTouchMove = this.handleTouchMove;
            containerProps.onTransitionEnd = this.handleTransitionEnd;
            let overlay = (
                <div {...containerProps}>
                    <div className="background" />
                    <div className="foreground">{contents}</div>
                </div>
            );
            return ReactDOM.createPortal(overlay, dest);
        } else {
            return ReactDOM.createPortal(null, dest);
        }
    }

    componentDidMount() {
        let { rendering } = this.state;
        if (rendering) {
            this.preserveKeyboardFocus();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        let { rendering, transitioning } = this.state;
        if (rendering && !prevState.rendering) {
            this.preserveKeyboardFocus();
            if (transitioning) {
                this.setState({ transitioning: false });
            }
        } else if (!rendering && prevState.rendering) {
            this.restoreKeyboardFocus();
        }
    }

    componentWillUnmount() {
        this.restoreKeyboardFocus();
    }

    /**
     * Remember which element had keyboard focus, then remove it
     */
    preserveKeyboardFocus() {
        let el = document.activeElement;
        if (el && el !== document.body) {
            this.originalFocusElement = el;
            el.blur();
        } else {
            this.originalFocusElement = null;
        }
    }

    /**
     * Restore keyboard focus
     */
    restoreKeyboardFocus() {
        if (this.originalFocusElement) {
            this.originalFocusElement.focus();
            this.originalFocusElement = null;
        }
    }

    /**
     * Called when user clicks somewhere
     *
     * @param  {Event} evt
     */
    handleClick = (evt) => {
        if (evt.button !== 0) {
            return;
        }
        let { onBackgroundClick } = this.props;
        let targetClass = evt.target.className;
        if (targetClass === 'foreground' || targetClass === 'background') {
            if (onBackgroundClick) {
                onBackgroundClick(evt);
            }
        }
    }

    /**
     * Called when user moves finger across touch screen
     *
     * @param  {Event} evt
     */
    handleTouchMove = (evt) => {
        // prevent scrolling of contents underneath
        let targetNode = evt.target;
        let scrollableNode = null;
        for (let p = targetNode; p && p !== this.containerNode; p = p.parentNode) {
            let style = getComputedStyle(p);
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
    }

    /**
     * Called when user hits a key on the keyboard
     *
     * @param  {Event} evt
     */
    handleKeyDown = (evt) => {
        let { onBackgroundClick } = this.props;
        if (evt.keyCode === 27) {
            if (onBackgroundClick) {
                onBackgroundClick(evt);
            }
        }
    }

    /**
     * Remove the container once the dialog box has faded out
     *
     * @param  {TransitionEvent} evt
     */
    handleTransitionEnd = (evt) => {
        let { show } = this.props;
        if (evt.propertyName === 'opacity') {
            if (!show) {
                this.setState({ contents: null, rendering: false });
            }
        }
    }
}

export {
    Overlay as default,
    Overlay,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Overlay.propTypes = {
        className: PropTypes.string,
        show: PropTypes.bool,
        onBackgroundClick: PropTypes.func,
    };
}
