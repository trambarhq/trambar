import React from 'react';
import * as StoryUtils from 'objects/utils/story-utils';

// widgets
import Time from 'widgets/time';

import './story-progress.scss';

function StoryProgress(props) {
    let t = props.locale.translate;
    let contents;

    if (!StoryUtils.isActuallyPublished(props.story)) {
        // not saved yet
        contents = t('story-status-storage-pending');
    } else {
        let status = props.status;
        if (status) {
            contents = t(`story-status-${status.action}-$progress`, status.progress);
        } else {
            contents = <Time time={props.story.ptime} locale={props.locale} />;
            if (props.pending) {
                // story has not made it into listings yet
                contents = (
                    <span>
                        {contents} <i className="fa fa-spinner fa-pulse" />
                    </span>
                );
            }
        }
    }
    return <span className="story-progress">{contents}</span>;
}

export {
    StoryProgress as default,
    StoryProgress,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryProgress.propTypes = {
        status: PropTypes.object,
        story: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
