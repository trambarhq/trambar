import React from 'react';

import './push-button.scss';

function PushButton(props) {
    let { label, emphasized, hidden, disabled, onClick } = props;
    if (hidden) {
        return null;
    }
    let classNames = [ 'push-button' ];
    if (emphasized) {
        classNames.push('emphasized');
    }
    return (
        <button className={classNames.join(' ')} disabled={disabled} onClick={onClick}>
            {label}
        </button>
    );
}

PushButton.File = FileButton;

function FileButton(props) {
    let { label, emphasized, hidden, disabled, multiple, accept, onChange } = props;
    if (hidden) {
        return null;
    }
    let inputProps = {
        type: 'file',
        value: '',
        disabled,
        multiple,
        accept,
        onChange,
    };
    let classNames = [ 'push-button' ];
    if (emphasized) {
        classNames.push('emphasized');
    }
    return (
        <label className={classNames.join(' ')} disabled={disabled}>
            {label}
            <input {...inputProps} />
        </label>
    );
}

export {
    PushButton as default,
    PushButton,
    FileButton,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    FileButton.propTypes = {
        label: PropTypes.string,
        icon: PropTypes.string,
        hidden: PropTypes.bool,
        disabled: PropTypes.bool,
        multiple: PropTypes.bool,
        onChange: PropTypes.func,
    };
}
