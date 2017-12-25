var React = require('react'), PropTypes = React.PropTypes;
var HttpError = require('errors/http-error');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/error/:code',
            ], (params) => {
                params.code = parseInt(params.code);
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/error/${params.code}`, query, hash;
            return { path, query, hash };
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        getOptions: function(currentRoute) {
            return {};
        },
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var params = this.props.route.parameters;
        var error = new HttpError(params.code)
        var Unicorn = require('unicorn.svg');
        var message;
        if (params.code === 404) {
            message = `The page you're trying to reach doesn't exist. But then again, who does?`;
        } else {
            message = `The application is behaving in ways its maker never intended.`;
        }
        return (
            <div className="error-page">
                <div>
                    <div className="graphic"><Unicorn /></div>
                    <div className="text">
                        <h1 className="title">{error.statusCode} {error.message}</h1>
                        <p>{message}</p>
                    </div>
                </div>
            </div>
        );
    }
});
