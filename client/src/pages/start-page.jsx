var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./start-page.scss');

module.exports = Relaks.createClass({
    displayName: 'StartPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/start/', url);
        },

        getUrl: function(params) {
            return '/start/';
        },
    },

    getInitialState: function() {
        return {
            number: 0
        };
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ by: this });
        var props = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(
            <div>Loading...</div>
        );
        var items = _.map(_.range(1, 100), (number, i) => {
            return <li key={i}>Item #{number}</li>;
        })
        return Promise.resolve(
            <div>
                <ul>{items}</ul>
            </div>
        ).delay(25);
    },
});

var StartPageSync = module.exports.Sync = React.createClass({
    displayName: 'StartPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {

    }
});
