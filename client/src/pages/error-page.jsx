import React, { PureComponent } from 'react';

// widgets
import Unicorn from 'unicorn.svg';
import PageContainer from 'widgets/page-container';

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

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ErrorPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
