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
        var className = 'role-filter-button';
        if (this.props.selected) {
            className += ' selected';
        }
        if (!this.props.role) {
            className += ' no-roles';
        }
        return (
            <a className={className} href={this.props.url}>
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
        // only show user if he has a profile image
        var users = _.filter(this.props.users, (user) => {
            return _.some(user.details.resources, { type: 'image' });
        });
        users = _.slice(users, index, count);
        return (
            <div className="row">
                {_.map(users, this.renderProfileImage)}
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
        return <ProfileImage key={i} user={user} size="medium" theme={this.props.theme} />
    }

    /**
     * Render title
     *
     * @return {ReactElement}
     */
    renderTitle() {
        if (!this.props.role) {
            return this.renderMessage();
         }
        var p = this.props.locale.pick;
        var role = this.props.role;
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
        // undefined means data isn't done loading
        if (this.props.role === undefined) {
            return null;
        }
        var t = this.props.locale.translate;
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
        if (!this.props.users) {
            return null;
        }
        var count = this.props.users.length;
        return (
            <div className="user-count">
                <i className="fa fa-male"></i>
                <span className="number">{count}</span>
            </div>
        );
    }
}

export {
    RoleFilterButton as default,
    RoleFilterButton,
};

import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleFilterButton.propTypes = {
        role: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),
        selected: PropTypes.bool,
        url: PropTypes.string,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
