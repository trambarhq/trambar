import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RoleFinder from 'objects/finders/role-finder';
import * as UserFinder from 'objects/finders/user-finder';
import UserTypes from 'objects/types/user-types';
import * as UserSettings from 'objects/settings/user-settings';
import * as StatisticsFinder from 'objects/finders/statistics-finder';
import * as SystemFinder from 'objects/finders/system-finder';
import * as SlugGenerator from 'utils/slug-generator';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import InstructionBlock from 'widgets/instruction-block';
import TextField from 'widgets/text-field';
import MultilingualTextField from 'widgets/multilingual-text-field';
import OptionList from 'widgets/option-list';
import ImageSelector from 'widgets/image-selector';
import CollapsibleContainer from 'widgets/collapsible-container';
import ActivityChart from 'widgets/activity-chart';
import InputError from 'widgets/input-error';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';
import ErrorBoundary from 'widgets/error-boundary';

import './user-summary-page.scss';

/**
 * Asynchronous component that retrieves data needed by the User/Member Summary page.
 *
 * @extends AsyncComponent
 */
class UserSummaryPage extends AsyncComponent {
    static displayName = 'UserSummaryPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, payloads } = this.props;
        let { projectID, userID, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let creating = (userID === 'new');
        let props = {
            database,
            route,
            env,
            payloads,
            projectID,
            editing: editing || creating,
            creating,
        };
        meanwhile.show(<UserSummaryPageSync {...props} />);
        let currentUserID = await db.start();
        props.system = await SystemFinder.findSystem(db);
        // load selected user
        if (!creating) {
            props.user = await UserFinder.findUser(db, userID);
        }
        meanwhile.show(<UserSummaryPageSync {...props} />);
        props.roles = await RoleFinder.findActiveRoles(db)
        // load project if project id is provided (i.e. member summary)
        if (projectID) {
            meanwhile.show(<UserSummaryPageSync {...props} />);
            props.project = await ProjectFinder.findProject(db, projectID);
        }
        meanwhile.show(<UserSummaryPageSync {...props} />);
        if (props.project && props.user) {
            props.statistics = await StatisticsFinder.findDailyActivitiesOfUser(db, props.project, props.user);
        }
        return <UserSummaryPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the User/Member Summary page.
 *
 * @extends PureComponent
 */
class UserSummaryPageSync extends PureComponent {
    static displayName = 'UserSummaryPageSync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            newUser: null,
            hasChanges: false,
            showingSocialLinks: false,
            saving: false,
            adding: false,
            problems: {},
        };
    }

    /**
     * Reset the edit state when edit ends
     *
     * @param  {Object} props
     * @param  {Object} state
     */
    static getDerivedStateFromProps(props, state) {
        let { editing } = props;
        if (!editing) {
            return {
                newUser: null,
                hasChanges: false,
                problems: {}
            };
        }
        return null;
    }

    /**
     * Return edited copy of user object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getUser(state) {
        let { user } = this.props;
        let { newUser } = this.state;
        if (!state || state === 'current') {
            return newUser || user || emptyUser;
        } else {
            return user || emptyUser;
        }
    }

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getUserProperty(path, state) {
        let user = this.getUser(state);
        return _.get(user, path);
    }

    /**
     * Modify a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        let { user } = this.props;
        let newUser = this.getUser('current');
        let newUserAfter = _.decoupleSet(newUser, path, value);
        if (path === 'details.name') {
            let autoNameBefore = SlugGenerator.fromPersonalName(newUser.details.name);
            let autoNameAfter = SlugGenerator.fromPersonalName(newUserAfter.details.name);
            if (!newUser.username || newUser.username === autoNameBefore) {
                newUserAfter.username = autoNameAfter;
            }
        }
        if(_.size(newUserAfter.username) > 128) {
            newUserAfter.username = newUserAfter.username.substr(0, 128);
        }
        let hasChanges = true;
        if (_.isEqual(newUserAfter, user)) {
            newUserAfter = null;
            hasChanges = false;
        }
        this.setState({ newUser: newUserAfter, hasChanges });
    }

    /**
     * Look for problems in user object
     *
     * @return {Object}
     */
    findProblems() {
        let problems = {};
        let user = this.getUser();
        if (!user.username) {
            problems.username = 'validation-required';
        }
        if (!user.type) {
            problems.type = 'validation-required';
        }
        return problems;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object|null} newUser
     *
     * @return {Promise}
     */
    setEditability(edit, newUser) {
        let { route, creating } = this.props;
        if (creating && !edit && !newUser) {
            // return to list when cancelling user creation
            return this.returnToList();
        } else {
            let params = _.clone(route.params);
            params.editing = edit || undefined;
            if (newUser) {
                // use id of newly created user
                params.userID = newUser.id;
            }
            return route.replace(route.name, params);
        }
    }

    /**
     * Return to user or member list
     *
     * @return {Promise}
     */
    returnToList() {
        let { route, projectID } = this.props;
        if (projectID) {
            let params = { projectID };
            return route.push('member-list-page', params);
        } else {
            return route.push('user-list-page');
        }
    }

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew() {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.userID = 'new';
        return route.replace(route.name, params);
    }

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages() {
        let { system } = this.props;
        return _.get(system, 'settings.input_languages', [])
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env, project, projectID } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t, p } = env.locale;
        let user = this.getUser();
        let name = p(user.details.name);
        return (
            <div className="user-summary-page">
                {this.renderButtons()}
                <h2>{t(projectID ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
                {this.renderSocialLinksToggle()}
                {this.renderSocialLinksForm()}
                {this.renderInstructions()}
                {this.renderChart()}
                <ActionConfirmation ref={setters.confirmation} env={env} />
                <DataLossWarning changes={hasChanges} env={env} route={route} />
            </div>
        );
    }

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, user, projectID, editing } = this.props;
        let { hasChanges, adding } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('user-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t(projectID ? 'user-summary-member-save' : 'user-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            let active = (user) ? !user.deleted && !user.disabled : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
            } else {
                preselected = 'reactivate';
            }
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t(projectID ? 'user-summary-member-return' : 'user-summary-return')}
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
                        {t(projectID ? 'user-summary-member-edit' : 'user-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render form for entering user details
     *
     * @return {ReactElement}
     */
    renderForm() {
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
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput() {
        let { env, editing } = this.props;
        let { t, p } = env.locale;
        // not supporting multilingual name yet
        let name = p(this.getUserProperty('details.name'));
        let props = {
            id: 'name',
            value: name,
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-name')}
            </TextField>
        );
    }

    /**
     * Render username input
     *
     * @return {ReactElement}
     */
    renderUsernameInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'username',
            value: this.getUserProperty('username'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleUsernameChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-username')}
                <InputError>{t(problems.username)}</InputError>
            </TextField>
        );
    }

    /**
     * Render e-mail input
     *
     * @return {ReactElement}
     */
    renderEmailInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'email',
            type: 'email',
            value: this.getUserProperty('details.email'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleEmailChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-email')}
                <InputError>{t(problems.email)}</InputError>
            </TextField>
        );
    }

    /**
     * Render phone input
     *
     * @return {ReactElement}
     */
    renderPhoneInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'phone',
            type: 'tel',
            value: this.getUserProperty('details.phone'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handlePhoneChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-phone')}
            </TextField>
        );
    }

    /**
     * Render profile image selector
     *
     * @return {ReactElement}
     */
    renderProfileImageSelector() {
        let { database, env, payloads, editing } = this.props;
        let { t } = env.locale;
        let props = {
            purpose: 'profile-image',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: this.getUserProperty('details.resources'),
            readOnly: !editing,
            database,
            env,
            payloads,
            onChange: this.handleProfileImageChange,
        };
        return (
            <ImageSelector {...props}>
                {t('user-summary-profile-image')}
            </ImageSelector>
        );
    }

    /**
     * Render user type selector
     *
     * @return {ReactElement}
     */
    renderTypeSelector() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let userTypeCurr = this.getUserProperty('type', 'current');
        let userTypePrev = this.getUserProperty('type', 'original');
        let optionProps = _.map(UserTypes, (type) => {
            return {
                name: type,
                selected: userTypeCurr === type,
                previous: userTypePrev === type,
                children: t(`user-summary-type-${type}`),
            };
        });
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleTypeOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('user-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render role selector
     *
     * @return {ReactElement}
     */
    renderRoleSelector() {
        let { env, roles, editing } = this.props;
        let { t, p } = env.locale;
        let userRolesCurr = this.getUserProperty('role_ids', 'current') || [];
        let userRolesPrev = this.getUserProperty('role_ids', 'original') || [];
        let newUser = !!this.getUserProperty('id');
        roles = sortRoles(roles, env);
        let optionProps = _.map(roles, (role) => {
            return {
                name: String(role.id),
                selected: _.includes(userRolesCurr, role.id),
                previous: _.includes(userRolesPrev, role.id),
                children: p(role.details.title) || role.name
            }
        });
        optionProps.unshift({
            name: 'none',
            selected: _.isEmpty(userRolesCurr),
            previous: (newUser) ? _.isEmpty(userRolesPrev) : undefined,
            children: t('user-summary-role-none')
        });
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleRoleOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('user-summary-roles')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render heading that expands the social links section when clicked
     *
     * @return {ReactElement}
     */
    renderSocialLinksToggle() {
        let { env } = this.props;
        let { showingSocialLinks } = this.state;
        let { t } = env.locale;
        let iconName = (showingSocialLinks) ? 'angle-double-up' : 'angle-double-down';
        return (
            <h2 className="social-toggle" onClick={this.handleSocialLinksToggleClick}>
                {t('user-summary-social-links')}
                {' '}
                <i className={`fa fa-${iconName}`} />
            </h2>
        );
    }

    /**
     * Render text fields for entering social network accounts
     *
     * @return {ReactElement}
     */
    renderSocialLinksForm() {
        let { env, editing } = this.props;
        let { showingSocialLinks } = this.state;
        let { t } = env.locale;
        let user = this.getUser();
        let readOnly = !editing;
        return (
            <div className="form social">
                <CollapsibleContainer open={showingSocialLinks}>
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
    }

    /**
     * Render input for Skype username
     *
     * @return {ReactElement}
     */
    renderSkypeNameInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'skype',
            value: this.getUserProperty('details.skype_username'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleSkypeUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-skype')}</TextField>;
    }

    /**
     * Render input for iChat username
     *
     * @return {ReactElement}
     */
    renderIChatInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'ichat',
            value: this.getUserProperty('details.ichat_username'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleIchatUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-ichat')}</TextField>;
    }

    /**
     * Render input for Twitter username
     *
     * @return {ReactElement}
     */
    renderTwitterInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'twitter',
            value: this.getUserProperty('details.twitter_username'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleTwitterUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-twitter')}</TextField>;
    }

    /**
     * Render input for Github URL
     *
     * @return {ReactElement}
     */
    renderGithubURLInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'github',
            type: 'url',
            value: this.getUserProperty('details.github_url'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleGitHubURLChange,
        };
        return <TextField {...props}>{t('user-summary-github')}</TextField>;
    }

    /**
     * Render input for Gitlab URL
     *
     * @return {ReactElement}
     */
    renderGitlabURLInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'github',
            type: 'url',
            value: this.getUserProperty('details.gitlab_url'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleGitlabURLChange,
        };
        return <TextField {...props}>{t('user-summary-gitlab')}</TextField>;
    }

    /**
     * Render input for Linkedin URL
     *
     * @return {ReactElement}
     */
    renderLinkedInURLInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'linkedin',
            type: 'url',
            value: this.getUserProperty('details.linkedin_url'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleLinkedinURLChange,
        };
        return <TextField {...props}>{t('user-summary-linkedin')}</TextField>;
    }

    /**
     * Render input for Stackoverflow URL
     *
     * @return {ReactElement}
     */
    renderStackoverflowURLInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'stackoverflow',
            type: 'url',
            value: this.getUserProperty('details.stackoverflow_url'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleStackoverflowURLChange,
        };
        return <TextField {...props}>{t('user-summary-stackoverflow')}</TextField>;
    }

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions() {
        let { env, editing } = this.props;
        let instructionProps = {
            folder: 'user',
            topic: 'user-summary',
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    /**
     * Render activity chart
     *
     * @return {ReactElement|null}
     */
    renderChart() {
        let { env, statistics, projectID, creating } = this.props;
        let { t } = env.locale;
        if (!projectID) {
            return null;
        }
        if (creating) {
            return null;
        }
        let chartProps = {
            statistics,
            env,
        };
        return (
            <div className="statistics">
                <ErrorBoundary env={env}>
                    <ActivityChart {...chartProps}>
                        {t('user-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }

    /**
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<User>}
     */
    changeFlags(flags) {
        let { database, env, user } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let userAfter = _.assign({}, user, flags);
        return db.saveOne({ table: 'user' }, userAfter).catch((err) => {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        });
    }

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('user-summary-confirm-disable');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let userAfter = this.changeFlags({ disabled: true });
            if (userAfter) {
                return this.returnToList();
            }
        }
    }

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('user-summary-confirm-delete');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let userAfter = await this.changeFlags({ deleted: true });
            if (userAfter) {
                return this.returnToList();
            }
        }
    }

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleReactivateClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('user-summary-confirm-reactivate');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            await this.changeFlags({ disabled: false, deleted: false });
        }
    }

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick = async (evt) => {
        await this.returnToList();
    }

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick = async (evt) => {
        await this.startNew();
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = async (evt) => {
        await this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = async (evt) => {
        await this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        let { database, env, payloads, project } = this.props;
        let { saving } = this.state;
        if (saving) {
            return;
        }
        let problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        let user = this.getUser();
        this.setState({ saving: true, adding: !user.id, problems: {} }, async () => {
            try {
                let schema = 'global';
                let db = database.use({ schema, by: this });
                let currentUserID = await db.start();
                let userAfter = await db.saveOne({ table: 'user' }, user);
                payloads.dispatch(userAfter);
                this.setState({ hasChanges: false, saving: false }, () => {
                    return this.setEditability(false, userAfter);
                });
                if (project) {
                    // add user to member list if he's not there yet
                    let userIDs = project.user_ids;
                    if (!_.includes(userIDs, userAfter.id)) {
                        let userIDsAfter = _.union(userIDs, [ userAfter.id ]);
                        let columns = {
                            id: project.id,
                            user_ids: userIDsAfter
                        };
                        return db.saveOne({ table: 'project' }, columns);
                    }
                }
            } catch (err) {
                let problems;
                if (err.statusCode === 409) {
                    problems = { username: 'validation-duplicate-user-name' };
                } else {
                    problems = { unexpected: err.message };
                }
                this.setState({ problems, saving: false });
            }
        });
    }

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleNameChange = (evt) => {
        this.setUserProperty(`details.name`, evt.target.value);
    }

    /**
     * Called when user changes username
     *
     * @param  {Event} evt
     */
    handleUsernameChange = (evt) => {
        let username = _.toLower(evt.target.value).replace(/[^\w\-]+/g, '');
        this.setUserProperty(`username`, username);
    }

    /**
     * Called when user changes email address
     *
     * @param  {Event} evt
     */
    handleEmailChange = (evt) => {
        this.setUserProperty(`details.email`, evt.target.value);
    }

    /**
     * Called when user changes phone number
     *
     * @param  {Event} evt
     */
    handlePhoneChange = (evt) => {
        this.setUserProperty(`details.phone`, evt.target.value);
    }

    /**
     * Called when user changes profile image
     *
     * @param  {Object} evt
     */
    handleProfileImageChange = (evt) => {
        this.setUserProperty(`details.resources`, evt.target.value);
    }

    /**
     * Called when user changes user type
     *
     * @param  {Object} evt
     */
    handleTypeOptionClick = (evt) => {
        this.setUserProperty('type', evt.name);
    }

    /**
     * Called when user clicks on a role
     *
     * @param  {Object} evt
     */
    handleRoleOptionClick = (evt) => {
        let user = this.getUser();
        let roleIDs = user.role_ids;
        if (evt.name === 'none') {
            roleIDs = [];
        } else {
            let roleID = parseInt(evt.name);
            if (_.includes(roleIDs, roleID)) {
                roleIDs = _.without(roleIDs, roleID);
            } else {
                roleIDs = _.concat(roleIDs, roleID);
            }
        }
        this.setUserProperty('role_ids', roleIDs);
    }

    /**
     * Called when user clicks on social link heading
     *
     * @param  {Event} evt
     */
    handleSocialLinksToggleClick = (evt) => {
        let { showingSocialLinks } = this.state;
        this.setState({ showingSocialLinks: !showingSocialLinks });
    }

    /**
     * Called when user changes Skype username
     *
     * @param  {Event} evt
     */
    handleSkypeUsernameChange = (evt) => {
        let username = _.trim(evt.target.value);
        this.setUserProperty(`details.skype_username`, username);
    }

    /**
     * Called when user changes iChat username
     *
     * @param  {Event} evt
     */
    handleIchatUsernameChange = (evt) => {
        let username = _.trim(evt.target.value);
        this.setUserProperty(`details.ichat_username`, username);
    }

    /**
     * Called when user changes Twitter username
     *
     * @param  {Event} evt
     */
    handleTwitterUsernameChange = (evt) => {
        let username = extractUsername(evt.target.value);
        this.setUserProperty(`details.twitter_username`, username);
    }

    /**
     * Called when user changes Linkedin username
     *
     * @param  {Event} evt
     */
    handleLinkedinURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    }

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    }

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    }

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.stackoverflow_url`, url);
    }
}

let emptyUser = {
    details: {},
    settings: UserSettings.default,
};

let sortRoles = memoizeWeak(null, function(roles, env) {
    let { p } = env.locale;
    let name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

let findRoles = memoizeWeak(null, function(roles, user) {
    if (user.role_ids) {
        let hash = _.keyBy(roles, 'id');
        return _.filter(_.map(user.role_ids, (id) => {
            return hash[id];
        }));
    }
});

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        let parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}

export {
    UserSummaryPage as default,
    UserSummaryPage,
    UserSummaryPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserSummaryPage.propTypes = {
        editing: PropTypes.bool,
        projectID: PropTypes.number,
        userID: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.oneOf([ 'new' ]),
        ]).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    };
    UserSummaryPageSync.propTypes = {
        editing: PropTypes.bool,
        projectID: PropTypes.number,
        creating: PropTypes.bool,
        system: PropTypes.object,
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        statistics: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    };
}
