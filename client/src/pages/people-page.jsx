var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserList = require('lists/user-list');

require('./people-page.scss')

module.exports = Relaks.createClass({
    displayName: 'PeoplePage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            var params = Route.match('/:server/:schema/people/:roleIds/', url);
            if (params) {
                params.roleIds = _.filter(_.map(_.split(params.roleIds, '+'), parseInt));
                params.navigation = {
                    top: {
                        dateSelection: false,
                        roleSelection: true,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'people'
                    }
                };
                return params;
            }
        },

        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            var roles = _.join(params.roleIds, '+') || 'all';
            return `/${server}/${schema}/people/${roles}/`;
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            stories: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<PeoplePageSync {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
            meanwhile.check();
        }).then(() => {
            var roleIds = route.parameters.roleIds;
            var searchString = route.query.q;
            var criteria = {};
            if (!_.isEmpty(roleIds)) {
                criteria.role_ids = roleIds;
            }
            if (searchString) {
                criteria.search = searchString;
            }
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users
            return <PeoplePageSync {...props} />;
        });
    }
});

var PeoplePageSync = module.exports.Sync = React.createClass({
    displayName: 'PeoplePageSync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
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
        if (!this.props.currentUser || !this.props.users) {
            return null;
        }
        var listProps = {
            users: this.props.users,
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserList {...listProps} />
    },
});
