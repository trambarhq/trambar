import React from 'react';

import './media-button.scss';

function MediaButton(props) {
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

MediaButton.Direction = Direction;

function Direction(props) {
    if (props.hidden) {
        return null;
    }
    let text = `${props.index + 1} / ${props.count}`;
    return (
        <div className="media-direction">
            <label className="backward-button" onClick={props.onBackwardClick}>
                <i className="fa fa-caret-left"/>
            </label>
            <span className="position">{text}</span>
            <label className="forward-button" onClick={props.onForwardClick}>
                <i className="fa fa-caret-right"/>
            </label>
        </div>
    );
}

function buttonClasses(props) {
    let classNames = [ 'media-button' ];
    if (props.className) {
        classNames.push(props.className);
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
    MediaButton as default,
    MediaButton,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaButton.propTypes = {
        label: PropTypes.string,
        icon: PropTypes.string,
        hidden: PropTypes.bool,
        highlighted: PropTypes.bool,
        disabled: PropTypes.bool,
        onChange: PropTypes.func,
    };
    Direction.propTypes = {
        index: PropTypes.number,
        count: PropTypes.number,
        hidden: PropTypes.bool,
        onBackwardClick: PropTypes.func,
        onForwardClick: PropTypes.func,
    };
}
