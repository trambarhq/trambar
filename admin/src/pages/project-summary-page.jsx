import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'utils/component-refs';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectSettings from 'objects/settings/project-settings';
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
import ActivityChart from 'widgets/activity-chart';
import InputError from 'widgets/input-error';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';
import ErrorBoundary from 'widgets/error-boundary';

import './project-summary-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Project Summary page.
 *
 * @extends AsyncComponent
 */
class ProjectSummaryPage extends AsyncComponent {
    static displayName = 'ProjectSummaryPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, payloads, projectID, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let creating = (projectID === 'new');
        let props = {
            database,
            route,
            env,
            payloads,
            editing: editing || creating,
            creating,
        };
        meanwhile.show(<ProjectSummaryPageSync {...props} />);
        let currentUserID = await db.start();
        props.system = await SystemFinder.findSystem(db)
        if (!creating) {
            props.project = await ProjectFinder.findProject(db, projectID);
            meanwhile.show(<ProjectSummaryPageSync {...props} />);
            props.statistics = await StatisticsFinder.findDailyActivitiesOfProject(db, props.project);
        }
        return <ProjectSummaryPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Project Summary page.
 *
 * @extends PureComponent
 */
class ProjectSummaryPageSync extends PureComponent {
    static displayName = 'ProjectSummaryPageSync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            newProject: null,
            saving: false,
            adding: false,
            problems: {},
        };
    }

    /**
     * Reset edit state when edit ends
     *
     * @param  {Object} props
     * @param  {Object} state
     */
    static getDerivedStateFromProps(props, state) {
        let { editing } = props;
        if (!editing) {
            return {
                newProject: null,
                hasChanges: false,
                problems: {},
            };
        }
    }

    /**
     * Return edited copy of project object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getProject(state) {
        let { project } = this.props;
        let { newProject } = this.state;
        if (!state || state === 'current') {
            return newProject || project || emptyProject;
        } else {
            return project || emptyProject;
        }
    }

    /**
     * Return a prop of the project object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getProjectProperty(path, state) {
        let project = this.getProject(state);
        return _.get(project, path);
    }

    /**
     * Modify a property of the project object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setProjectProperty(path, value) {
        let { project } = this.props;
        let newProject = this.getProject('current');
        let newProjectAfter = _.decoupleSet(newProject, path, value);
        if (path === 'details.title') {
            if (!newProject.id) {
                let autoNameBefore = SlugGenerator.fromTitle(newProject.details.title);
                let autoNameAfter = SlugGenerator.fromTitle(newProjectAfter.details.title);
                if (!newProject.name || newProject.name === autoNameBefore) {
                    newProjectAfter.name = autoNameAfter;
                }
            }
        }
        if(_.size(newProjectAfter.name) > 128) {
            newProjectAfter.name = newProjectAfter.name.substr(0, 128);
        }
        let hasChanges = true;
        if (_.isEqual(newProjectAfter, project)) {
            newProjectAfter = null;
            hasChanges = false;
        }
        this.setState({ newProject: newProjectAfter, hasChanges });
    }

    /**
     * Look for problems in project object
     *
     * @return {Object}
     */
    findProblems() {
        let problems = {};
        let newProject = this.getProject();
        let name = _.toLower(_.trim(newProject.name));
        let reservedNames = [ 'global', 'admin', 'public', 'srv' ];
        if (!name) {
            problems.name = 'validation-required';
        } else if (_.includes(reservedNames, name)) {
            problems.name = 'validation-illegal-project-name';
        }
        return problems;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object|null}  newProject
     *
     * @return {Promise}
     */
    async setEditability(edit, newProject) {
        let { route, creating } = this.props;
        if (creating && !edit && !newProject) {
            // return to list when cancelling project creation
            this.returnToList();
        } else {
            let params = _.clone(route.params);
            params.editing = edit || undefined;
            if (newProject) {
                // use id of newly created project
                params.projectID = newProject.id;
            }
            let replaced = await route.replace(route.name, params);
            if (replaced) {
                this.setState({ problems: {} });
            }
        }
    }

    /**
     * Return to project list
     *
     * @return {Promise}
     */
    returnToList() {
        let { route } = this.props;
        return route.push('project-list-page');
    }

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew() {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.projectID = 'new';
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
        let { route, env } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t, p } = env.locale;
        let newProject = this.getProject();
        let title = p(newProject.details.title) || newProject.name;
        return (
            <div className="project-summary-page">
                {this.renderButtons()}
                <h2>{t('project-summary-$title', title)}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
                {this.renderInstructions()}
                {this.renderChart()}
                <ActionConfirmation ref={setters.confirmation} env={env} />
                <DataLossWarning changes={hasChanges} route={route} env={env} />
            </div>
        );
    }

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, project, editing } = this.props;
        let { hasChanges, adding } = this.state;
        let { t, p } = env.locale;
        if (editing) {
            // using keys here to force clearing of focus
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('project-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('project-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            let active = (project) ? !project.deleted && !project.archived : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
            } else {
                preselected = 'restore';
            }
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('project-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('project-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={this.handleArchiveClick}>
                            {t('project-summary-archive')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('project-summary-delete')}
                        </option>
                        <option name="restore" hidden={active} onClick={this.handleRestoreClick}>
                            {t('project-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('project-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render form for entering project details
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderDescriptionInput()}
                {this.renderEmblemSelector()}
                {this.renderMembershipOptions()}
                {this.renderAccessControlOptions()}
            </div>
        );
    }

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'title',
            value: this.getProjectProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            readOnly: !editing,
            env,
            onChange: this.handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('project-summary-title')}
            </MultilingualTextField>
        );
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'name',
            value: this.getProjectProperty('name'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('project-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'description',
            value: this.getProjectProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            readOnly: !editing,
            env,
            onChange: this.handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('project-summary-description')}
            </MultilingualTextField>
        );
    }

    /**
     * Render image selector
     *
     * @return {ReactElement}
     */
    renderEmblemSelector() {
        let { database, env, payloads, editing } = this.props;
        let { t } = env.locale;
        let props = {
            purpose: 'project-emblem',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: this.getProjectProperty('details.resources'),
            readOnly: !editing,
            database,
            env,
            payloads,
            onChange: this.handleEmblemChange,
        };
        return (
            <ImageSelector {...props}>
                {t('project-summary-emblem')}
            </ImageSelector>
        );
    }

    /**
     * Render project membership option list
     *
     * @return {ReactElement}
     */
    renderMembershipOptions() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let memOptsCurr = this.getProjectProperty('settings.membership', 'current') || {};
        let memOptsPrev = this.getProjectProperty('settings.membership', 'original') || {};
        let newProject = !!this.getProjectProperty('id');
        let optionProps = [
            {
                name: 'manual',
                selected: !_.some(memOptsCurr),
                previous: (newProject) ? !_.some(memOptsPrev) : undefined,
                children: t('project-summary-new-members-manual'),
            },
            {
                name: 'allow_user_request',
                selected: memOptsCurr.allow_user_request,
                previous: memOptsPrev.allow_user_request,
                children: t('project-summary-new-members-join-user'),
            },
            {
                name: 'approve_user_request',
                selected: memOptsCurr.approve_user_request,
                previous: memOptsPrev.approve_user_request,
                hidden: !memOptsCurr.allow_user_request,
                children: t('project-summary-new-members-auto-accept-user'),
            },
            {
                name: 'allow_guest_request',
                selected: memOptsCurr.allow_guest_request,
                previous: memOptsPrev.allow_guest_request,
                children: t('project-summary-new-members-join-guest'),
            },
            {
                name: 'approve_guest_request',
                selected: memOptsCurr.approve_guest_request,
                previous: memOptsPrev.approve_guest_request,
                hidden: !memOptsCurr.allow_guest_request,
                children: t('project-summary-new-members-auto-accept-guest'),
            },
        ];
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleMembershipOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-new-members')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render project access control option list
     *
     * @return {ReactElement}
     */
    renderAccessControlOptions() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let acOptsCurr = this.getProjectProperty('settings.access_control', 'current') || {};
        let acOptsPrev = this.getProjectProperty('settings.access_control', 'original') || {};
        let newProject = !!this.getProjectProperty('id');
        let optionProps = [
            {
                name: 'members_only',
                selected: !_.some(acOptsCurr),
                previous: (newProject) ? !_.some(acOptsPrev) : undefined,
                children: t('project-summary-access-control-member-only')
            },
            {
                name: 'grant_view_access',
                selected: acOptsCurr.grant_view_access,
                previous: acOptsPrev.grant_view_access,
                children: t('project-summary-access-control-non-member-view')
            },
            {
                name: 'grant_comment_access',
                selected: acOptsCurr.grant_comment_access,
                previous: acOptsPrev.grant_comment_access,
                hidden: !acOptsCurr.grant_view_access,
                children: t('project-summary-access-control-non-member-comment')
            },
        ];
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleAccessControlOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-access-control')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let instructionProps = {
            folder: 'project',
            topic: 'project-summary',
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
        let { env, statistics, creating } = this.props;
        let { t } = env.locale;
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
                        {t('project-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }

    /**
     * Save project with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Project>}
     */
    changeFlags(flags) {
        let { database, project } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let projectAfter = _.assign({}, project, flags);
        return db.saveOne({ table: 'project' }, projectAfter).catch((err) => {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        });
    }

    /**
     * Called when user select archive project
     *
     * @param  {Event} evt
     */
    handleArchiveClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('project-summary-confirm-archive');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let projectAfter = await this.changeFlags({ archived: true });
            if (projectAfter) {
                await this.returnToList();
            }
        }
    }

    /**
     * Called when user select delete project
     *
     * @param  {Event} evt
     */
    handleDeleteClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('project-summary-confirm-delete');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let projectAfter = await this.changeFlags({ deleted: true });
            if (projectAfter)  {
                await this.returnToList();
            }
        }
    }

    /**
     * Called when user select delete project
     *
     * @param  {Event} evt
     */
    handleRestoreClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('project-summary-confirm-restore');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            await this.changeFlags({ archived: false, deleted: false });
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
        let { database, payloads } = this.props;
        let { saving } = this.state;
        if (saving) {
            return;
        }
        let problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        let newProject = _.omit(this.getProject(), 'user_ids', 'repo_ids');
        this.setState({ saving: true, adding: !newProject.id, problems: {} }, async () => {
            let schema = 'global';
            let db = database.use({ schema, by: this });
            try {
                let currentUserID = await db.start();
                let projectAfter = await db.saveOne({ table: 'project' }, newProject);
                payloads.dispatch(projectAfter);
                this.setState({ hasChanges: false, saving: false }, () => {
                    this.setEditability(false, projectAfter);
                });
            } catch (err) {
                let problems = {};
                if (err.statusCode === 409) {
                    problems = { name: 'validation-duplicate-project-name' };
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
     * @param  {Object} evt
     */
    handleTitleChange = (evt) => {
        this.setProjectProperty(`details.title`, evt.target.value);
    }

    /**
     * Called when user changes the name
     *
     * @param  {Event} evt
     */
    handleNameChange = (evt) => {
        let name = _.toLower(evt.target.value).replace(/\W+/g, '');
        this.setProjectProperty(`name`, name);
    }

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleDescriptionChange = (evt) => {
        this.setProjectProperty(`details.description`, evt.target.value);
    }

    /**
     * Called when user changes the project emblem
     *
     * @param  {Object} evt
     */
    handleEmblemChange = (evt) => {
        this.setProjectProperty(`details.resources`, evt.target.value);
    }

    /**
     * Called when user clicks an option under membership or access control
     *
     * @param  {Object} evt
     */
    handleMembershipOptionClick = (evt) => {
        let memOpts = _.clone(this.getProjectProperty('settings.membership')) || {};
        switch (evt.name) {
            case 'manual':
                memOpts = {};
                break;
            case 'allow_user_request':
                if (memOpts.allow_user_request) {
                    delete memOpts.allow_user_request;
                    delete memOpts.approve_user_request;
                } else {
                    memOpts.allow_user_request = true;
                }
                break;
            case 'approve_user_request':
                if (memOpts.approve_user_request) {
                    delete memOpts.approve_user_request;
                } else {
                    memOpts.approve_user_request = true;
                }
                break;
            case 'allow_guest_request':
                if (memOpts.allow_guest_request) {
                    delete memOpts.allow_guest_request;
                    delete memOpts.approve_guest_request;
                } else {
                    memOpts.allow_guest_request = true;
                }
                break;
            case 'approve_guest_request':
                if (memOpts.approve_guest_request) {
                    delete memOpts.approve_guest_request;
                } else {
                    memOpts.approve_guest_request = true;
                }
                break;
        }
        this.setProjectProperty(`settings.membership`, memOpts);
    }

    /**
     * Called when user clicks an option under membership or access control
     *
     * @param  {Object} evt
     */
    handleAccessControlOptionClick = (evt) => {
        let acOpts = _.clone(this.getProjectProperty('settings.access_control')) || {};
        switch (evt.name) {
            case 'members_only':
                acOpts = {};
                break;
            case 'grant_view_access':
                if (acOpts.grant_view_access) {
                    delete acOpts.grant_view_access;
                } else {
                    acOpts.grant_view_access = true;
                }
                break;
            case 'grant_comment_access':
                if (acOpts.grant_comment_access) {
                    delete acOpts.grant_comment_access;
                } else {
                    acOpts.grant_comment_access = true;
                }
                break;
        }
        this.setProjectProperty(`settings.access_control`, acOpts);
    }
}

const emptyProject = {
    details: {},
    settings: ProjectSettings.default,
};

export {
    ProjectSummaryPage as default,
    ProjectSummaryPage,
    ProjectSummaryPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectSummaryPage.propTypes = {
        editing: PropTypes.bool,
        projectID: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.oneOf([ 'new' ]),
        ]).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    };
    ProjectSummaryPageSync.propTypes = {
        editing: PropTypes.bool,
        creating: PropTypes.bool,
        system: PropTypes.object,
        project: PropTypes.object,
        statistics: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    }
}
