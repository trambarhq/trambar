import React, { PureComponent } from 'react';
import HTTPError from 'errors/http-error';

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
        let error = new HTTPError(404)
        let message;
        if (error.statusCode === 404) {
            message = `The page you're trying to reach doesn't exist. But then again, who does?`;
        } else {
            message = `The application is behaving in ways its maker never intended.`;
        }
        return (
            <PageContainer className="error-page">
                <div className="graphic"><Unicorn /></div>
                <div className="text">
                    <h1 className="title">{error.statusCode} {error.message}</h1>
                    <p>{message}</p>
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
