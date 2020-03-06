import React from 'react';
import { useProgress, useListener } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.js';
import * as UserUtils from 'common/objects/utils/user-utils.js';

// widgets
import { ProfileImage } from './profile-image.jsx';

import './sign-off-menu.scss';

/**
 * Contents of sign-off pop-up menu
 */
export async function SignOffMenu(props) {
  const { database, route, env } = props;
  const { t } = env.locale;
  const [ show ] = useProgress();

  const handleSignOff = useListener((evt) => {
    database.endSession();
  });

  render();
  let user;
  if (database.authorized) {
    const currentUserID = await database.start();
    user = await UserFinder.findUser(database, currentUserID);
    render();
  }

  function render() {
    if (!database.authorized) {
      show(null);
    } else {
      const url = (user) ? route.find('user-summary-page', { userID: user.id }) : undefined;
      const name = UserUtils.getDisplayName(user, env);
      show(
        <div className="sign-off-menu">
          <a href={url}>
            <ProfileImage user={user} env={env} size="large" />
            <div className="name">{name}</div>
          </a>
          <div className="sign-off" onClick={handleSignOff}>
            {t('sign-off-menu-sign-off')}
          </div>
        </div>
      );
    }
  }
}
