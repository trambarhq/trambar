import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';

import './overlay.scss';

class OverlayProxy extends PureComponent {
    static displayName = 'OverlayProxy';

    static active = false;

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
     */
    componentDidUpdate(prevProps) {
        let { show, children } = this.props;
        if (prevProps.show !== show) {
            if (show) {
                this.show();
            } else {
                this.hide();
            }
        } else if (prevProps.children !== children) {
            if (show) {
                this.redraw(this.shown);
            }
        }
    }

    /**
     * Remove overlay element on unmount
     */
    componentWillUnmount() {
        this.hide();
    }

    /**
     * Insert overlay element into document body
     */
    show() {
        if (!this.containerNode) {
            let app = document.getElementById('application');
            this.containerNode = document.createElement('DIV');
            app.appendChild(this.containerNode);
            app.addEventListener('keydown', this.handleKeyDown);

            let el = document.activeElement;
            if (el && el !== document.body) {
                this.originalFocusElement = el;
                el.blur();
            } else {
                this.originalFocusElement = null;
            }
        } else {
            if (this.containerRemovalTimeout) {
                clearTimeout(this.containerRemovalTimeout);
                this.containerRemovalTimeout = 0;
            }
        }
        this.redraw(false);
        this.shown = false;
        setTimeout(() => {
            this.shown = true;
            this.redraw(this.shown);
        }, 10);
        OverlayProxy.active = true;
    }

    /**
     * Redraw overlay element
     *
     * @param  {Boolean} shown
     */
    redraw(shown) {
        let props = {
            show: shown,
            onClick: this.handleClick,
            onTouchMove: this.handleTouchMove,
            children: this.props.children
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
    }

    /**
     * Transition out, then remove overlay element
     */
    hide() {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                let app = document.getElementById('application');
                ReactDOM.unmountComponentAtNode(this.containerNode);
                app.removeChild(this.containerNode);
                app.removeEventListener('keydown', this.handleKeyDown);
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 500);

            if (this.originalFocusElement) {
                this.originalFocusElement.focus();
                this.originalFocusElement = null;
            }
        }
        this.shown = false;
        this.redraw(this.shown);
        OverlayProxy.active = false;
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
