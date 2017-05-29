var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var OnDemand = require('widgets/on-demand');

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
            var params = Route.match('/start/', url);
            if (params) {
                params.navigation = {
                    top: {
                        dateSelection: true,
                        roleSelection: true,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'news'
                    }
                };
                return params;
            }
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
        var items = _.map(_.range(1, 1000), this.renderItem);
        return Promise.resolve(
            <div>
                {items}
            </div>
        ).delay(25);
    },

    renderItem: function(number, i) {
        return (
            <OnDemand key={i} type="test" initial={i < 10}>
                <div style={{ display: 'inline-block', width: '40%', padding: 5, border: '1px solid white' }}>
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    This is a test and this is only a test.
                    ({number})
                </div>
            </OnDemand>
        );
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
