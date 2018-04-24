var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

var Theme = require('theme/theme');

require('./overlay.scss');

module.exports = React.createClass({
    displayName: 'OverlayProxy',
    propTypes: {
        className: PropTypes.string,
        show: PropTypes.bool,
        onBackgroundClick: PropTypes.func,
    },

    statics: {
        active: false,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            show: false
        };
    },

    /**
     * Don't render anything
     */
    render: function() {
        return null;
    },

    /**
     * Insert overlay element into document body on mount
     */
    componentDidMount: function() {
        if (this.props.show) {
            this.show();
        }
    },

    /**
     * Redraw the overlay element when props change
     *
     * @param  {Object} prevProps
     */
    componentDidUpdate: function(prevProps) {
        if (prevProps.show !== this.props.show) {
            if (this.props.show) {
                this.show();
            } else {
                this.hide();
            }
        } else if (prevProps.children !== this.props.children) {
            if (this.props.show) {
                this.redraw(this.shown);
            }
        }
    },

    /**
     * Remove overlay element on unmount
     */
    componentWillUnmount: function() {
        this.hide();
    },

    /**
     * Insert overlay element into document body
     */
    show: function() {
        if (!this.containerNode) {
            var app = document.getElementById('application');
            this.containerNode = document.createElement('DIV');
            app.appendChild(this.containerNode);
            app.addEventListener('keydown', this.handleKeyDown);
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
        this.constructor.active = true;
    },

    /**
     * Redraw overlay element
     *
     * @param  {Boolean} shown
     */
    redraw: function(shown) {
        var props = {
            show: shown,
            onClick: this.handleClick,
            onTouchMove: this.handleTouchMove,
            children: this.props.children
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
    },

    /**
     * Transition out, then remove overlay element
     */
    hide: function() {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                var app = document.getElementById('application');
                ReactDOM.unmountComponentAtNode(this.containerNode);
                app.removeChild(this.containerNode);
                app.removeEventListener('keydown', this.handleKeyDown);
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 1000);
        }
        this.shown = false;
        this.redraw(this.shown);
        this.constructor.active = false;
    },

    /**
     * Called when user clicks somewhere
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        if (evt.button !== 0) {
            return;
        }
        var targetClass = evt.target.className;
        if (targetClass === 'foreground' || targetClass === 'background') {
            if (this.props.onBackgroundClick) {
                this.props.onBackgroundClick(evt);
            }
        }
    },

    /**
     * Called when user moves finger across touch screen
     *
     * @param  {Event} evt
     */
    handleTouchMove: function(evt) {
        // prevent scrolling of contents underneath
        var targetNode = evt.target;
        var scrollableNode = null;
        for (var p = targetNode; p && p !== this.containerNode; p = p.parentNode) {
            var style = getComputedStyle(p);
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
    },

    /**
     * Called when user hits a key on the keyboard
     *
     * @param  {Event} evt
     */
    handleKeyDown: function(evt) {
        if (evt.keyCode === 27) {
            if (this.props.onBackgroundClick) {
                this.props.onBackgroundClick(evt);
            }
        }
    },
});

function Overlay(props) {
    var containerProps = _.omit(props, 'className', 'children', 'show');
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
