var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var StoryTypes = require('objects/types/story-types');

module.exports = StoryEmblem;

require('./story-emblem.scss');

function StoryEmblem(props) {
    var type = props.story.type;
    var className = 'story-emblem';
    if (_.includes(StoryTypes.git, type)) {
        className += ' git';
    } else {
        return null;
    }
    var Icon = StoryTypes.icons[type];
    if (type === 'issue') {
        var state = props.story.details.state;
        Icon = StoryTypes.icons[type + '.' + state];
    }
    if (!Icon) {
        return null;
    }
    return (
        <div className={className}>
            <Icon className={type} />
        </div>
    );
}

StoryEmblem.propTypes = {
    story: PropTypes.object.isRequired,
};
