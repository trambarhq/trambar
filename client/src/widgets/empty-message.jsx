import React from 'react';

import './empty-message.scss';

/**
 * A simple stateless component that displays a message stating that there's
 * no contents. If the reason for lack of contents might be the lack of
 * Internet access, an alternate message will say so to that effect.
 */
function EmptyMessage(props) {
    let { env, phrase } = props;
    let { t } = env.locale;
    if (!env.online) {
        phrase = 'empty-currently-offline';
    }
    return (
        <div className="empty-message">
            <div className="text">{t(phrase)}</div>
        </div>
    );
}

export {
    EmptyMessage as default,
    EmptyMessage,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    EmptyMessage.propTypes = {
        phrase: PropTypes.string.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
