import React from 'react';

import './push-button.scss';

function PushButton(props) {
    if (props.hidden) {
        return null;
    }
    let classNames = [ 'push-button' ];
    if (props.emphasized) {
        classNames.push('emphasized');
    }
    return (
        <button className={classNames.join(' ')} disabled={props.disabled} onClick={props.onClick}>
            {props.label}
        </button>
    );
}

PushButton.File = FileButton;

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    let inputProps = {
        type: 'file',
        value: '',
        disabled: props.disabled,
        multiple: props.multiple,
        accept: props.accept,
        onChange: props.onChange,
    };
    let classNames = [ 'push-button' ];
    if (props.emphasized) {
        classNames.push('emphasized');
    }
    return (
        <label className={classNames.join(' ')} disabled={props.disabled} onClick={props.onClick}>
            {props.label}
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
