import _ from 'lodash';
import React from 'react';

// widgets
import { ProfileImage } from './profile-image.jsx';

import './role-filter-button.scss';

/**
 * A button decorated with profile images of members with a given role.
 */
export function RoleFilterButton(props) {
  const { env, url, role, users, selected } = props;
  const { t, p } = env.locale;
  const classNames = [ 'role-filter-button' ];
  if (selected) {
    classNames.push('selected');
  }
  if (!role) {
    classNames.push('no-roles');
  }

  return (
    <a className={classNames.join(' ')} href={url}>
      <div className="contents">
        {renderImageRow(0, 4)}
        {renderImageRow(0, 0)}
        {renderImageRow(4, 4)}
        {renderTitle()}
      </div>
    </a>
  );

  function renderImageRow(index, count) {
    // only show user if he has a profile image
    const visibleUsers = _.filter(users, (user) => {
      return _.some(user.details.resources, { type: 'image' });
    });
    const slice = _.slice(users, index, count);
    return (
      <div className="row">
        {_.map(slice, renderProfileImage)}
      </div>
    );
  }

  function renderProfileImage(user, i) {
    return <ProfileImage key={i} user={user} env={env} size="medium" />
  }

  function renderTitle() {
    if (role) {
      return (
        <div className="band">
          <div className="title">
            {p(role.details.title) || role.name}
            {renderUserCount()}
          </div>
        </div>
      );
    } else if (role === null) {
      return (
        <div className="message">
          {t('role-filter-no-roles')}
        </div>
      );
    }
  }

  function renderUserCount() {
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
