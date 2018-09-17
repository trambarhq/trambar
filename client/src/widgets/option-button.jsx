import React from 'react';

import './option-button.scss';

function OptionButton(props) {
    let { id, label, url, target, hidden, disabled, onClick } = props;
    if (hidden) {
        return null;
    }
    let anchorProps = {
        className: buttonClasses(props),
        id,
        href: url,
        target,
        onClick: !disabled ? onClick : null,
    };
    return (
        <a {...anchorProps}>
            <div className="icon">
                <i className={iconClasses(props)} />
            </div>
            <div className="label">
                {label}
            </div>
        </a>
    )
}

function buttonClasses(props) {
    let classNames = [ 'option-button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    return classNames.join(' ');
}

function iconClasses(props) {
    let classNames = [ 'fa' ];
    if (props.icon) {
        classNames.push(`fa-${props.icon}`);
    } else {
        if (props.selected) {
            classNames.push(`fa-${props.iconOn}`);
        } else {
            classNames.push(`fa-${props.iconOff}`);
        }
    }
    return classNames.join(' ');
}

OptionButton.defaultProps = {
    iconOn: 'check-circle',
    iconOff: 'circle-o',
};

export {
    OptionButton as default,
    OptionButton,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    OptionButton.propTypes = {
        label: PropTypes.node,
        id: PropTypes.string,
        icon: PropTypes.string,
        iconOn: PropTypes.string,
        iconOff: PropTypes.string,
        url: PropTypes.string,
        target: PropTypes.string,
        hidden: PropTypes.bool,
        selected: PropTypes.bool,
        disabled: PropTypes.bool,
        onClick: PropTypes.func,
    };
}
