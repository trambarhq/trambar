import React, { PureComponent } from 'react';
import HTTPError from 'errors/http-error';

// widgets
import Unicorn from 'unicorn.svg';
import PageContainer from 'widgets/page-container';

require('./error-page.scss');

class ErrorPage extends PureComponent {
    static displayName = 'ErrorPage';

        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
    static parseURL(path, query, hash) {
        return Route.match(path, [
            '/:schema/error/:code',
            '/error/:code',
        ], (params) => {
            return {
                schema: params.schema,
                code: parseInt(params.code)
            };
        });
    }

    /**
     * Generate a URL of this page based on given parameters
     *
     * @param  {Object} params
     *
     * @return {Object}
     */
    static getURL(params) {
        var path = `/error/${params.code}`, query, hash;
        if (params.schema) {
            path = `/${params.schema}` + path;
        }
        return { path, query, hash };
    }

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        var params = currentRoute.parameters;
        var hasSchema = !!params.schema;
        return {
            navigation: {
                top: hasSchema,
                bottom: hasSchema,
            }
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var params = this.props.route.parameters;
        var error = new HTTPError(params.code)
        var message;
        if (params.code === 404) {
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ErrorPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
