var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');
var Moment = require('moment');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var UserView = require('views/user-view');

require('./user-list.scss');

module.exports = Relaks.createClass({
    displayName: 'UserList',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            roles: null,
            dailyActivities: null,

            users: this.props.users,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<UserListSync {...props} />, 250);
        return db.start().then((userId) => {
            // load roles
            var roleIds = _.flatten(_.map(props.users, 'role_ids'));
            var criteria = {
                id: _.uniq(roleIds)
            };
            return db.find({ schema: 'global', table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            meanwhile.show(<UserListSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            var now = Moment();
            var end = now.clone().endOf('month');
            var start = now.clone().startOf('month').subtract(1, 'month');
            var range = `[${start.toISOString()},${end.toISOString()}]`;
            var criteria = {
                type: 'daily-activities',
                filters: _.map(props.users, (user) => {
                    return {
                        user_ids: [ user.id ],
                        time_range: range,
                    };
                }),
            };
            return db.find({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.dailyActivities = statistics;
            props.loading = false;
            return <UserListSync {...props} />;
        });
    }
});

var UserListSync = module.exports.Sync = React.createClass({
    displayName: 'UserList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        roles: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,
    },

    render: function() {
        var users = this.props.users ? sortUsers(this.props.users) : null;
        return (
            <div className="user-list">
                {_.map(users, this.renderUser)}
            </div>
        );
    },

    renderUser: function(user, index) {
        var roles = this.props.roles ? findRoles(this.props.roles, user) : null;
        var dailyActivities = this.props.dailyActivities ? findDailyActivities(this.props.dailyActivities, user) : null;
        var userProps = {
            user,
            roles,
            dailyActivities,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key: user.id,
        };
        return (
            <OnDemand key={user.id} type="users" initial={index < 10}>
                <UserView {...userProps} />
            </OnDemand>
        );
    },
});

var sortUsers = MemoizeWeak(function(users) {
    return _.orderBy(users, [ 'details.name' ], [ 'asc' ]);
});

var findRoles = MemoizeWeak(function(roles, user) {
    if (user) {
        return _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
    } else {
        return [];
    }
});

var findDailyActivities = MemoizeWeak(function(dailyActivities, user) {
    if (user) {
        return _.find(dailyActivities, (stats) => {
            return stats.filters.user_ids[0] === user.id;
        });
    } else {
        return null;
    }
});
