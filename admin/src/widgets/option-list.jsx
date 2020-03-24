import React from 'react';
import { useListener } from 'relaks';

import { SortableTable } from './sortable-table.jsx';

import './option-list.scss';

/**
 * A input control containing a list of selectable options. In read-only mode,
 * only the selected options will be shown. The box will expand to list all
 * options when switching into read-write mode.
 */
export function OptionList(props) {
  const { readOnly, children, onOptionClick } = props;

  const handleClick = useListener((evt) => {
    const name = evt.currentTarget.getAttribute('data-name');
    if (onOptionClick) {
      onOptionClick({
        type: 'optionclick',
        target: this,
        name,
      });
    }
  });

  const array = React.Children.toArray(children);
  const options = array.filter(c => c.type === 'option');
  const label = array.find(c => c.type === 'label');
  const classNames = [ 'option-list' ];
  if (readOnly) {
    classNames.push('readonly');
  }
  const tableProps = {
    expandable: true,
    selectable: !readOnly,
    expanded: !readOnly,
    sortColumns: [],
  };
  return (
    <div className={classNames.join(' ')}>
      <label>
        {label ? label.props.children : null}
      </label>
      <div className="container">
        <SortableTable {...tableProps}>
          <tbody>{options.map(renderRow)}</tbody>
        </SortableTable>
      </div>
    </div>
  );

  function renderRow(option, i) {
    const { name, hidden, selected, previous, children } = option.props;
    if (hidden) {
      return null;
    }
    const classNames = [ 'option' ];
    if (selected) {
      classNames.push(readOnly ? 'fixed' : 'selected');
    }
    let badge;
    if (!readOnly) {
      if (selected && !previous) {
        badge = <i className="far fa-check-circle badge add" />;
      } else if (!selected && previous) {
        badge = <i className="far fa-times-circle badge remove" />;
      }
    }
    const props = {
      className: classNames.join(' '),
      'data-name': name,
      onClick: (!readOnly) ? handleClick : undefined,
    };
    return (
      <tr key={i} {...props}>
        <td>
          {children}
          {badge}
        </td>
      </tr>
    );
  }
}
