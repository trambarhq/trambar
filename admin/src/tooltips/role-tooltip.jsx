import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Tooltip from 'widgets/tooltip';

import './role-tooltip.scss';

class RoleTooltip extends PureComponent {
    static displayName = 'RoleTooltip';

    render() {
        let { route, env, roles, disabled } = this.props;
        let { t, p } = env.locale;
        if (!roles) {
            return null;
        }
        let first = '-';
        if (roles.length > 0) {
            // list the first role
            let role0 = roles[0]
            let url0;
            if (!disabled) {
                url0 = route.find('role-summary-page', {
                   role: role0.id,
                });
            }
            let title0 = p(role0.details.title) || role0.name;
            let first = <a href={url0} key={0}>{title0}</a>;
            roles = _.slice(roles, 1);
        }
        let contents;
        if (roles.length > 0) {
            let ellipsis;
            let label = t('role-tooltip-$count-others', roles.length);
            if (roles.length > 10) {
                roles = _.slice(roles, 0, 10);
                ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
            }
            let list = _.map(roles, (role, i) => {
                let url = route.find('role-summary-page', {
                    role: role.id,
                });
                let title = p(role.details.title) || role.name;
                return (
                    <div className="item" key={i}>
                        <a href={url}>
                            {title}
                        </a>
                    </div>
                );
            });
            let listURL = route.find('role-list-page');
            let tooltip = (
                <Tooltip className="role" disabled={disabled || list.length === 0} key={1}>
                    <inline>{label}</inline>
                    <window>
                        {list}
                        {ellipsis}
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
        return <span>{contents}</span>;
    }
}

export {
    RoleTooltip as default,
    RoleTooltip,
};

import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleTooltip.propTypes = {
        roles: PropTypes.arrayOf(PropTypes.object),
        disabled: PropTypes.bool,
        route: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
