import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

import './start-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Start page.
 *
 * @extends AsyncComponent
 */
class StartPage extends AsyncComponent {
    static displayName = 'StartPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let db = database.use({ by: this });
        let props = {
            env,
        };
        let currentUserID = await db.start();
        let system = await SystemFinder.findSystem(db);
        if (_.isEmpty(system)) {
            // wait for welcome message to transition out
            props.onAnimationEnd = async (evt) => {
                await route.replace('settings-page', { editing: true });
            };
        } else {
            await route.replace('project-list-page');
        }
        return <StartPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Start page.
 *
 * @extends PureComponent
 */
class StartPageSync extends PureComponent {
    static displayName = 'StartPageSync';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, stage, onAnimationEnd } = this.props;
        let { t } = env.locale;
        return (
            <div className={`start-page ${stage}`} onAnimationEnd={onAnimationEnd}>
                <h2>{t('welcome')}</h2>
            </div>
        );
    }
}

export {
    StartPage as default,
    StartPage,
    StartPageSync,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StartPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    StartPage.propType = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
