import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Tooltip from 'widgets/tooltip';
import ProfileImage from 'widgets/profile-image';

import './user-tooltip.scss';

/**
 * Tooltip showing a list of users.
 *
 * @extends PureComponent
 */
class UserTooltip extends PureComponent {
    static displayName = 'UserTooltip';

    render() {
        let { route, env, users, project, disabled } = this.props;
        let { t } = env.locale;
        if (!users) {
            return null;
        }
        let label = t('user-tooltip-$count', users.length);
        let ellipsis;
        if (users.length > 10) {
            users = _.slice(users, 0, 10);
            ellipsis = <div className="ellipsis"><i className="fa fa-ellipsis-v" /></div>;
        }
        let list = _.map(users, (user, i) => {
            let url;
            if (project) {
                url = route.find('user-summary-page', {
                    projectID: project.id,
                    userID: user.id,
                });
            } else {
                url = route.find('user-summary-page', {
                    userID: user.id,
                });
            }
            return (
                <div className="item" key={i}>
                    <a href={url}>
                        <ProfileImage user={user} env={env} />
                        {' '}
                        {user.details.name}
                    </a>
                </div>
            );
        });
        let listURL;
        if (project) {
            listURL = route.find('member-list-page', { projectID: project.id });
        } else {
            listURL = route.find('user-list-page');
        }
        return (
            <Tooltip className="user" disabled={disabled || list.length === 0}>
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
    }
}

export {
    UserTooltip as default,
    UserTooltip,
};

import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserTooltip.propTypes = {
        users: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        disabled: PropTypes.bool,
    };
}
