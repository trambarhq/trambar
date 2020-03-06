import _ from 'lodash';
import React from 'react';

// widgets
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';

import './text-field.scss';

/**
 * Stateless component that renders either a textarea or a single-line
 * text input.
 */
export function TextField(props) {
  const { env, children, readOnly, list } = props;
  const { t } = env.locale;
  const classNames = [ 'text-field' ];
  let Input = 'input';
  let inputProps = _.omit(props, 'list', 'children', 'env');
  if (props.type === 'textarea') {
    Input = AutosizeTextArea;
    inputProps = _.omit(inputProps, 'type');
  }
  if (readOnly) {
    classNames.push('readonly');
    inputProps.placeholder = t('text-field-placeholder-none');
    inputProps.spellCheck = false;
  }
  inputProps.value = inputProps.value || '';

  let datalist;
  if (list instanceof Array) {
    const listID = props.id + '-list';
    const options = _.map(list, (label, key) => {
      return <option key={key}>{label}</option>
    });
    datalist = <datalist id={listID}>{options}</datalist>;
    inputProps.list = listID;
  }
  return (
    <div className={classNames.join(' ')}>
      <label htmlFor={props.id}>{children}</label>
      <Input {...inputProps} />
      {datalist}
    </div>
  );
}

TextField.defaultProps = {
  type: 'text',
};
