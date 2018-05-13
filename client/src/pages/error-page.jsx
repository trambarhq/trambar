var React = require('react'), PropTypes = React.PropTypes;
var HTTPError = require('errors/http-error');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PageContainer = require('widgets/page-container');

require('./error-page.scss');

module.exports = React.createClass({
    displayName: 'ErrorPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/error/:code',
                '/error/:code',
            ], (params) => {
                return {
                    schema: params.schema,
                    code: parseInt(params.code)
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/error/${params.code}`, query, hash;
            if (params.schema) {
                path = `/${params.schema}` + path;
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
            var params = currentRoute.parameters;
            var hasSchema = !!params.schema;
            return {
                navigation: {
                    top: hasSchema,
                    bottom: hasSchema,
                }
            };
        },
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var params = this.props.route.parameters;
        var error = new HTTPError(params.code)
        var Unicorn = require('unicorn.svg');
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
});
