import _ from 'lodash';
import React from 'react';

import './media-placeholder.scss';

/**
 * Stateless component that fades advisory messages in and out for when
 * there aren't any attach media.
 */
function MediaPlaceholder(props) {
    let { env, showHints } = props;
    let { t } = env.locale;
    let phraseIDs;
    if (process.env.PLATFORM !== 'mobile') {
        if (showHints) {
            phraseIDs = [
                'story-drop-files-here',
                'story-paste-image-here',
            ]
        }
    }
    let messages = _.map(phraseIDs, (phraseID, index) => {
        let style = {
            animationDelay: `${10 * index}s`
        };
        return (
            <div key={index} className="message" style={style}>
                {t(phraseID)}
            </div>
        )
    });
    return (
        <div className="media-placeholder">
            {messages}
        </div>
    );
}

export {
    MediaPlaceholder as default,
    MediaPlaceholder,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaPlaceholder.propTypes = {
        showHints: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
