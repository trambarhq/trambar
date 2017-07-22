var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./story-section.scss');

module.exports = React.createClass({
    displayName: 'StorySection',
    propTypes: {
    },

    render: function() {
        var classNames = [ 'story-section' ];
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
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type: tag });
        if (!element) {
            return null;
        }
        if (_.isEmpty(element.props.children)) {
            return null;
        }
        return (
            <div className={tag} {...element.props}>
                {element.props.children}
            </div>
        );
    },
});
