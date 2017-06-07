var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

require('./story-section.scss');

module.exports = React.createClass({
    displayName: 'StorySection',
    propTypes: {
    },

    render: function() {
        return (
            <div className="story-section">
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
