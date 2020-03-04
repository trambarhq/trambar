import React from 'react';

import './header-button.scss';

/**
 * Stateless component that renders the type of buttons that appears in the
 * header of a panel.
 */
export function HeaderButton(props) {
  const { label, hidden, disabled, highlighted, onClick, ...otherProps } = props;
  if (hidden) {
    return null;
  }
  const labelProps = {
    className: buttonClasses(props),
    onClick: !disabled ? onClick : undefined,
    ...otherProps
  };
  return (
    <label {...labelProps}>
      <i className={iconClasses(props)}/>
      <span className="label">{label}</span>
    </label>
  );
}

HeaderButton.File = FileButton;

/**
 * Stateless component that renders a header button for selecting a file.
 */
function FileButton(props) {
  const { label, hidden, disabled, highlighted, multiple, onChange, ...otherProps } = props;
  if (hidden) {
    return null;
  }
  const inputProps = {
    type: 'file',
    value: '',
    disabled,
    multiple,
    onChange,
  };
  const labelProps = {
    classNames: buttonClasses(props),
    ...otherProps,
  };
  if (edgeBug) {
    // deal with bug in Edge:
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8282613/
    inputProps.id = `file-input-${edgeInputId++}`;
    return (
      <span {...labelProps}>
        <label htmlFor={inputProps.id}>
          <i className={iconClasses(props)}/>
          <span className="label">{label}</span>
        </label>
        <input {...inputProps} />
      </span>
    );
  }
  return (
    <label className={buttonClasses(props)}>
      <i className={iconClasses(props)}/>
      <span className="label">{label}</span>
      <input {...inputProps} />
    </label>
  );
}

const edgeBug = /Edge/.test(navigator.userAgent);
let edgeInputId = 1;

function buttonClasses(props) {
  const classNames = [ 'header-button' ];
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
  const classNames = [];
  if (props.icon) {
    classNames.push('fa', `fa-${props.icon}`);
  }
  return classNames.join(' ');
}
