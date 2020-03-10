import React from 'react';

import './option-button.scss';

/**
 * Stateless component that renders a text button with either a checkbox or
 * an icon next to it.
 */
export function OptionButton(props) {
  const { id, label, url, target, hidden, disabled, onClick } = props;
  if (hidden) {
    return null;
  }
  const anchorProps = {
    className: buttonClasses(props),
    id,
    href: url,
    target,
    onClick: !disabled ? onClick : null,
  };
  return (
    <a {...anchorProps}>
      <div className="icon"><i className={iconClasses(props)} /></div>
      <div className="label">{label}</div>
    </a>
  )
}

function buttonClasses(props) {
  const classNames = [ 'option-button' ];
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
  if (props.iconClass) {
    return props.iconClass);
  } else {
    if (props.selected) {
      return props.iconClassOn);
    } else {
      return props.iconClassOff);
    }
  }
}

OptionButton.defaultProps = {
  iconClassOn: 'fas fa-check-circle',
  iconClassOff: 'far fa-circle',
};
