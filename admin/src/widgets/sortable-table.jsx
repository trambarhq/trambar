import React, { useState, useMemo, useEffect } from 'react';
import { useListener } from 'relaks';

import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';

import './sortable-table.scss';

/**
 * A table with clickable headers that changes how sorting is performed. The
 * table can expand to show additional rows.
 */
export const SortableTable = React.memo((props) => {
  const { children, expandable, expanded, selectable,
      className, sortColumns, sortDirections, transitionRowLimit,
      onSort, ...tableProps } = props;
  const [ action, setAction ] = useState(null);
  const [ transition, setTransition ] = useState(false);

  useEffect(() => {
    if (transition) {
      setAction(expanded ? 'expanding' : 'collapsing');
    }
  }, [ expanded ])
  useEffect(() => {
    if (action) {
      setAction(null);
    }
  }, [ action ])
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTransition(true);
    }, 100);
    return () => {
      clearTimeout(timeout);
    }
  }, [])

  const handleClick = useListener((evt) => {
    const target = evt.target;
    const th = findHeaderNode(evt.target);
    if (th && onSort) {
      const column = th.id;
      let dir = 'asc';
      const columns = [ ...sortColumns ];
      const directions = [ ...sortDirections ];
      const index = sortColumns.indexOf(column);
      if (index !== -1) {
        if (index === 0) {
          if (sortDirections[0] === 'asc') {
            dir = 'desc';
          }
        }
        columns.splice(index, 1);
        directions.splice(index, 1);
      }
      columns.unshift(column);
      directions.unshift(dir);
      onSort({ columns, directions });
    }
  });

  let thead = findChild(children, 'thead');
  let tbody = findChild(children, 'tbody');
  if (thead) {
    thead = highlightHeading(thead);
  }
  if (tbody && expanded != null) {
    tbody = wrapUnselectedRows(tbody);
  }
  const classNames = [ 'sortable-table' ];
  if (expandable) {
    classNames.push('expandable');
    if (expanded) {
      classNames.push('expanded');
    } else {
      classNames.push('collapsed');
    }
  }
  if (selectable) {
    classNames.push('selectable');
  }
  if (className) {
    classNames.push(className);
  }
  tableProps.className = classNames.join(' ');
  tableProps.onClick = handleClick;
  return (
    <table {...tableProps}>
      {thead}
      {tbody}
    </table>
  );

  function highlightHeading(thead) {
    const sortColumn = sortColumns?.[0];
    const sortDirection = sortDirections?.[0] || 'asc';
    const tr = findChild(thead.props.children, 'tr');
    const children = React.Children.toArray(tr.props.children);
    const newChildren = children.map((child) => {
      if (child.props.id === sortColumn) {
        let { className } = child.props;
        className = (className) ? `${className} ${sortDirection}` : sortDirection;
        child = React.cloneElement(child, { className });
      }
      return child;
    });
    const newTr = React.cloneElement(tr, {}, newChildren);
    const newThead = React.cloneElement(thead, {}, [ newTr ]);
    return newThead;
  }

  function wrapUnselectedRows(tbody) {
    // not using React.Children.toArray() on the rows, as that
    // leads to new keys and messes up CSS transition
    const trs = tbody.props.children;
    const newTrs = trs.map((tr, i) => {
      if (!tr) {
        return null;
      }
      if (/\bfixed\b/.test(tr.props.className)) {
        return tr;
      }
      if (transitionRowLimit && i >= transitionRowLimit) {
        return (expanded) ? tr : null;
      }
      const tds = React.Children.toArray(tr.props.children);
      let { className } = tr.props;
      let open = expanded;
      let state;
      if (action === 'expanding') {
        // render in the closed state at start of transition
        open = false;
        state = 'expanded';
      } else if (action === 'collapsing') {
        // render in the open state at start of transition
        open = true;
        state = 'collapsed';
      }
      className = (className) ? `${className} ${state}` : state;
      const newTds = tds.map((td, j) => {
        const container = (
          <CollapsibleContainer open={open} animateIn={transition}>
            {td.props.children}
          </CollapsibleContainer>
        );
        return React.cloneElement(td, {}, container);
      });
      return React.cloneElement(tr, { className }, newTds);
    });
    const newTbody = React.cloneElement(tbody, {}, newTrs);
    return newTbody;
  }
});

function findChild(children, tagName) {
  children = React.Children.toArray(children);
  return children.find(c => c.type === tagName);
}

function findHeaderNode(node) {
  for (let n = node; n && n.tagName !== 'TABLE'; n = n.parentNode) {
    if (n.tagName === 'TH') {
      if (n.id) {
        return n;
      }
    }
  }
}

export function TH(props) {
  return (
    <th {...props}>
      {props.children}
      <i className="fas fa-chevron-down arrow down"/>
      <i className="fas fa-chevron-up arrow up"/>
    </th>
  );
}

SortableTable.defaultProps = {
  transitionRowLimit: 20
};
