import React from 'react';

import './action-badge.scss'

/**
 * Stateless component that indicates what action will be performed on an item.
 */
export function ActionBadge(props) {
  let { env, type } = props;
  let { t } = env.locale;
  let className = 'text', icon;
  switch (props.type) {
    case 'add':
    case 'approve':
    case 'restore':
    case 'reactivate':
    case 'select':
      className += ' add';
      icon = 'plus';
      break;
    case 'remove':
    case 'archive':
    case 'disable':
    case 'deselect':
      className += ' remove';
      icon = 'times';
      break;
  }
  let label = t(`action-badge-${type}`);
  return (
    <div className="action-badge">
      <div className="container">
        <span className={className}>
          <i className={`fa fa-${icon}`} /> {label}
        </span>
      </div>
    </div>
  );
}
