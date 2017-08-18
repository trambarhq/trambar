var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./tooltip.scss');

module.exports = React.createClass({
    displayName: 'Tooltip',

    getInitialState: function() {
        return {
            open: false,
        };
    },

    render: function() {
        var className = 'tooltip';
        if (this.props.className) {
            className = className + ' ' + this.props.className;
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
            <div className="window">
                {window.props.children}
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
        this.setState({ open: !this.state.open });
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
});
