var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

require('./tooltip.scss');

module.exports = React.createClass({
    displayName: 'Tooltip',
    propTypes: {
        upward: PropTypes.bool,
        leftward: PropTypes.bool,
        disabled: PropTypes.bool,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            container: HTMLElement,
        });
        return {
            open: false,
            live: hasContents(this.props),
        };
    },

    /**
     * Update state when props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var live = hasContents(nextProps);
        if (this.state.live !== live || this.props.disabled !== nextProps.disabled) {
            var open = this.state.open && live && !nextProps.disabled;
            this.setState({ live, open });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var className = 'tooltip';
        if (this.state.live && !this.props.disabled) {
            className += ' live';
        }
        if (this.props.upward) {
            className += ' upward';
        }
        if (this.props.leftward) {
            className += ' leftward';
        }
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        return (
            <div ref={setters.container} className={className}>
                {this.renderLabel()}
                {this.renderWindow()}
            </div>
        );
    },

    /**
     * Render label
     *
     * @return {ReactElement}
     */
    renderLabel: function() {
        var inline = this.findElement('inline');
        return (
            <span className="label" onClick={this.handleLabelClick}>
                {inline.props.children}
            </span>
        );
    },

    /**
     * Render pop-up
     *
     * @return {ReactElement|null}
     */
    renderWindow: function() {
        if (!this.state.open) {
            return null;
        }
        var window = this.findElement('window');
        return (
            <div className="window-container" onClick={this.handleWindowClick}>
                <div className="window">
                    {window.props.children}
                </div>
            </div>
        );
    },

    /**
     * Add/remove handlers depending on whether the tooltip is shown
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.open !== this.state.open) {
            if (this.state.open) {
                document.addEventListener('mousedown', this.handleMouseDown);
                document.addEventListener('keydown', this.handleKeyDown);
            } else {
                document.removeEventListener('mousedown', this.handleMouseDown);
                document.removeEventListener('keydown', this.handleKeyDown);
            }
        }
    },

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount: function() {
        if (this.state.open) {
            document.removeEventListener('mousedown', this.handleMouseDown);
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    },

    /**
     * Look for child by tag name
     *
     * @param  {String} tagName
     *
     * @return {ReactElement}
     */
    findElement: function(tagName) {
        var children = React.Children.toArray(this.props.children);
        return _.find(children, { type: tagName });
    },

    /**
     * Called when a label is clicked
     *
     * @param  {Event} evt
     */
    handleLabelClick: function(evt) {
        if (this.state.live && !this.props.disabled) {
            this.setState({ open: !this.state.open });
        }
    },

    /**
     * Called when a mouse button is pressed
     *
     * @param  {Event} evt
     */
    handleMouseDown: function(evt) {
        if (!isInside(evt.target, this.components.container)) {
            this.setState({ open: false });
        }
    },

    /**
     * Called when a key is pressed
     *
     * @param  {Event} evt
     */
    handleKeyDown: function(evt) {
        if (evt.keyCode === 27) {
            this.setState({ open: false });
        }
    }
});

function hasContents(props) {
    var children = React.Children.toArray(props.children);
    var window = _.find(children, { type: 'window' });
    if (window) {
        if (React.Children.count(window.props.children) > 0) {
            return true;
        }
    }
    return false;
}

function isInside(element, container) {
    for (var n = element; n; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}
