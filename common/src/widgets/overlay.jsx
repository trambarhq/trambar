import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

import './overlay.scss';

/**
 * A component for displaying pop-up contents whose HTML nodes aren't contained
 * in the HTML node of the parent.
 *
 * @extends {PureComponent}
 */
class OverlayProxy extends PureComponent {
    static displayName = 'OverlayProxy';
    static active = false;

    constructor(props) {
        super(props);
        this.state = {};
    }

    static getDerivedStateFromProps(props, state) {
        // save contents in state if show = true, so that we don't need them
        // when show become false
        let { show, children } = props;
        if (show) {
            return { contents: children };
        }
        return null;
    }

    /**
     * Don't render anything
     */
    render() {
        return null;
    }

    /**
     * Insert overlay element into document body on mount
     */
    componentDidMount() {
        let { show } = this.props;
        if (show) {
            this.show();
        }
    }

    /**
     * Redraw the overlay element when props change
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { show } = this.props;
        let { contents } = this.state;
        if (prevProps.show !== show) {
            if (show) {
                this.show();
            } else {
                this.hide();
            }
        } else if (prevState.contents !== contents) {
            if (show) {
                this.redraw(this.shown);
            }
        }
    }

    /**
     * Remove overlay element on unmount
     */
    componentWillUnmount() {
        this.restorePreviousFocus();
        this.removeContainer();
        OverlayProxy.active = false;
    }

    /**
     * Insert overlay element into document body
     */
    show() {
        // draw overlay as hidden initially, then change class to show to
        // trigger CSS transition
        this.createContainer();
        this.redraw(false);
        this.shown = false;
        setTimeout(() => {
            this.shown = true;
            this.redraw(this.shown);
        }, 10);
        OverlayProxy.active = true;

        // remember element that current has keyboard focus
        let el = document.activeElement;
        if (el && el !== document.body) {
            this.originalFocusElement = el;
            el.blur();
        } else {
            this.originalFocusElement = null;
        }
    }

    /**
     * Redraw overlay element
     *
     * @param  {Boolean} shown
     */
    redraw(shown) {
        if (!this.containerNode) {
            return;
        }
        let { contents } = this.state;
        let props = {
            show: shown,
            onClick: this.handleClick,
            onTouchMove: this.handleTouchMove,
            onTransitionEnd: this.handleTransitionEnd,
            children: contents,
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
    }

    /**
     * Transition out, then remove overlay element
     */
    hide() {
        this.restorePreviousFocus();
        this.shown = false;
        this.redraw(this.shown);
        OverlayProxy.active = false;
    }

    restorePreviousFocus() {
        if (this.originalFocusElement) {
            this.originalFocusElement.focus();
            this.originalFocusElement = null;
        }
    }

    /**
     * Create container node and attach keyboard handler.
     */
    createContainer() {
        if (!this.containerNode) {
            let app = document.getElementById('application');
            this.containerNode = document.createElement('DIV');
            app.appendChild(this.containerNode);
            app.addEventListener('keydown', this.handleKeyDown);
        }
    }

    /**
     * Unmount contents and remove container node.
     */
    removeContainer() {
        if (this.containerNode) {
            let app = document.getElementById('application');
            ReactDOM.unmountComponentAtNode(this.containerNode);
            app.removeChild(this.containerNode);
            app.removeEventListener('keydown', this.handleKeyDown);
            this.containerNode = null;
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
                this.removeContainer();
                this.setState({ contents: null });
            }
        }
    }
}

function Overlay(props) {
    let containerProps = _.omit(props, 'className', 'children', 'show');
    containerProps.className = 'overlay';
    if (props.show) {
        containerProps.className += ' show';
    } else {
        containerProps.className += ' hide';
    }
    if (props.className) {
        containerProps.className += ' ' + props.className;
    }
    return (
        <div {...containerProps}>
            <div className="background" />
            <div className="foreground">{props.children}</div>
        </div>
    );
}

OverlayProxy.defaultProps = {
    show: false
};

export {
    OverlayProxy as default,
    OverlayProxy as Overlay,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    OverlayProxy.propTypes = {
        className: PropTypes.string,
        show: PropTypes.bool,
        onBackgroundClick: PropTypes.func,
    };
}
