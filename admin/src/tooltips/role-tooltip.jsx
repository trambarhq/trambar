import _ from 'lodash';
import React from 'react';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

import './role-tooltip.scss';

/**
 * Tooltip showing a list of roles.
 */
function RoleTooltip(props) {
    const { route, env, roles, disabled } = props;
    const { t, p } = env.locale;
    if (!roles) {
        return null;
    }
    const list = _.map(roles, (role, i) => {
        const title = p(role.details.title) || role.name;
        const url = route.find('role-summary-page', {
            roleID: role.id,
        });
        return (
            <div className="item" key={i}>
                <a href={disabled ? undefined : url}>{title}</a>
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
                    <div className="ellipsis">
                        <i className="fa fa-ellipsis-v" />
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

export {
    RoleTooltip as default,
    RoleTooltip,
};
