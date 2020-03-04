import React from 'react';

import './push-button.scss';

/**
 * Stateless component that renders a basic push button.
 */
export function PushButton(props) {
  const { label, emphasized, hidden, disabled, onClick } = props;
  if (hidden) {
    return null;
  }
  let classNames = [ 'push-button' ];
  if (emphasized && !disabled) {
    classNames.push('emphasized');
  }
  return (
    <button className={classNames.join(' ')} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

PushButton.File = FileButton;

/**
 * Stateless component that renders a push button that triggers file selection.
 */
function FileButton(props) {
  const { label, emphasized, hidden, disabled, multiple, accept, onChange } = props;
  if (hidden) {
    return null;
  }
  const inputProps = {
    type: 'file',
    value: '',
    disabled,
    multiple,
    accept,
    onChange,
  };
  const classNames = [ 'push-button' ];
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
