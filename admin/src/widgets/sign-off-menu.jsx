import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import UserFinder from 'objects/finders/user-finder';

// widgets
import ProfileImage from 'widgets/profile-image';

import './sign-off-menu.scss';

class SignOffMenu extends AsyncComponent {
    static displayName = 'SignOffMenu';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { t, p } = env.locale;
        let db = database.use({ schema: 'global', by: this });
        meanwhile.show(<div className="sign-off-menu" />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                let url = route.find('user-summary-page', { user: user.id });
                return (
                    <div className="sign-off-menu">
                        <a href={url}>
                            <ProfileImage user={user} env={env} size="large" />
                            <div className="name">
                                {p(user.details.name)}
                            </div>
                        </a>
                        <div className="sign-off" onClick={this.handleSignOffClick}>
                            {t('sign-off-menu-sign-off')}
                        </div>
                    </div>
                );
            })
        });
    }

    /**
     * Called when user click on sign-off button
     *
     * @return {Event}
     */
    handleSignOffClick = (evt) => {
        let { database, route } = this.props;
        database.endSession().then(() => {
            route.push('start-page');
        });
    }
}

export {
    SignOffMenu as default,
    SignOffMenu,
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
}
