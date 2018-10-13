import React from 'react';

import './media-button.scss';

/**
 * Stateless component that renders a button for adding/removing attached media.
 */
function MediaButton(props) {
    let { label, hidden, disabled, onClick } = props;
    if (hidden) {
        return null;
    }
    return (
        <label className={buttonClasses(props)} onClick={!disabled ? onClick : null}>
            <i className={iconClasses(props)}/>
            <span className="label">{label}</span>
        </label>
    );
}

MediaButton.Direction = Direction;

/**
 * Stateless component that renders a forward button, a backward button, along
 * with text indicating the total number of attached media and the currently
 * selected one.
 */
function Direction(props) {
    let { index, count, hidden, onBackwardClick, onForwardClick } = props;
    if (hidden) {
        return null;
    }
    let text = `${index + 1} / ${count}`;
    return (
        <div className="media-direction">
            <label className="backward-button" onClick={onBackwardClick}>
                <i className="fa fa-caret-left"/>
            </label>
            <span className="position">{text}</span>
            <label className="forward-button" onClick={onForwardClick}>
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
