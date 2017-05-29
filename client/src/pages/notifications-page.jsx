var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = Relaks.createClass({
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

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, by: this });
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
        meanwhile.show(<NotificationsPageSync {...props} />);
        return db.start().then((userId) => {
            return <NotificationsPageSync {...props} />;
        });
    }
});

var NotificationsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationsPage.Sync',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div>Notifications page</div>
        );
    }
});
