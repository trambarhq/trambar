import _ from 'lodash';
import React from 'react';

import './media-placeholder.scss';

function MediaPlaceholder(props) {
    if (props.theme.mode === 'columns-1') {
        return null;
    }
    let t = props.locale.translate;
    let phraseIds;
    if (process.env.PLATFORM !== 'mobile') {
        if (props.showHints) {
            phraseIds = [
                'story-drop-files-here',
                'story-paste-image-here',
            ]
        }
    }
    let messages = _.map(phraseIds, (phraseId, index) => {
        let style = {
            animationDelay: `${10 * index}s`
        };
        return (
            <div key={index} className="message" style={style}>
                {t(phraseId)}
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
