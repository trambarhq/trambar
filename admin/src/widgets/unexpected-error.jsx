import React from 'react';
import Cancellation from 'common/errors/cancellation.mjs';

import './unexpected-error.scss';

/**
 * Stateless component that renders an error message returned by the server.
 */
function UnexpectedError(props) {
    const { error } = props;
    if (!error || error.constructor.name === 'Cancellation') {
        return null;
    }
    return (
        <div className="unexpected-error">
            <i className="fa fa-exclamation-circle" />
            {' '}
            {error.message}
        </div>
    )
}

export {
    UnexpectedError as default,
    UnexpectedError,
};
