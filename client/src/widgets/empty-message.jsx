import React from 'react';

import './empty-message.scss';

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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    EmptyMessage.propTypes = {
        phrase: PropTypes.string.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
