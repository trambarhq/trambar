import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as ProjectLinkFinder from 'objects/finders/project-link-finder';

import './cordova-page.scss';

/**
 * Asynchronous component that redirects to NewsPage of the last project or
 * to StartPage
 *
 * @extends AsyncComponent
 */
class CordovaPage extends AsyncComponent {
    static displayName = 'CordovaPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let {
            database,
            route,
        } = this.props;
        let db = database.use({ by: this });
        return ProjectLinkFinder.findActiveLinks(db).then((links) => {
            let lastLink = _.last(_.sortBy(links, 'atime'));
            if (lastLink) {
                let context = {
                    cors: true,
                    address: lastLink.address,
                    schema: lastLink.schema,
                };
                route.replace('news-page', {}, context);
            } else {
                route.replace('start-page', {});
            }
        }).then(() => {
            return null;
        });
    }
}

export {
    CordovaPage as default,
    CordovaPage,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CordovaPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
