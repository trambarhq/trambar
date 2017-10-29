var React = require('react'), PropTypes = React.PropTypes;

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
                '/:schema/error/:code',
                '/global/error/:code',
            ], (params) => {
                return params;
            });
        },

        getUrl: function(params) {
            var path = `/${params.schema || 'global'}/error/${params.code}`, query, hash;
            return { path, query, hash };
        },
    },

    render: function() {
        var params = this.props.route.parameters;
        return <div>{params.code}</div>;
    }
});
