import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import ProfileImage from 'widgets/profile-image';

import './role-filter-button.scss';

class RoleFilterButton extends PureComponent {
    static displayName = 'RoleFilterButton';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { url, role, selected } = this.props;
        let className = 'role-filter-button';
        if (selected) {
            className += ' selected';
        }
        if (!role) {
            className += ' no-roles';
        }
        return (
            <a className={className} href={url}>
                <div className="contents">
                    {this.renderImageRow(0, 4)}
                    {this.renderImageRow(0, 0)}
                    {this.renderImageRow(4, 4)}
                    {this.renderTitle()}
                </div>
            </a>
        );
    }

    /**
     * Render a row of profile images
     *
     * @param  {Number} index
     * @param  {Count} count
     *
     * @return {ReactElement}
     */
    renderImageRow(index, count) {
        let { users } = this.props;
        // only show user if he has a profile image
        users = _.filter(users, (user) => {
            return _.some(user.details.resources, { type: 'image' });
        });
        users = _.slice(users, index, count);
        return (
            <div className="row">
            {
                _.map(users, (user, i) => {
                    return this.renderProfileImage(user, i);
                })
            }
            </div>
        );
    }

    /**
     * Render profile image of user
     *
     * @param  {User} user
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderProfileImage(user, i) {
        let { env } = this.props;
        return <ProfileImage key={i} user={user} env={env} size="medium" />
    }

    /**
     * Render title
     *
     * @return {ReactElement}
     */
    renderTitle() {
        let { env, role } = this.props;
        let { p } = env.locale;
        if (!role) {
            return this.renderMessage();
         }
        return (
            <div className="band">
                <div className="title">
                    {p(role.details.title) || role.name}
                    {this.renderUserCount()}
                </div>
            </div>
        );
    }

    renderMessage() {
        let { env, role } = this.props;
        let { t } = env.locale;
        // undefined means data isn't done loading
        if (role === undefined) {
            return null;
        }
        return (
            <div className="message">
                {t('role-filter-no-roles')}
            </div>
        );
    }

    /**
     * Render user count
     *
     * @return {ReactElement|null}
     */
    renderUserCount() {
        let { users } = this.props;
        if (!users) {
            return null;
        }
        return (
            <div className="user-count">
                <i className="fa fa-male"></i>
                <span className="number">{users.length}</span>
            </div>
        );
    }
}

export {
    RoleFilterButton as default,
    RoleFilterButton,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleFilterButton.propTypes = {
        role: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),
        selected: PropTypes.bool,
        url: PropTypes.string,

        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
