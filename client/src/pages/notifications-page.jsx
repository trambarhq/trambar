var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = React.createClass({
    displayName: 'NotificationsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            var params = Route.match('/:server/:schema/notifications/', url);
            if (params) {
                params.navigation = {
                    top: {},
                    bottom: {
                        section: 'notifications'
                    }
                }
                return params;
            }
        },

        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            return `/${server}/${schema}/notifications/`;
        },
    },

    render: function() {

    }
});

module.exports.Async = Relaks.createClass({
    displayName: 'NotificationsPage.Async',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var projLink = URLParser.parse(this.props.projectUrl);
        var db = this.props.database.use({ by: this }, projLink);
        var props = {
            project: null,
            currentUser: null,
            stories: null,
            reactions: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        // save newly arrived data into props and render page partially
        var progress = (newProps) => {
            _.assign(props, newProps);
            meanwhile.show(<NewsPage {...props} />);
        };
        // call progress() then return a promise for starting a chain
        var start = () => {
            progress({ loading: true });
            return db.start();
        };
        // save last piece of data and render the page with everything
        var finish = (newProps) => {
            db.finish();
            _.assign(props, newProps, { loading: false });
            return <NewsPage {...props} />;
        };
    }
});
