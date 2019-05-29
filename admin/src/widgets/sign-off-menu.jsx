import React from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import ProfileImage from './profile-image.jsx';

import './sign-off-menu.scss';

/**
 * Contents of sign-off pop-up menu
 */
async function SignOffMenu(props) {
    const { database, route, env } = props;
    const { t } = env.locale;
    const [ show ] = useProgress();
    const db = database.use({ schema: 'global', by: this });

    const handleSignOff = useListener((evt) => {
        database.endSession();
    });

    render();
    let user;
    if (db.authorized) {
        const currentUserID = await db.start();
        user = await UserFinder.findUser(db, currentUserID);
        render();
    }

    function render() {
        if (!db.authorized) {
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

const component = Relaks.memo(SignOffMenu);

export {
    component as default,
    component as SignOffMenu,
};
