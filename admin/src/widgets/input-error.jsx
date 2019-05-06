import React, { PureComponent } from 'react';

import Environment from 'common/env/environment.mjs';

module.exports = InputError;

import './input-error.scss';

/**
 * Stateless component that renders an icon next to an error message, which is
 * provided as its children.
 */
function InputError(props) {
    let { children, type } = props;
    if (!props.children) {
        return null;
    }
    let className = 'input-error';
    let icon = 'exclamation-circle';
    if (props.type === 'warning') {
        className += ' warning';
        icon = 'exclamation-triangle';
    }
    return (
        <div className={className}>
            <i className={`fa fa-${icon}`} />
            {' '}
            {props.children}
        </div>
    )
}

export {
    InputError as default,
    InputError,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    InputError.propTypes = {
        type: PropTypes.oneOf([ 'error', 'warning' ]),
    };
}
