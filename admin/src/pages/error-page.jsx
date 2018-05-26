var React = require('react'), PropTypes = React.PropTypes;
var HTTPError = require('errors/http-error');

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
        parseURL: function(path, query) {
            return Route.match(path, [
                '/error/:code',
            ], (params) => {
                return {
                    code: parseInt(params.code)
                };
            });
        },

        getURL: function(params) {
            var code = params.code;
            if (params.error) {
                code = params.error.statusCode;
            } else {
                code = params.code || 400;
            }
            var path = `/error/${code}`, query;
            return { path, query };
        },

        getOptions: function(route) {
            return {};
        },
    },

    render: function() {
        var params = this.props.route.parameters;
        var error = new HTTPError(params.code)
        var Unicorn = require('unicorn.svg');
        return (
            <div className="error-page">
                <div>
                    <div className="graphic"><Unicorn /></div>
                    <div className="text">
                        <h1 className="title">{error.statusCode} {error.message}</h1>
                        <p>
                            The page you're trying to reach doesn't exist. But then again, who does?
                        </p>
                    </div>
                </div>
            </div>
        );
    }
});
