var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var UserView = require('widgets/user-view');

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
            dailyActivities: null,

            users: this.props.users,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<UserListSync {...props} />);
        return db.start().then((userId) => {
            // load daily-activities statistics
            var criteria = {
                type: 'daily-activities',

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
        var userProps = {
            user,
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
    return _.orderBy(users, [ 'ptime' ], [ 'desc' ]);
});
