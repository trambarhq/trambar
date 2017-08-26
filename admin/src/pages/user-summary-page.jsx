var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var OptionList = require('widgets/option-list');

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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
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
            var criteria = {};
            return db.find({ table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return <UserSummaryPageSync {...props} />;
        });
    }
});

var UserSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'UserSummaryPage.Sync',
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),

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
        var userBefore = this.getUser();
        var userAfter = _.decoupleSet(userBefore, path, value);
        if (_.isEqual(userAfter, this.props.user)) {
            userAfter = null;
        }
        this.setState({ newUser: userAfter });
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
     * @return {Boolean}
     */
    isCreating: function() {
        return (this.props.route.parameters.userId === 'new');
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @return {Boolean}
     */
    isEditing: function() {
        return this.isCreating() || !!parseInt(this.props.route.query.edit);
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
                : require('pages/user-list-page').getUrl({ projectId });
        var replace = (projectId) ? true : false;
        return this.props.route.change(url, replace);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var member = !!this.props.route.parameters.projectId;
        var name = _.get(this.props.user, 'details.name');
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
                    <PushButton className="save" onClick={this.handleSaveClick}>
                        {t(member ? 'user-summary-member-save' : 'user-summary-save')}
                    </PushButton>
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
     * Render statistics bar chart
     *
     * @return {ReactElement|null}
     */
    renderChart: function() {
        if (!this.getProjectId()) {
            return null;
        }
        return (
            <div className="statistics">
                <h2>Statistics</h2>
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
        // TODO: add confirmation
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
            return db.saveOne({ table: 'user' }, user).then((user) => {
                return this.setEditability(false, user);
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.name`, text);
    },

    /**
     * Called when user changes username
     *
     * @param  {Event} evt
     */
    handleUsernameChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`username`, text);
    },

    /**
     * Called when user changes username
     *
     * @param  {Event} evt
     */
    handleEmailChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.email`, text);
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
