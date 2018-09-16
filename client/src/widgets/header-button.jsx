import React from 'react';

import './header-button.scss';

function HeaderButton(props) {
    if (props.hidden) {
        return null;
    }
    return (
        <label className={buttonClasses(props)} onClick={!props.disabled ? props.onClick : null}>
            <i className={iconClasses(props)}/>
            <span className="label">{props.label}</span>
        </label>
    );
}

HeaderButton.File = FileButton;

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    let inputProps = {
        type: 'file',
        value: '',
        disabled: props.disabled,
        multiple: props.multiple,
        onChange: props.onChange,
    };
    if (edgeBug) {
        // deal with bug in Edge:
        // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8282613/
        inputProps.id = `file-input-${edgeInputId++}`;
        return (
            <span className={buttonClasses(props)}>
                <label htmlFor={inputProps.id}>
                    <i className={iconClasses(props)}/>
                    <span className="label">{props.label}</span>
                </label>
                <input {...inputProps} />
            </span>
        );
    }
    return (
        <label className={buttonClasses(props)}>
            <i className={iconClasses(props)}/>
            <span className="label">{props.label}</span>
            <input {...inputProps} />
        </label>
    );
}

let edgeBug = /Edge/.test(navigator.userAgent);
let edgeInputId = 1;

function buttonClasses(props) {
    let classNames = [ 'header-button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    return classNames.join(' ');
}

function iconClasses(props) {
    let classNames = [];
    if (props.icon) {
        classNames.push('fa', `fa-${props.icon}`);
    }
    return classNames.join(' ');
}

export {
    HeaderButton as default,
    HeaderButton,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    HeaderButton.propTypes = {
        label: PropTypes.string,
        icon: PropTypes.string,
        hidden: PropTypes.bool,
        highlighted: PropTypes.bool,
        disabled: PropTypes.bool,
        onClick: PropTypes.func,
    };
    FileButton.propTypes = {
        label: PropTypes.string,
        icon: PropTypes.string,
        hidden: PropTypes.bool,
        highlighted: PropTypes.bool,
        disabled: PropTypes.bool,
        multiple: PropTypes.bool,
        onChange: PropTypes.func,
    };
}
