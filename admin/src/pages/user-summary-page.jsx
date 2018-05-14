var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var ProjectFinder = require('objects/finders/project-finder');
var RoleFinder = require('objects/finders/role-finder');
var UserFinder = require('objects/finders/user-finder');
var UserTypes = require('objects/types/user-types');
var UserSettings = require('objects/settings/user-settings');
var StatisticsFinder = require('objects/finders/statistics-finder');
var SystemFinder = require('objects/finders/system-finder');
var SlugGenerator = require('utils/slug-generator');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

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
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/users/:user/',
                '/projects/:project/members/:user/?',
            ], (params) => {
                return {
                    user: (params.user === 'new') ? 'new' : Route.parseId(params.user),
                    project: Route.parseId(params.project),
                    edit: !!query.edit,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
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
        meanwhile.show(<UserSummaryPageSync {...props} />);
        return db.start().then((currentUserId) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            // load selected user
            if (params.user !== 'new') {
                return UserFinder.findUser(db, params.user).then((user) => {
                    props.user = user;
                });
            }
        }).then(() => {
            meanwhile.show(<UserSummaryPageSync {...props} />);
            return RoleFinder.findActiveRoles(db).then((roles) => {
                props.roles = roles;
            })
        }).then(() => {
            // load project if project id is provider (i.e. member summary)
            if (params.project) {
                meanwhile.show(<UserSummaryPageSync {...props} />);
                return ProjectFinder.findProject(db, params.project).then((project) => {
                    props.project = project;
                });
            }
        }).then(() => {
            meanwhile.show(<UserSummaryPageSync {...props} />);
            if (props.project && props.user) {
                return StatisticsFinder.findDailyActivitiesOfUser(db, props.project, props.user).then((statistics) => {
                    props.statistics = statistics;
                });
            }
        }).then(() => {
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
        props = props || this.props;
        return (props.route.parameters.user === 'new');
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
        return this.isCreating(props) || props.route.parameters.edit;
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
            return route.replace(module.exports, params).then((replaced) => {
                if (replaced) {
                    this.setState({ problems: {} });
                }
            });
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
        var optionProps = _.map(UserTypes, (type) => {
            return {
                name: type,
                selected: userTypeCurr === type,
                previous: userTypePrev === type,
                children: t(`user-summary-type-${type}`),
            };
        });
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
        );
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
                    {this.renderIChatInput()}
                    {this.renderTwitterInput()}
                    {this.renderGithubURLInput()}
                    {this.renderGitlabURLInput()}
                    {this.renderLinkedInURLInput()}
                    {this.renderStackoverflowURLInput()}
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
    renderGithubURLInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.github_url'),
            locale: this.props.locale,
            onChange: this.handleGitHubURLChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-github')}</TextField>;
    },

    /**
     * Render input for Gitlab URL
     *
     * @return {ReactElement}
     */
    renderGitlabURLInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.gitlab_url'),
            locale: this.props.locale,
            onChange: this.handleGitlabURLChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-gitlab')}</TextField>;
    },

    /**
     * Render input for Linkedin URL
     *
     * @return {ReactElement}
     */
    renderLinkedInURLInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'linkedin',
            value: this.getUserProperty('details.linkedin_url'),
            locale: this.props.locale,
            onChange: this.handleLinkedinURLChange,
            readOnly: !this.isEditing(),
        };
        return <TextField {...props}>{t('user-summary-linkedin')}</TextField>;
    },

    /**
     * Render input for Stackoverflow URL
     *
     * @return {ReactElement}
     */
    renderStackoverflowURLInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'stackoverflow',
            value: this.getUserProperty('details.stackoverflow_url'),
            locale: this.props.locale,
            onChange: this.handleStackoverflowURLChange,
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
            folder: 'user',
            topic: 'user-summary',
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
            return db.start().then((userId) => {
                return db.saveOne({ table: 'user' }, user).then((user) => {
                    this.props.payloads.dispatch(user);
                    this.setState({ hasChanges: false, saving: false }, () => {
                        return this.setEditability(false, user);
                    });
                    if (this.props.project) {
                        // add user to member list if he's not there yet
                        var userIds = this.props.project.user_ids;
                        if (!_.includes(userIds, user.id)) {
                            var userIdsAfter = _.union(userIds, [ user.id ]);
                            var columns = {
                                id: this.props.project.id,
                                user_ids: userIdsAfter
                            };
                            return db.saveOne({ table: 'project' }, columns);
                        }
                    }
                    return null;
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
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    },

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubURLChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    },

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabURLChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    },

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowURLChange: function(evt) {
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
