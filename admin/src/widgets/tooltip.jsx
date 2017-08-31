var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./tooltip.scss');

module.exports = React.createClass({
    displayName: 'Tooltip',
    propTypes: {
        upward: PropTypes.bool,
        disabled: PropTypes.bool,
        ignoreClicks: PropTypes.bool,
    },

    getInitialState: function() {
        return {
            open: false,
            live: hasContents(this.props),
        };
    },

    componentWillReceiveProps: function(nextProps) {
        var live = hasContents(nextProps);
        if (this.state.live !== live || this.props.disabled !== nextProps.disabled) {
            var open = this.state.open && live && !nextProps.disabled;
            this.setState({ live, open });
        }
    },

    render: function() {
        var className = 'tooltip';
        if (this.state.live) {
            className += ' live';
        }
        if (this.props.upward) {
            className += ' upward';
        }
        if (this.props.className) {
            className += ' ' + this.props.className;
        }
        return (
            <div ref="container" className={className}>
                {this.renderLabel()}
                {this.renderWindow()}
            </div>
        );
    },

    renderLabel: function() {
        var inline = this.findElement('inline');
        return (
            <span className="label" onClick={this.handleLabelClick}>
                {inline.props.children}
            </span>
        );
    },

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

    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.open !== this.state.open) {
            if (this.state.open) {
                document.addEventListener('mousedown', this.handleMouseDown);
            } else {
                document.removeEventListener('mousedown', this.handleMouseDown);
            }
        }
    },

    componentWillUnmount: function() {
        if (this.state.open) {
            document.removeEventListener('mousedown', this.handleMouseDown);
        }
    },

    findElement: function(tagName) {
        var children = React.Children.toArray(this.props.children);
        return _.find(children, { type: tagName });
    },

    handleLabelClick: function(evt) {
        if (this.state.live && !this.props.disabled) {
            this.setState({ open: !this.state.open });
        }
    },

    handleMouseDown: function(evt) {
        var inside = false;
        var container = this.refs.container;
        for (var n = evt.target; n; n = n.parentNode) {
            if (n === container) {
                inside = true;
                break;
            }
        }
        if (!inside) {
            this.setState({ open: false });
        }
    },

    handleWindowClick: function(evt) {
        if (!this.props.ignoreClicks) {
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
