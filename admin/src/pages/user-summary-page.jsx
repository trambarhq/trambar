var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var HttpError = require('errors/http-error');
var UserSettings = require('data/user-settings');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

var DailyActivities = require('data/daily-activities');
var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ImageSelector = require('widgets/image-selector');
var CollapsibleContainer = require('widgets/collapsible-container');
var ActivityChart = require('widgets/activity-chart');
var InputError = require('widgets/input-error');
var ActionConfirmation = require('widgets/action-confirmation');
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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/users/:user/',
                '/projects/:project/members/:user/?',
            ], (params) => {
                if (params.user !== 'new') {
                    params.user = parseInt(params.user);
                }
                if (params.project) {
                    params.project = parseInt(params.project);
                }
                params.edit = !!query.edit;
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path, query, hash;
            if (params.project) {
                path = `/projects/${params.project}/members/${params.user}/`;
            } else {
                path = `/users/${params.user}/`;
            }
            if (params.edit) {
                query = { edit: 1 };
            }
            return { path, query, hash };
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
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            user: null,
            roles: null,
            project: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
        };
        meanwhile.show(<UserSummaryPageSync {...props} />, 250);
        return db.start().then((userId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            // load selected user
            if (params.user !== 'new') {
                var criteria = { id: params.user };
                return db.findOne({ table: 'user', criteria, required: true });
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
            if (params.project) {
                var criteria = { id: params.project };
                return db.findOne({ table: 'project', criteria, required: true });
            }
        }).then((project) => {
            props.project = project;
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
        }).catch(HttpError, (error) => {
            this.props.route.replace(require('pages/error-page'), { error });
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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            newUser: null,
            hasChanges: false,
            showingSocialLinks: false,
            saving: false,
            adding: false,
            problems: {},
        };
    },

    /**
     * Return edited copy of user object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getUser: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newUser || this.props.user || emptyUser;
        } else {
            return this.props.user || emptyUser;
        }
    },

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getUserProperty: function(path, state) {
        var user = this.getUser(state);
        return _.get(user, path);
    },

    /**
     * Modify a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty: function(path, value) {
        var user = this.getUser('current');
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
        return problems;
    },

    /**
     * Return true when the URL indicate we're creating a new user
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isCreating: function(props) {
        return (this.props.route.parameters.user === 'new');
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
        return this.isCreating() || props.route.query.edit;
    },

    /**
     * Return true when the URL includes project id
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isProjectMember: function(props) {
        props = props || this.props;
        return !!props.route.parameters.project;
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
        var route = this.props.route;
        if (this.isCreating() && !edit && !newUser) {
            // return to list when cancelling user creation
            return this.returnToList();
        } else {
            var params = _.clone(route.parameters);
            params.edit = edit;
            if (newUser) {
                // use id of newly created user
                params.user = newUser.id;
            }
            return route.replace(module.exports, params);
        }
    },

    /**
     * Return to user or member list
     *
     * @return {Promise}
     */
    returnToList: function() {
        var route = this.props.route;
        if (route.parameters.project) {
            var params = { project: route.parameters.project };
            return route.push(require('pages/member-list-page'), params);
        } else {
            return route.push(require('pages/user-list-page'));
        }
    },

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew: function() {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.user = 'new';
        return route.replace(module.exports, params);
    },

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages: function() {
        return _.get(this.props.system, 'settings.input_languages', [])
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
        var member = this.isProjectMember();
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
                <ActionConfirmation ref={this.components.setters.confirmation} locale={this.props.locale} theme={this.props.theme} />
                <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
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
        var member = this.isProjectMember();
        if (this.isEditing()) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('user-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t(member ? 'user-summary-member-save' : 'user-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            var user = this.props.user;
            var active = (user) ? !user.deleted && !user.disabled : true;
            var preselected;
            if (active) {
                preselected = (this.state.adding) ? 'add' : 'return';
            } else {
                preselected = 'reactivate';
            }
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t(member ? 'user-summary-member-return' : 'user-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('user-summary-add')}
                        </option>
                        <option name="disable" disabled={!active} separator onClick={this.handleDisableClick}>
                            {t('user-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('user-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={this.handleReactivateClick}>
                            {t('user-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
        return (
            <div className="form">
                {this.renderNameInput()}
                {this.renderUsernameInput()}
                {this.renderEmailInput()}
                {this.renderPhoneInput()}
                {this.renderProfileImageSelector()}
                {this.renderTypeSelector()}
                {this.renderRoleSelector()}
                {this.renderVisiblityOptions()}
            </div>
        );
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        // not supporting multilingual name yet
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(this.getUserProperty('details.name'));
        var props = {
            id: 'name',
            value: name,
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly: !this.isEditing(),
        };
        return (
            <TextField {...props}>
                {t('user-summary-name')}
            </TextField>
        );
    },

    /**
     * Render username input
     *
     * @return {ReactElement}
     */
    renderUsernameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'username',
            value: this.getUserProperty('username'),
            locale: this.props.locale,
            onChange: this.handleUsernameChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <TextField {...props}>
                {t('user-summary-username')}
                <InputError>{t(problems.username)}</InputError>
            </TextField>
        );
    },

    /**
     * Render e-mail input
     *
     * @return {ReactElement}
     */
    renderEmailInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'email',
            value: this.getUserProperty('details.email'),
            locale: this.props.locale,
            onChange: this.handleEmailChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <TextField {...props}>
                {t('user-summary-email')}
                <InputError>{t(problems.email)}</InputError>
            </TextField>
        );
    },

    /**
     * Render phone input
     *
     * @return {ReactElement}
     */
    renderPhoneInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'phone',
            value: this.getUserProperty('details.phone'),
            locale: this.props.locale,
            onChange: this.handlePhoneChange,
            readOnly: !this.isEditing(),
        };
        return (
            <TextField {...props}>
                {t('user-summary-phone')}
            </TextField>
        );
    },

    /**
     * Render profile image selector
     *
     * @return {ReactElement}
     */
    renderProfileImageSelector: function() {
        var t = this.props.locale.translate;
        var props = {
            purpose: 'profile-image',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: this.getUserProperty('details.resources'),
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleProfileImageChange,
            readOnly: !this.isEditing(),
        };
        return (
            <ImageSelector {...props}>
                {t('user-summary-profile-image')}
            </ImageSelector>
        );
    },

    /**
     * Render user type selector
     *
     * @return {ReactElement}
     */
    renderTypeSelector: function() {
        var t = this.props.locale.translate;
        var userTypeCurr = this.getUserProperty('type', 'current');
        var userTypePrev = this.getUserProperty('type', 'original');
        var optionProps = [
            {
                name: 'guest',
                selected: userTypeCurr === 'guest',
                previous: userTypePrev === 'guest',
                children: t('user-summary-type-guest'),
            },
            {
                name: 'regular',
                selected: userTypeCurr === 'regular',
                previous: userTypePrev === 'regular',
                children: t('user-summary-type-regular'),
            },
            {
                name: 'moderator',
                selected: userTypeCurr === 'moderator',
                previous: userTypePrev === 'moderator',
                children: t('user-summary-type-moderator'),
            },
            {
                name: 'admin',
                selected: userTypeCurr === 'admin',
                previous: userTypePrev === 'admin',
                children: t('user-summary-type-admin'),
            },
        ];
        var listProps = {
            onOptionClick: this.handleTypeOptionClick,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <OptionList {...listProps}>
                <label>
                    {t('user-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render role selector
     *
     * @return {ReactElement}
     */
    renderRoleSelector: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var userRolesCurr = this.getUserProperty('role_ids', 'current') || [];
        var userRolesPrev = this.getUserProperty('role_ids', 'original') || [];
        var newUser = !!this.getUserProperty('id');
        var roles = sortRoles(this.props.roles, this.props.locale);
        var optionProps = _.concat({
            name: 'none',
            selected: _.isEmpty(userRolesCurr),
            previous: (newUser) ? _.isEmpty(userRolesPrev) : undefined,
            children: t('user-summary-role-none')
        }, _.map(roles, (role) => {
            return {
                name: String(role.id),
                selected: _.includes(userRolesCurr, role.id),
                previous: _.includes(userRolesPrev, role.id),
                children: p(role.details.title) || p.name
            }
        }));
        var listProps = {
            onOptionClick: this.handleRoleOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('user-summary-roles')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        )
    },

    /**
     * Render visibility options
     *
     * @return {ReactElement}
     */
    renderVisiblityOptions: function() {
        var t = this.props.locale.translate;
        var hiddenCurr = this.getUserProperty('hidden', 'current') || false;
        var hiddenPrev = this.getUserProperty('hidden', 'original') || false;
        var newUser = !!this.getUserProperty('id');
        var optionProps = [
            {
                name: 'show',
                selected: hiddenCurr === false,
                previous: (newUser) ? hiddenPrev === false : undefined,
                children: t('user-summary-visibility-shown'),
            },
            {
                name: 'hidden',
                selected: hiddenCurr === true,
                previous: hiddenCurr === true,
                children: t('user-summary-visibility-hidden'),
            }
        ];
        var listProps = {
            onOptionClick: this.handleVisibilityOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('user-summary-visibility')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
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
        return (
            <div className="form social">
                <CollapsibleContainer open={this.state.showingSocialLinks}>
                    {this.renderSkypeNameInput()}
                    {this.renderSlackTeamInput()}
                    {this.renderSlackIdInput()}
                    {this.renderIChatInput()}
                    {this.renderTwitterInput()}
                    {this.renderGithubUrlInput()}
                    {this.renderGitlabUrlInput()}
                    {this.renderLinkedInUrlInput()}
                    {this.renderStackoverflowUrlInput()}
                </CollapsibleContainer>
            </div>
        );
    },

    /**
     * Render input for Skype username
     *
     * @return {ReactElement}
     */
    renderSkypeNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'skype',
            value: this.getUserProperty('details.skype_username'),
            locale: this.props.locale,
            onChange: this.handleSkypeUsernameChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-skype')}</TextField>;
    },

    /**
     * Render input for Slack team name
     *
     * @return {ReactElement}
     */
    renderSlackTeamInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'slack-team',
            value: this.getUserProperty('details.slack_team_id'),
            locale: this.props.locale,
            onChange: this.handleSlackTeamIDChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-slack-team')}</TextField>;
    },

    /**
     * Render input for Slack userid
     *
     * @return {ReactElement}
     */
    renderSlackIdInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'slack-user',
            value: this.getUserProperty('details.slack_user_id'),
            locale: this.props.locale,
            onChange: this.handleSlackUserIDChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-slack')}</TextField>;
    },

    /**
     * Render input for iChat username
     *
     * @return {ReactElement}
     */
    renderIChatInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'ichat',
            value: this.getUserProperty('details.ichat_username'),
            locale: this.props.locale,
            onChange: this.handleIchatUsernameChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-ichat')}</TextField>;
    },

    /**
     * Render input for Twitter username
     *
     * @return {ReactElement}
     */
    renderTwitterInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'twitter',
            value: this.getUserProperty('details.twitter_username'),
            locale: this.props.locale,
            onChange: this.handleTwitterUsernameChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-twitter')}</TextField>;
    },

    /**
     * Render input for Github URL
     *
     * @return {ReactElement}
     */
    renderGithubUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.github_url'),
            locale: this.props.locale,
            onChange: this.handleGitHubUrlChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-github')}</TextField>;
    },

    /**
     * Render input for Gitlab URL
     *
     * @return {ReactElement}
     */
    renderGitlabUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.gitlab_url'),
            locale: this.props.locale,
            onChange: this.handleGitlabUrlChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-gitlab')}</TextField>;
    },

    /**
     * Render input for Linkedin URL
     *
     * @return {ReactElement}
     */
    renderLinkedInUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'linkedin',
            value: this.getUserProperty('details.linkedin_url'),
            locale: this.props.locale,
            onChange: this.handleLinkedinUrlChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-linkedin')}</TextField>;
    },

    /**
     * Render input for Stackoverflow URL
     *
     * @return {ReactElement}
     */
    renderStackoverflowUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'stackoverflow',
            value: this.getUserProperty('details.stackoverflow_url'),
            locale: this.props.locale,
            onChange: this.handleStackoverflowUrlChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-stackoverflow')}</TextField>;
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
        if (!this.isProjectMember()) {
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
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<User>}
     */
    changeFlags: function(flags) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var userAfter = _.assign({}, this.props.user, flags);
        return db.saveOne({ table: 'user' }, userAfter);
    },

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('user-summary-confirm-disable');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('user-summary-confirm-delete');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ deleted: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleReactivateClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('user-summary-confirm-reactivate');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: false, deleted: false });
            }
        });
    },

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick: function(evt) {
        return this.returnToList();
    },

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        return this.startNew();
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
        var user = this.getUser();
        this.setState({ saving: true, adding: !user.id, problems: {} }, () => {
            var schema = 'global';
            var db = this.props.database.use({ schema, by: this });
            var payloads = this.props.payloads;
            return payloads.prepare(schema, user).then(() => {
                return db.start().then((userId) => {
                    if (!user.id) {
                        // creating a new user
                        var projectId = this.props.route.parameters.project;
                        if (projectId) {
                            // add user to project--on approval, the user id
                            // will get added to user_ids of project on backend
                            user.requested_project_ids = [ projectId ];
                        }
                        user.approved = true;
                    }
                    return db.saveOne({ table: 'user' }, user).then((user) => {
                        // reattach blob, if any
                        payloads.reattach(schema, user);
                        return payloads.dispatch(schema, user).then(() => {
                            this.setState({ hasChanges: false, saving: false }, () => {
                                return this.setEditability(false, user);
                            });
                            return null;
                        });
                    });
                });
            }).catch((err) => {
                var problems = {};
                if (err.statusCode === 409) {
                    problems.username = 'validation-duplicate-user-name';
                } else {
                    problems.general = err.message;
                    console.error(err);
                }
                this.setState({ problems, saving: false });
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
        var username = _.toLower(evt.target.value).replace(/\W+/g, '');
        this.setUserProperty(`username`, username);
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
    handleLinkedinUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    },

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    },

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    },

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.stackoverflow_url`, url);
    },
});

var emptyUser = {
    details: {},
    settings: UserSettings.default,
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

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        var parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}
