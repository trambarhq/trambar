import React from 'react';

import './input-error.scss';

/**
 * Stateless component that renders an icon next to an error message, which is
 * provided as its children.
 */
export function InputError(props) {
  const { children, type } = props;
  if (!children) {
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
      <i className={`fas fa-${icon}`} />
      {' '}
      {props.children}
    </div>
  )
}
