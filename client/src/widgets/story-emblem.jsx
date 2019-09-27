import _ from 'lodash';
import React from 'react';
import { GitStoryTypes, StoryIcons } from 'common/objects/types/story-types.mjs';

import './story-emblem.scss';

/**
 * Stateless component that renders a background graphic for stories that
 * describe git activities. It's also responsible for rendering the special
 * "#yippeekiyay" explosion.
 */
function StoryEmblem(props) {
    const { story } = props;
    const { type, tags } = story;
    if (_.includes(tags, '#yippeekiyay')) {
        return (
            <div className="story-emblem die-hard">
                <img src={require('../../assets/explosion.gif')} />
            </div>
        );
    }

    const classNames = [ 'story-emblem' ];
    if (_.includes(GitStoryTypes, type)) {
        classNames.push('git');
    } else {
        return null;
    }
    let Icon = StoryIcons[type];
    if (type === 'issue') {
        const { state } = story.details;
        Icon = StoryIcons[type + '.' + state];
    }
    if (!Icon) {
        return null;
    }
    return (
        <div className={classNames.join(' ')}>
            <Icon className={type} />
        </div>
    );
}

export {
    StoryEmblem as default,
    StoryEmblem,
};
