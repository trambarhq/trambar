var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var RoleFilterButton = require('widgets/role-filter-button');

require('./role-filter-bar.scss');

module.exports = Relaks.createClass({
    displayName: 'RoleFilterBar',
    propTypes: {
        settings: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            roles: null,
            users: null,
            project: null,

            settings: this.props.settings,
            locale: this.props.locale,
            route: this.props.route,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleFilterBarSync {...props} />, 1000);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                name: params.schema
            };
            return db.findOne({ schema: 'global', table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load project members
            var criteria = {
                id: props.project.user_ids
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
        }).then(() => {
            // load roles that members have
            var roleIds = _.flatten(_.map(props.users, 'role_ids'));
            var criteria = {
                id: _.uniq(roleIds)
            };
            return db.find({ schema: 'global', table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return <RoleFilterBarSync {...props} />;
        });
    },
});

var RoleFilterBarSync = module.exports.Sync = React.createClass({
    displayName: 'RoleFilterBar.Sync',
    propTypes: {
        settings: PropTypes.object.isRequired,
        project: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {[type]}
     */
    render: function() {
        return (
            <div className="role-filter-bar">
                {this.renderButtons()}
            </div>
        );
    },

    /**
     * Render buttons
     *
     * @return {Array<ReactElement>|ReactElement}
     */
    renderButtons: function() {
        var roles = this.props.roles;
        if (!_.isEmpty(roles)) {
            return _.map(roles, this.renderButton);
        } else {
            // render a blank button to maintain spacing
            // show "No roles" if database query yielded nothing
            var props = {
                role: (roles !== null) ? null : undefined,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <RoleFilterButton {...props} />;
        }
    },

    /**
     * Render button for given role
     *
     * @param  {Object} role
     *
     * @return {ReactElement}
     */
    renderButton: function(role) {
        var users = findUsers(this.props.users, role);
        var route = this.props.route;
        var roleIds = route.parameters.roles;
        var params = _.clone(this.props.settings.route.parameters);
        if (_.includes(roleIds, role.id)) {
            params.roles = _.without(roleIds, role.id);
        } else {
            params.roles = _.concat(roleIds, role.id);
        }
        var url = route.find(route.component, params);
        var props = {
            role,
            users,
            url,
            locale: this.props.locale,
            theme: this.props.theme,
            selected: _.includes(roleIds, role.id),
            onRoleClick: this.handleRoleClick,
        };
        return <RoleFilterButton key={role.id} {...props} />;
    },
});

var findUsers = Memoize(function(users, role) {
    return _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
});
