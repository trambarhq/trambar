import React, { PureComponent } from 'react';

// widgets
import Unicorn from 'common-assets/unicorn.svg';
import PageContainer from '../widgets/page-container.jsx';

import './error-page.scss';

/**
 * Component for the Error page.
 *
 * @extends PureComponent
 */
class ErrorPage extends PureComponent {
    static displayName = 'ErrorPage';

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        return {
            navigation: {
                top: true,
                bottom: true,
            }
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <PageContainer className="error-page">
                <div className="graphic"><Unicorn /></div>
                <div className="text">
                    <h1 className="title">404 Not Found</h1>
                    <p>The page you're trying to reach doesn't exist. But then again, who does?</p>
                </div>
            </PageContainer>
        );
    }
}

export {
    ErrorPage as default,
    ErrorPage,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ErrorPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
