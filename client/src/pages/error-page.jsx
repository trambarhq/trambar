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
        parseUrl: function(url) {
            return Route.match('/error/:errorCode/', url);
        },

        getUrl: function(params) {
            var errorCode = params.errorCode;
            return `/error/${errorCode}/`;
        },
    },

    render: function() {
        var errorCode = this.props.route.parameters.errorCode;
        return <div>{errorCode}</div>;
    }
});
