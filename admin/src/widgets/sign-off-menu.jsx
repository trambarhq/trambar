import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'objects/finders/user-finder';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import ProfileImage from 'widgets/profile-image';

import './sign-off-menu.scss';

/**
 * Asynchronous component that retrieves data needed by the sign-off button,
 * namely the current user. It handles the rendering itself currently.
 *
 * @extends AsyncComponent
 */
class SignOffMenu extends AsyncComponent {
    static displayName = 'SignOffMenu';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { t, p } = env.locale;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            show: db.authorized,
            route,
            env,
            onSignOff: this.handleSignOff,
        };
        if (db.authorized) {
            meanwhile.show(<SignOffMenuSync {...props} />);
            let currentUserID = await db.start();
            props.user = await UserFinder.findUser(db, currentUserID);
        }
        return <SignOffMenuSync {...props} />;
    }

    /**
     * Called when user click on sign-off button
     *
     * @return {Event}
     */
    handleSignOff = (evt) => {
        let { database, route } = this.props;
        database.endSession();
    }
}

class SignOffMenuSync extends AsyncComponent {
    static displayName = 'SignOffMenuSync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, show, user, env } = this.props;
        let { onSignOff } = this.props;
        let { t } = env.locale;
        let url = (user) ? route.find('user-summary-page', { userID: user.id }) : undefined;
        let name = UserUtils.getDisplayName(user, env);
        if (!show) {
            return null;
        }
        return (
            <div className="sign-off-menu">
                <a href={url}>
                    <ProfileImage user={user} env={env} size="large" />
                    <div className="name">{name}</div>
                </a>
                <div className="sign-off" onClick={onSignOff}>
                    {t('sign-off-menu-sign-off')}
                </div>
            </div>
        );
    }
}

export {
    SignOffMenu as default,
    SignOffMenu,
    SignOffMenuSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SignOffMenu.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    SignOffMenuSync.propTypes = {
        show: PropTypes.bool,
        user: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
