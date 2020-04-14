import React, { useRef, useEffect } from 'react';

// widgets
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';

import './text-field.scss';

/**
 * Stateless component that renders either a textarea or a single-line
 * text input.
 */
export function TextField(props) {
  const { env, children, readOnly, autofocus, list, ...inputProps } = props;
  const { t } = env.locale;
  const inputRef = useRef();

  useEffect(() => {
    if (autofocus) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, []);

  const classNames = [ 'text-field' ];
  let Input = 'input';
  if (props.type === 'textarea') {
    Input = AutosizeTextArea;
    delete inputProps.type;
  }
  if (readOnly) {
    classNames.push('readonly');
    inputProps.placeholder = t('text-field-placeholder-none');
    inputProps.spellCheck = false;
    inputProps.readOnly = true;
  }
  inputProps.value = inputProps.value || '';

  let datalist;
  if (list instanceof Array) {
    const listID = props.id + '-list';
    const options = list.map((label, key) => {
      return <option key={key}>{label}</option>
    });
    datalist = <datalist id={listID}>{options}</datalist>;
    inputProps.list = listID;
  }
  return (
    <div className={classNames.join(' ')}>
      <label htmlFor={props.id}>{children}</label>
      <Input ref={inputRef} {...inputProps} />
      {datalist}
    </div>
  );
}

TextField.defaultProps = {
  type: 'text',
};
