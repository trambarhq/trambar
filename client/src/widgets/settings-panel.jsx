var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./settings-panel.scss');

module.exports = React.createClass({
    displayName: 'SettingsPanel',
    propTypes: {
    },

    render: function() {
        var className = 'settings-panel';
        if (this.props.className) {
            className += ` ${this.props.className}`;
        }
        return (
            <div className={className}>
                {this.renderPart('header')}
                {this.renderPart('subheader')}
                {this.renderPart('body')}
                {this.renderPart('footer')}
            </div>
        );
    },

    renderPart: function(tag) {
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type: tag });
        if (!element) {
            return null;
        }
        return (
            <div className={tag} {...element.props}>
                {element.props.children}
            </div>
        );
    },
});
