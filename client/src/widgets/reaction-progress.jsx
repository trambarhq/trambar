import React from 'react';
import * as ReactionUtils from 'objects/utils/reaction-utils';

// widgets
import Time from 'widgets/time';

import './reaction-progress.scss';

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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionProgress.propTypes = {
        status: PropTypes.object,
        reaction: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
