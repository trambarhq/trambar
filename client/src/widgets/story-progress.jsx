import React from 'react';
import Moment from 'moment';
import * as StoryUtils from 'common/objects/utils/story-utils.mjs';

// widgets
import Time from './time.jsx';

import './story-progress.scss';

/**
 * Stateless component that render either the publication time or progress in
 * publishing a story, when doing so requires significant amount of time due
 * to attached media.
 */
function StoryProgress(props) {
    const { env, story, status, pending } = props;
    const { t } = env.locale;
    let contents;

    if (!StoryUtils.isActuallyPublished(story)) {
        // not saved yet
        contents = t('story-status-storage-pending');
    } else {
        if (status) {
            if (status.action !== 'unknown') {
                contents = t(`story-status-${status.action}-$progress`, status.progress);
            } else {
                contents = (
                    <span>
                        {t('story-status-storage-pending')}
                        {' '}
                        <i className="fa fa-warning" />
                    </span>
                );
            }
        } else {
            contents = <Time time={story.ptime} env={env} />;
            if (pending) {
                // story has not made it into listings yet
                const spinnerStyle = {};
                const now = Moment();
                const rtime = Moment(story.rtime);
                // give story ten seconds to show up before we show the spinner
                const delay = 10000 - (now - rtime);
                if (delay > 0) {
                    spinnerStyle.animationDelay = (delay / 1000) + 's';
                }
                contents = (
                    <span>
                        {contents}
                        {' '}
                        <span className="spinner" style={spinnerStyle}>
                            <i className="fa fa-spinner fa-pulse" />
                        </span>
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
