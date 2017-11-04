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

require('./notifications-page.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/notifications/:date/?',
                '/:schema/notifications/?'
            ], (params) => {
                params.search = query.search;
                return params;
            })
        },

        getUrl: function(params) {
            var path = `/${params.schema}/notifications/`, query, hash;
            if (params.date) {
                path += `${params.date}/`;
            }
            if (params.search) {
                query = { search: params.search };
            }
            return { path, query, hash };
        },

        navigation: {
            top: {
                dateSelection: true,
                roleSelection: false,
                textSearch: true,
            },
            bottom: {
                section: 'notifications'
            }
        },
    },

    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
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
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.show(<NotificationsPageSync {...props} />);
        }).then(() => {
            // load reactions
            var criteria = {};
            criteria.target_user_id = props.currentUser.id;
            if (params.date) {
                var s = Moment(params.date);
                var e = s.clone().endOf('day');
                var rangeStart = s.toISOString();
                var rangeEnd = e.toISOString();
                var range = `[${rangeStart},${rangeEnd}]`;
                criteria.time_range = range;
            }
            if (params.search) {
                criteria.search = {
                    lang: this.props.locale.lang,
                    text: params.search,
                };
                criteria.limit = 100;
            } else {
                criteria.limit = 500;
            }
            return db.find({ table: 'notification', criteria });
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
            <div className="notifications-page">
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
