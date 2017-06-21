var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./user-section.scss');

module.exports = React.createClass({
    displayName: 'UserSection',
    propTypes: {
    },

    render: function() {
        var classNames = [ 'user-section' ];
        if (this.props.className) {
            classNames.push(this.props.className)
        }
        return (
            <div className={classNames.join(' ')}>
                {this.renderPart('header')}
                {this.renderPart('subheader')}
                {this.renderPart('body')}
                {this.renderPart('footer')}
            </div>
        );
    },

    renderPart: function(tag) {
        var contents = this.findContents(tag);
        if (!contents) {
            return null;
        }
        return <div className={tag}>{contents}</div>;
    },

    findContents: function(type) {
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type });
        if (element) {
            return element.props.children;
        }
    },
});
