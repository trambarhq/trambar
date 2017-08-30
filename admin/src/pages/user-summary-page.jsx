var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var DailyActivities = require('data/daily-activities');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var OptionList = require('widgets/option-list');
var ActivityChart = require('widgets/activity-chart');
var DataLossWarning = require('widgets/data-loss-warning');

require('./user-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'UserSummaryPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/users/:userId/', url)
                || Route.match('/projects/:projectId/members/:userId/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            var url;
            if (params.projectId) {
                url = `/projects/${params.projectId}/members/${params.userId}/`;
            } else {
                url = `/users/${params.userId}/`;
            }
            if (query && query.edit) {
                url += `?edit=1`;
            }
            return url;
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            user: null,
            roles: null,
            project: null,
            servers: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            // load selected user
            var userId = parseInt(this.props.route.parameters.userId);
            if (userId) {
                var criteria = {
                    id: userId
                };
                return db.findOne({ table: 'user', criteria });
            }
        }).then((user) => {
            props.user = user;
            meanwhile.show(<UserSummaryPageSync {...props} />);
        }).then(() => {
            // load all roles
            var criteria = {};
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            meanwhile.show(<UserSummaryPageSync {...props} />);
        }).then(() => {
            // load project if project id is provider (i.e. member summary)
            var projectId = parseInt(this.props.route.parameters.projectId);
            if (projectId) {
                var criteria = {
                    id: projectId
                };
                return db.findOne({ table: 'project', criteria });
            }
        }).then((project) => {
            props.project = project;
            meanwhile.show(<UserSummaryPageSync {...props} />);
        }).then(() => {
            // load all servers
            var criteria = {};
            return db.find({ table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            meanwhile.show(<UserSummaryPageSync {...props} />);
        }).then(() => {
            // load statistics if project is specified (unless we're creating a
            // new member)
            if (props.project && props.user) {
                return DailyActivities.loadUserStatistics(db, props.project, [ props.user ]).then((hash) => {
                    return hash[props.user.id];
                });
            }
        }).then((statistics) => {
            props.statistics = statistics;
            return <UserSummaryPageSync {...props} />;
        });
    }
});

var UserSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'UserSummaryPage.Sync',
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            newUser: null,
            hasChanges: false,
        };
    },

    /**
     * Return edited copy of user object or the original object
     *
     * @return {Object}
     */
    getUser: function() {
        if (this.isEditing()) {
            return this.state.newUser || this.props.user || emptyUser;
        } else {
            return this.props.user || emptyUser;
        }
    },

    /**
     * Modify a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty: function(path, value) {
        var user = this.getUser();
        var newUser = _.decoupleSet(user, path, value);
        var hasChanges = true;
        if (_.isEqual(newUser, this.props.user)) {
            newUser = null;
            hasChanges = false;
        }
        this.setState({ newUser, hasChanges });
    },

    /**
     * Return project id specified in URL
     *
     * @return {Number|undefined}
     */
    getProjectId: function() {
        if (this.props.route.parameters.projectId) {
            return parseInt(this.props.route.parameters.projectId);
        }
    },

    /**
     * Return user id specified in URL
     *
     * @return {Number}
     */
    getUserId: function() {
        return parseInt(this.props.route.parameters.userId);
    },

    /**
     * Return true when the URL indicate we're creating a new user
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isCreating: function(props) {
        return (this.props.route.parameters.userId === 'new');
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return this.isCreating() || !!parseInt(props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object|null} newUser
     *
     * @return {Promise}
     */
    setEditability: function(edit, newUser) {
        var projectId = this.getProjectId();
        var userId = (newUser) ? newUser.id : this.getUserId();
        var url = (userId)
                ? require('pages/user-summary-page').getUrl({ projectId, userId }, { edit })
                : (projectId)
                ? require('pages/member-list-page').getUrl({ projectId })
                : require('pages/user-list-page').getUrl();
        var replace = (projectId) ? true : false;
        return this.props.route.change(url, replace);
    },

    /**
     * Reset the edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    newUser: null,
                    hasChanges: false,
                });
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var member = !!this.props.route.parameters.projectId;
        var user = this.getUser();
        var name = _.get(user, 'details.name');
        return (
            <div className="user-summary-page">
                {this.renderButtons()}
                <h2>{t(member ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
                {this.renderForm()}
                {this.renderInstructions()}
                {this.renderChart()}
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var member = !!this.getProjectId();
        if (this.isEditing()) {
            return (
                <div className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('user-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t(member ? 'user-summary-member-save' : 'user-summary-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div className="buttons">
                    <PushButton className="add" onClick={this.handleEditClick}>
                        {t(member ? 'user-summary-member-edit' : 'user-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render form for entering user details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var readOnly = !this.isEditing();
        var roles = sortRoles(this.props.roles, this.props.locale);
        var user = this.getUser();
        var userOriginal = this.props.user || emptyUser;
        var userRoles = findRoles(roles, user);
        var userRolesOriginal = findRoles(roles, userOriginal);
        var servers = this.props.servers;

        var nameProps = {
            id: 'name',
            value: _.get(user, 'details.name', ''),
            onChange: this.handleNameChange,
            readOnly,
        };
        var usernameProps = {
            id: 'username',
            value: _.get(user, 'username', ''),
            onChange: this.handleUsernameChange,
            readOnly: readOnly || !!user.external_id,
        };
        var emailProps = {
            id: 'email',
            value: _.get(user, 'details.email', ''),
            onChange: this.handleEmailChange,
            readOnly: readOnly,
        };
        var typeListProps = {
            onOptionClick: this.handleTypeOptionClick,
            readOnly,
        };
        var typeOptionProps = [
            {
                name: 'guest',
                selected: user.type === 'guest',
                previous: userOriginal.type === 'guest',
                children: t('user-summary-type-guest'),
            },
            {
                name: 'member',
                selected: user.type === 'member',
                previous: userOriginal.type === 'member',
                children: t('user-summary-type-member'),
            },
            {
                name: 'admin',
                selected: user.type === 'admin',
                previous: userOriginal.type === 'admin',
                children: t('user-summary-type-admin'),
            },
        ];
        var roleListProps = {
            onOptionClick: this.handleRoleOptionClick,
            readOnly,
        };
        var roleOptionProps = _.concat({
            name: 'none',
            selected: userRoles && _.isEmpty(userRoles),
            previous: userRolesOriginal && _.isEmpty(userRolesOriginal),
            children: t('user-summary-role-none')
        }, _.map(roles, (role) => {
            return {
                name: String(role.id),
                selected: _.includes(userRoles, role),
                previous: _.includes(userRolesOriginal, role),
                children: p(role.details.title) || p.name
            }
        }));
        var visibilityListProps = {
            onOptionClick: this.handleVisibilityOptionClick,
            readOnly,
        };
        var visibilityOptionProps = [
            {
                name: 'show',
                selected: _.get(user, 'hidden') === false,
                previous: _.get(userOriginal, 'hidden') === false,
                children: t('user-summary-visibility-shown'),
            },
            {
                name: 'hidden',
                selected: _.get(user, 'hidden') === true,
                previous: _.get(userOriginal, 'hidden') === true,
                children: t('user-summary-visibility-hidden'),
            }
        ];
        var authListProps = {
            onOptionClick: this.handleAuthOptionClick,
            readOnly,
        };
        var authOptionProps = _.concat({
            name: 'none',
            selected: !user.server_id,
            previous: !userOriginal.server_id,
            children: t('user-summary-auth-server-none')
        }, _.map(servers, (server) => {
            return {
                name: String(server.id),
                selected: (user.server_id === server.id),
                previous: (userOriginal.server_id === server.id),
                children: p(server.details.title) || t(`server-type-${server.type}`)
            }
        }));
        return (
            <div className="form">
                <TextField {...nameProps}>{t('user-summary-name')}</TextField>
                <TextField {...usernameProps}>{t('user-summary-username')}</TextField>
                <TextField {...emailProps}>{t('user-summary-email')}</TextField>
                <OptionList {...typeListProps}>
                    <label>{t('user-summary-type')}</label>
                    {_.map(typeOptionProps, renderOption)}
                </OptionList>
                <OptionList {...roleListProps}>
                    <label>{t('user-summary-roles')}</label>
                    {_.map(roleOptionProps, renderOption)}
                </OptionList>
                <OptionList {...visibilityListProps}>
                    <label>{t('user-summary-visibility')}</label>
                    {_.map(visibilityOptionProps, renderOption)}
                </OptionList>
                <OptionList {...authListProps}>
                    <label>{t('user-summary-auth-server')}</label>
                    {_.map(authOptionProps, renderOption)}
                </OptionList>
            </div>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            topic: 'user',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    },

    /**
     * Render activity chart
     *
     * @return {ReactElement|null}
     */
    renderChart: function() {
        if (!this.getProjectId()) {
            return null;
        }
        if (this.isCreating()) {
            return null;
        }
        var t = this.props.locale.translate;
        var chartProps = {
            statistics: this.props.statistics,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return (
            <div className="statistics">
                <h2>{t('user-summary-statistics')}</h2>
                <ActivityChart {...chartProps} />
            </div>
        );
    },

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        return this.setEditability(true);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        return this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var user = this.getUser();
        return db.start().then((currentUserId) => {
            if (!user.id) {
                // creating a new user
                var projectId = this.getProjectId();
                if (projectId) {
                    // add user to project
                    user.requested_project_ids = [ projectId ];
                }
                user.approved = true;
            }
            return db.saveOne({ table: 'user' }, user).then((user) => {
                this.setState({ hasChanges: false }, () => {
                    return this.setEditability(false, user);
                });
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        this.setUserProperty(`details.name`, evt.target.value);
    },

    /**
     * Called when user changes username
     *
     * @param  {Event} evt
     */
    handleUsernameChange: function(evt) {
        this.setUserProperty(`username`, evt.target.value);
    },

    /**
     * Called when user changes username
     *
     * @param  {Event} evt
     */
    handleEmailChange: function(evt) {
        this.setUserProperty(`details.email`, evt.target.value);
    },

    /**
     * Called when user changes user type
     *
     * @param  {Object} evt
     */
    handleTypeOptionClick: function(evt) {
        this.setUserProperty('type', evt.name);
    },

    /**
     * Called when user clicks on a role
     *
     * @param  {Object} evt
     */
    handleRoleOptionClick: function(evt) {
        var user = this.getUser();
        var roleIds = _.slice(user.role_ids);
        if (evt.name === 'none') {
            roleIds = [];
        } else {
            var roleId = parseInt(evt.name);
            if (_.includes(roleIds, roleId)) {
                _.pull(roleIds, roleId);
            } else {
                roleIds.push(roleId);
            }
        }
        this.setUserProperty('role_ids', roleIds);
    },

    /**
     * Called when user clicks on a role
     *
     * @param  {Object} evt
     */
    handleVisibilityOptionClick: function(evt) {
        var hidden = (evt.name === 'hidden');
        this.setUserProperty('hidden', hidden);
    },

    /**
     * Called when user clicks on an OAuth server
     *
     * @param  {Object} evt
     */
    handleAuthOptionClick: function(evt) {
        var user = this.getUser();
        var serverId;
        if (evt.name === 'none') {
            serverId = null;
        } else if (evt.name === 'any') {
            if (user.server_id === 0) {
                serverId = null;
            } else {
                serverId = 0;
            }
        } else {
            var serverId = parseInt(evt.name);
            if (user.server_id === serverId) {
                serverId = null;
            }
        }
        this.setUserProperty('server_id', serverId);
    },

});

var emptyUser = {
    details: {}
};

var sortRoles = Memoize(function(roles, locale) {
    var p = locale.pick;
    var name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

var findRoles = Memoize(function(roles, user) {
    if (user.role_ids) {
        var hash = _.keyBy(roles, 'id');
        return _.filter(_.map(user.role_ids, (id) => {
            return hash[id];
        }));
    }
});

function renderOption(props, i) {
    return <option key={i} {...props} />;
}
