import React from 'react';
import * as ReactionUtils from 'common/objects/utils/reaction-utils.mjs';

// widgets
import Time from './time.jsx';

import './reaction-progress.scss';

/**
 * Stateless component that render either the publication time or progress in
 * publishing a reaction, when doing so requires significant amount of time due
 * to attached media.
 */
function ReactionProgress(props) {
    let { env, reaction, status } = props;
    let { t } = env.locale;
    let contents;
    if (!ReactionUtils.isActuallyPublished(reaction)) {
        // not saved yet
        contents = t('reaction-status-storage-pending');
    } else {
        if (status) {
            contents = t(`reaction-status-${status.action}`);
        } else {
            contents = <Time time={reaction.ptime} env={env} compact={true} />;
        }
    }
    return <span className="reaction-progress">{contents}</span>;
}

export {
    ReactionProgress as default,
    ReactionProgress,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionProgress.propTypes = {
        status: PropTypes.object,
        reaction: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
