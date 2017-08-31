var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var NotificationList = require('lists/notification-list');

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
            var params = Route.match('//:server/:schema/notifications/:date/', url)
                      || Route.match('//:server/:schema/notifications/', url)
                      || Route.match('/:schema/notifications/:date/', url)
                      || Route.match('/:schema/notifications/', url);
            if (params) {
                params.navigation = {
                    top: {
                        dateSelection: true,
                        roleSelection: false,
                        textSearch: false,
                    },
                    bottom: {
                        section: 'notifications'
                    }
                };
                return params;
            }
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var date = params.date;
            var url = `/${schema}/notifications/`;
            if (server) {
                url = `//${server}` + url;
            }
            if (date) {
                url += `${date}/`;
            }
            return url;
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var date = route.parameters.date;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            currentUser: null,
            reactions: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.show(<NotificationsPageSync {...props} />);
        }).then(() => {
            // load reactions
            var criteria = {};
            criteria.target_user_ids = [ props.currentUser.id ];
            if (date) {
                var s = Moment(date);
                var e = s.clone().endOf('day');
                var rangeStart = s.toISOString();
                var rangeEnd = e.toISOString();
                var range = `[${rangeStart},${rangeEnd}]`;
                criteria.time_range = range;
            } else {
                criteria.limit = 100;
            }
            return db.find({ table: 'reaction', criteria });
        }).then((reactions) => {
            props.reactions = reactions;
            return <NotificationsPageSync {...props} />;
        });
    }
});

var NotificationsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationsPage.Sync',
    propTypes: {
        reactions: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div>
                {this.renderList()}
            </div>
        );
    },

    renderList: function() {
        var listProps = {
            reactions: this.props.reactions,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NotificationList {...listProps} />;
    },
});
