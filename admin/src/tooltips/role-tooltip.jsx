import React from 'react';
import { getRoleName } from 'common/objects/utils/role-utils.js';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

import './role-tooltip.scss';

/**
 * Tooltip showing a list of roles.
 */
export function RoleTooltip(props) {
  const { route, env, roles, disabled } = props;
  const { t, p } = env.locale;
  if (!roles) {
    return null;
  }
  const list = roles.map((role, i) => {
    const name = getRoleName(role, env);
    const url = route.find('role-summary-page', {
      roleID: role.id,
    });
    return (
      <div className="item" key={role.id}>
        <a href={disabled ? undefined : url}>{name}</a>
      </div>
    );
  });
  let contents = '-';
  if (list.length > 0) {
    const firstElement = list.shift();
    const first = firstElement.props.children;
    if (list.length > 0) {
      const label = t('role-tooltip-$count-others', list.length);
      const max = 10;
      if (list.length > max) {
        list.splice(max);
        list.push(
          <div className="ellipsis" key={0}>
            <i className="fas fa-ellipsis-v" />
          </div>
        );
      }
      const listURL = route.find('role-list-page');
      const tooltip = (
        <Tooltip className="role" disabled={disabled || list.length === 0} key={1}>
          <inline>{label}</inline>
          <window>
            {list}
            <div className="bottom">
              <a href={listURL}>{t('tooltip-more')}</a>
            </div>
          </window>
        </Tooltip>
      );
      contents = t('tooltip-$first-and-$tooltip', first, tooltip);
    } else {
      contents = first;
    }
  }
  return <span>{contents}</span>;
}
