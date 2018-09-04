import React from 'react';

import './empty-message.scss';

function EmptyMessage(props) {
    var t = props.locale.translate;
    var phrase = props.phrase;
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

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    EmptyMessage.propTypes = {
        locale: PropTypes.instanceOf(Locale).isRequired,
        online: PropTypes.bool,
        phrase: PropTypes.string.isRequired,
    };
}
