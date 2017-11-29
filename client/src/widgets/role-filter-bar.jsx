var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
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

            locale: this.props.locale,
            route: this.props.route,
            theme: this.props.theme,
        };
        return meanwhile.show(<RoleFilterBarSync {...props} />, 1000);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                name: schema
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
        project: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return role ids in the URL
     *
     * @return {Array<Number>}
     */
    getRoleIds: function() {
        var route = this.props.route;
        var roleIds = _.map(_.split(route.parameters.roles, '+'), Number);
        return _.filter(roleIds);
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
        var roleIds = this.getRoleIds();
        var users = findUsers(this.props.users, role);
        var props = {
            role,
            users,
            locale: this.props.locale,
            theme: this.props.theme,
            selected: _.includes(roleIds, role.id),
            onRoleClick: this.handleRoleClick,
        };
        return <RoleFilterButton key={role.id} {...props} />;
    },

    /**
     * Called when user clicks on a role button
     *
     * @param  {Event} evt
     */
    handleRoleClick: function(evt) {
        var role = evt.role;
        var roleIds = this.getRoleIds();
        if (_.includes(roleIds, role.id)) {
            _.pull(roleIds, role.id);
        } else {
            roleIds.push(role.id);
        }
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.roles = roleIds;
        route.replace(route.component, params);
    },
});

var findUsers = Memoize(function(users, role) {
    return _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
});
