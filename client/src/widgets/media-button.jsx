import React from 'react';

import './media-button.scss';

/**
 * Stateless component that renders a button for adding/removing attached media.
 */
export function MediaButton(props) {
  const { label, hidden, disabled, iconClass, onClick } = props;
  if (hidden) {
    return null;
  }
  return (
    <label className={buttonClasses(props)} onClick={!disabled ? onClick : null}>
      <i className={iconClass}/>
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
  const { index, count, hidden, onBackwardClick, onForwardClick } = props;
  if (hidden) {
    return null;
  }
  const text = `${index + 1} / ${count}`;
  return (
    <div className="media-direction">
      <label className="backward-button" onClick={onBackwardClick}>
        <i className="fas fa-caret-left"/>
      </label>
      <span className="position">{text}</span>
      <label className="forward-button" onClick={onForwardClick}>
        <i className="fas fa-caret-right"/>
      </label>
    </div>
  );
}

function buttonClasses(props) {
  const classNames = [ 'media-button' ];
  if (props.className) {
    classNames.push(props.className);
  }
  if (props.disabled) {
    classNames.push('disabled');
  }
  return classNames.join(' ');
}
