var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = Relaks.createClass({
    displayName: 'UsersPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            var params = Route.match('/:server/:schema/users/:roleIds/');
            if (params) {
                params.roleIds = _.filter(_.map(_.split(params.roleIds, '+'), parseInt));
                params.navigation = {
                    top: {
                        dateSelection: false,
                        roleSelection: true,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'users'
                    }
                };
                return params;
            }
        },

        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            var roles = _.join(params.roleIds, '+') || 'all';
            return `/${server}/${schema}/users/${roles}/`;
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ by: this, server: server });
        var props = {
            stories: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<UsersPageSync {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            crtieria.id = userId;
            return db.findOne({ table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
            meanwhile.check();
        }).then(() => {
            var roleIds = route.parameters.roleIds;
            var searchString = route.query.q;
            var criteria = {};
            if (!_.isEmpty(roleIds)) {
                criteria.role_id = roleIds;
            }
            if (searchString) {
                criteria.search = searchString;
            }
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            // save last piece of data and render the page with everything
            props.stories = users
            props.loading = false;
            return <UsersPageSync {...props} />;
        });
    }
});

module.exports = React.createClass({
    displayName: 'UsersPageSync',
    propTypes: {
        loading: PropTypes.bool,
        users: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
    },
});
