import React from 'react';

import './empty-message.scss';

function EmptyMessage(props) {
    let t = props.locale.translate;
    let phrase = props.phrase;
    if (!props.online) {
        phrase = 'empty-currently-offline';
    }
    return (
        <div className="empty-message">
            <div className="text">{t(phrase)}</div>
        </div>
    );
}

EmptyMessage.defaultProps = {
    online: true
};

export {
    EmptyMessage as default,
    EmptyMessage,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    EmptyMessage.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
        online: PropTypes.bool,
        phrase: PropTypes.string.isRequired,
    };
}
