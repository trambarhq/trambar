import React from 'react';

import './option-button.scss';

function OptionButton(props) {
    if (props.hidden) {
        return null;
    }
    var anchorProps = {
        className: buttonClasses(props),
        id: props.id,
        href: props.url,
        target: props.target,
        onClick: !props.disabled ? props.onClick : null,
    };
    return (
        <a {...anchorProps}>
            <div className="icon">
                <i className={iconClasses(props)} />
            </div>
            <div className="label">
                {props.label}
            </div>
        </a>
    )
}

function buttonClasses(props) {
    var classNames = [ 'option-button' ];
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
    var classNames = [ 'fa' ];
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
