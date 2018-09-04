import React from 'react';
import ReactionUtils from 'objects/utils/reaction-utils';

// widgets
import Time from 'widgets/time';

import './reaction-progress.scss';

function ReactionProgress(props) {
    var t = props.locale.translate;
    var contents;
    if (!ReactionUtils.isActuallyPublished(props.reaction)) {
        // not saved yet
        contents = t('reaction-status-storage-pending');
    } else {
        var status = props.status;
        if (status) {
            contents = t(`reaction-status-${status.action}`);
        } else {
            contents = <Time time={props.reaction.ptime} compact={true} locale={props.locale} />;
        }
    }
    return <span className="reaction-progress">{contents}</span>;
}

export {
    ReactionProgress as default,
    ReactionProgress,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionProgress.propTypes = {
        status: PropTypes.object,
        reaction: PropTypes.object.isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    };
}
