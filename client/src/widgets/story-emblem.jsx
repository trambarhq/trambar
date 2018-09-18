import _ from 'lodash';
import React from 'react';
import { GitStoryTypes, StoryIcons } from 'objects/types/story-types';

import './story-emblem.scss';

function StoryEmblem(props) {
    let { story } = props;
    if (_.includes(story.tags, '#yippeekiyay')) {
        return (
            <div className="story-emblem die-hard">
                <img src={require('explosion.gif')} />
            </div>
        );
    }

    let className = 'story-emblem';
    if (_.includes(GitStoryTypes, type)) {
        className += ' git';
    } else {
        return null;
    }
    let Icon = StoryIcons[type];
    if (type === 'issue') {
        let state = story.details.state;
        Icon = StoryIcons[type + '.' + state];
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
