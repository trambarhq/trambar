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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/error/:code',
            ], (params) => {
                params.code = parseInt(params.code);
                return params;
            });
        },

        getUrl: function(params) {
            var path = `/error/${params.code}`, query, hash;
            return { path, query, hash };
        },

        getOptions: function(route) {
            return {};
        },
    },

    render: function() {
        var params = this.props.route.parameters;
        var error = new HttpError(params.code)
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
