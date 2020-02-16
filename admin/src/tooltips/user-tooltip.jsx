import _ from 'lodash';
import React from 'react';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';

import './user-tooltip.scss';

/**
 * Tooltip showing a list of users.
 */
function UserTooltip(props) {
  const { route, env, users, project, disabled } = props;
  const { t } = env.locale;
  if (!users) {
    return null;
  }
  const label = t('user-tooltip-$count', users.length);
  const list = _.map(users, (user, i) => {
    let url;
    if (project) {
      url = route.find('member-summary-page', {
        projectID: project.id,
        userID: user.id,
      });
    } else {
      url = route.find('user-summary-page', {
        userID: user.id,
      });
    }
    const name = UserUtils.getDisplayName(user, env);
    return (
      <div className="item" key={user.id}>
        <a href={url}>
          <ProfileImage user={user} env={env} /> {name}
        </a>
      </div>
    );
  });
  const max = 10;
  if (list.length > max) {
    list.splice(max);
    list.push(
      <div className="ellipsis" key={0}>
        <i className="fa fa-ellipsis-v" />
      </div>
    );
  }
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
        <div className="bottom">
          <a href={listURL}>{t('tooltip-more')}</a>
        </div>
      </window>
    </Tooltip>
  );

}

export {
  UserTooltip as default,
  UserTooltip,
};
