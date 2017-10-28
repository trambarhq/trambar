var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

var DailyActivities = require('data/daily-activities');
var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ImageSelector = require('widgets/image-selector');
var CollapsibleContainer = require('widgets/collapsible-container');
var ActivityChart = require('widgets/activity-chart');
var InputError = require('widgets/input-error');
var DataLossWarning = require('widgets/data-loss-warning');

require('./user-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'UserSummaryPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
                || Route.match('/projects/:projectId/members/:userId/?', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            var url;
            if (params.projectId) {
                url = `/projects/${params.projectId}/members/${params.userId}/`;
            } else {
                url = `/users/${params.userId}/`;
            }
            if (params && params.edit) {
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            user: null,
            roles: null,
            project: null,
            servers: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
        };
        meanwhile.show(<UserSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
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
        system: PropTypes.object,
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            showingSocialLinks: false,
            saving: false,
            problems: {},
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
        if (path === 'details.name') {
            var autoNameBefore = SlugGenerator.fromPersonalName(user.details.name);
            var autoNameAfter = SlugGenerator.fromPersonalName(newUser.details.name);
            if (!user.username || user.username === autoNameBefore) {
                newUser.username = autoNameAfter;
            }
        }
        if(_.size(newUser.username) > 128) {
            newUser.username = newUser.username.substr(0, 128);
        }
        var hasChanges = true;
        if (_.isEqual(newUser, this.props.user)) {
            newUser = null;
            hasChanges = false;
        }
        this.setState({ newUser, hasChanges });
    },

    /**
     * Look for problems in user object
     *
     * @return {Object}
     */
    findProblems: function() {
        var problems = {};
        var user = this.getUser();
        if (!user.username) {
            problems.username = 'validation-required';
        }
        if (!user.type) {
            problems.type = 'validation-required';
        }
        if (user.server_id == null) {
            if (user.type && user.type !== 'admin') {
                problems.server_id = 'validation-password-for-admin-only';
            }
        } else {
            if (!user.details.email) {
                problems.email = 'validation-required-for-oauth';
            }
        }
        return problems;
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
                ? require('pages/user-summary-page').getUrl({ projectId, userId, edit })
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
            } else {
                this.setState({ problems: {} });
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
        var p = this.props.locale.pick;
        var member = !!this.props.route.parameters.projectId;
        var user = this.getUser();
        var name = p(user.details.name);
        return (
            <div className="user-summary-page">
                {this.renderButtons()}
                <h2>{t(member ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
                {this.renderForm()}
                {this.renderSocialLinksToggle()}
                {this.renderSocialLinksForm()}
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
        var inputLanguages = _.get(this.props.system, 'settings.input_languages');
        var problems = this.state.problems;
        var nameProps = {
            id: 'name',
            value: user.details.name,
            availableLanguageCodes: inputLanguages,
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly,
        };
        var usernameProps = {
            id: 'username',
            value: user.username,
            locale: this.props.locale,
            onChange: this.handleUsernameChange,
            readOnly: readOnly || !!user.external_id,
        };
        var emailProps = {
            id: 'email',
            value: user.details.email,
            locale: this.props.locale,
            onChange: this.handleEmailChange,
            readOnly: readOnly,
        };
        var phoneProps = {
            id: 'phone',
            value: user.details.phone,
            locale: this.props.locale,
            onChange: this.handlePhoneChange,
            readOnly: readOnly,
        };
        var profileImageProps = {
            purpose: 'profile-image',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: user.details.resources,
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleProfileImageChange,
            readOnly,
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
            selected: _.isEmpty(userRoles),
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
                selected: _.get(user, 'hidden', false) === false,
                previous: _.get(userOriginal, 'hidden') === false,
                children: t('user-summary-visibility-shown'),
            },
            {
                name: 'hidden',
                selected: _.get(user, 'hidden', false) === true,
                previous: _.get(userOriginal, 'hidden') === true,
                children: t('user-summary-visibility-hidden'),
            }
        ];
        var authListProps = {
            onOptionClick: this.handleAuthOptionClick,
            readOnly,
        };
        var authOptionProps = _.concat([
            {
                name: 'none',
                selected: (user.server_id == null),
                previous: (userOriginal.server_id === null),
                children: t('user-summary-auth-server-none')
            },
            {
                name: '0',
                selected: (user.server_id === 0),
                previous: (userOriginal.server_id === 0),
                children: t('user-summary-auth-server-any')
            }
        ], _.map(servers, (server) => {
            return {
                name: String(server.id),
                selected: (user.server_id === server.id),
                previous: (userOriginal.server_id === server.id),
                children: p(server.details.title) || t(`server-type-${server.type}`)
            }
        }));
        return (
            <div className="form">
                <MultilingualTextField {...nameProps}>{t('user-summary-name')}</MultilingualTextField>
                <TextField {...usernameProps}>
                    {t('user-summary-username')}
                    <InputError>{t(problems.username)}</InputError>
                </TextField>
                <TextField {...emailProps}>
                    {t('user-summary-email')}
                    <InputError>{t(problems.email)}</InputError>
                </TextField>
                <TextField {...phoneProps}>{t('user-summary-phone')}</TextField>
                <ImageSelector {...profileImageProps}>{t('user-summary-profile-image')}</ImageSelector>
                <OptionList {...typeListProps}>
                    <label>
                        {t('user-summary-type')}
                        <InputError>{t(problems.type)}</InputError>
                    </label>
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
                    <label>
                        {t('user-summary-auth-server')}
                        <InputError>{t(problems.server_id)}</InputError>
                    </label>
                    {_.map(authOptionProps, renderOption)}
                </OptionList>
            </div>
        );
    },

    /**
     * Render heading that expands the social links section when clicked
     *
     * @return {ReactElement}
     */
    renderSocialLinksToggle: function() {
        var t = this.props.locale.translate;
        var iconName = (!this.state.showingSocialLinks)
                     ? 'angle-double-down'
                     : 'angle-double-up';
        return (
            <h2 className="social-toggle" onClick={this.handleSocialLinksToggleClick}>
                {t('user-summary-social-links')}
                {' '}
                <i className={`fa fa-${iconName}`} />
            </h2>
        )
    },

    /**
     * Render text fields for entering social network accounts
     *
     * @return {ReactElement}
     */
    renderSocialLinksForm: function() {
        var t = this.props.locale.translate;
        var user = this.getUser();
        var readOnly = !this.isEditing();
        var skypeProps = {
            id: 'skype',
            value: _.get(user, 'details.skype_username', ''),
            locale: this.props.locale,
            onChange: this.handleSkypeUsernameChange,
            readOnly,
        };
        var slackProps = {
            id: 'slack-team',
            value: _.get(user, 'details.slack_team_id', ''),
            locale: this.props.locale,
            onChange: this.handleSlackTeamIDChange,
            readOnly,
        };
        var slackProps = {
            id: 'slack-user',
            value: _.get(user, 'details.slack_user_id', ''),
            locale: this.props.locale,
            onChange: this.handleSlackUserIDChange,
            readOnly,
        };
        var ichatProps = {
            id: 'ichat',
            value: _.get(user, 'details.ichat_username', ''),
            locale: this.props.locale,
            onChange: this.handleIchatUsernameChange,
            readOnly,
        };
        var twitterProps = {
            id: 'twitter',
            value: _.get(user, 'details.twitter_username', ''),
            locale: this.props.locale,
            onChange: this.handleTwitterUsernameChange,
            readOnly,
        };
        var githubProps = {
            id: 'github',
            value: _.get(user, 'details.github_url', ''),
            locale: this.props.locale,
            onChange: this.handleGitHubURLChange,
            readOnly,
        };
        var gitlabProps = {
            id: 'github',
            value: _.get(user, 'details.gitlab_url', ''),
            locale: this.props.locale,
            onChange: this.handleGitlabURLChange,
            readOnly,
        };
        var linkedinProps = {
            id: 'skype',
            value: _.get(user, 'details.linkedin_url', ''),
            locale: this.props.locale,
            onChange: this.handleLinkedinURLChange,
            readOnly,
        };
        var stackoverflowProps = {
            id: 'skype',
            value: _.get(user, 'details.stackoverflow_url', ''),
            locale: this.props.locale,
            onChange: this.handleStackoverflowURLChange,
            readOnly,
        };
        return (
            <div className="form social">
                <CollapsibleContainer open={this.state.showingSocialLinks}>
                    <TextField {...skypeProps}>{t('user-summary-skype')}</TextField>
                    <TextField {...slackProps}>{t('user-summary-slack-team')}</TextField>
                    <TextField {...slackProps}>{t('user-summary-slack')}</TextField>
                    <TextField {...ichatProps}>{t('user-summary-ichat')}</TextField>
                    <TextField {...twitterProps}>{t('user-summary-twitter')}</TextField>
                    <TextField {...githubProps}>{t('user-summary-github')}</TextField>
                    <TextField {...gitlabProps}>{t('user-summary-gitlab')}</TextField>
                    <TextField {...linkedinProps}>{t('user-summary-linkedin')}</TextField>
                    <TextField {...stackoverflowProps}>{t('user-summary-stackoverflow')}</TextField>
                </CollapsibleContainer>
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
                <ActivityChart {...chartProps}>
                    {t('user-summary-statistics')}
                </ActivityChart>
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
        if (this.state.saving) {
            return;
        }
        var problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        this.setState({ saving: true, problems: {} }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            var user = this.getUser();
            var payloads = this.props.payloads;
            return payloads.prepare(user).then(() => {
                return db.start().then((currentUserId) => {
                    if (!user.id) {
                        // creating a new user
                        var projectId = this.getProjectId();
                        if (projectId) {
                            // add user to project--on approval, the user id
                            // will get added to user_ids of project on backend
                            user.requested_project_ids = [ projectId ];
                        }
                        user.approved = true;
                    }
                    return db.saveOne({ table: 'user' }, user).then((user) => {
                        // reattach blob, if any
                        payloads.reattach(user);
                        return payloads.dispatch(user).then(() => {
                            this.setState({ hasChanges: false, saving: false }, () => {
                                return this.setEditability(false, user);
                            });
                            return null;
                        });
                    });
                });
            }).catch((err) => {
                console.error(err);
                this.setState({ saving: false });
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
        var username = _.trim(_.toLower(username));
        this.setUserProperty(`username`, evt.target.value);
    },

    /**
     * Called when user changes email address
     *
     * @param  {Event} evt
     */
    handleEmailChange: function(evt) {
        this.setUserProperty(`details.email`, evt.target.value);
    },

    /**
     * Called when user changes phone number
     *
     * @param  {Event} evt
     */
    handlePhoneChange: function(evt) {
        this.setUserProperty(`details.phone`, evt.target.value);
    },

    /**
     * Called when user changes profile image
     *
     * @param  {Object} evt
     */
    handleProfileImageChange: function(evt) {
        this.setUserProperty(`details.resources`, evt.target.value);
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

    /**
     * Called when user clicks on social link heading
     *
     * @param  {Event} evt
     */
    handleSocialLinksToggleClick: function(evt) {
        this.setState({ showingSocialLinks: !this.state.showingSocialLinks });
    },

    /**
     * Called when user changes Skype username
     *
     * @param  {Event} evt
     */
    handleSkypeUsernameChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.skype_username`, username);
    },

    /**
     * Called when user changes Slack user id
     *
     * @param  {Event} evt
     */
    handleSlackUserIDChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.slack_user_id`, username);
    },

    /**
     * Called when user changes Slack team id
     *
     * @param  {Event} evt
     */
    handleSlackTeamIDChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.slack_team_id`, username);
    },

    /**
     * Called when user changes iChat username
     *
     * @param  {Event} evt
     */
    handleIchatUsernameChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.ichat_username`, username);
    },

    /**
     * Called when user changes Twitter username
     *
     * @param  {Event} evt
     */
    handleTwitterUsernameChange: function(evt) {
        var username = extractUsername(evt.target.value);
        this.setUserProperty(`details.twitter_username`, username);
    },

    /**
     * Called when user changes Linkedin username
     *
     * @param  {Event} evt
     */
    handleLinkedinURLChange: function(evt) {
        var url = _trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    },

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubURLChange: function(evt) {
        var url = _trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    },

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabURLChange: function(evt) {
        var url = _trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    },

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowURLChange: function(evt) {
        var url = _trim(evt.target.value);
        this.setUserProperty(`details.stackoverflow_url`, url);
    },
});

var emptyUser = {
    details: {},
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

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        var parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}
