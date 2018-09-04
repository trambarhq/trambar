import _ from 'lodash';
import React from 'react';
import StoryTypes from 'objects/types/story-types';

import './story-emblem.scss';

function StoryEmblem(props) {
    if (_.includes(props.story.tags, '#yippeekiyay')) {
        return (
            <div className="story-emblem die-hard">
                <img src={require('explosion.gif')} />
            </div>
        );
    }

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

export {
    StoryEmblem as default,
    StoryEmblem,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryEmblem.propTypes = {
        story: PropTypes.object.isRequired,
    };
}
