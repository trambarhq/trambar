import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'utils/component-refs';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as StatisticsFinder from 'objects/finders/statistics-finder';
import * as SystemFinder from 'objects/finders/system-finder';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import InstructionBlock from 'widgets/instruction-block';
import TextField from 'widgets/text-field';
import MultilingualTextField from 'widgets/multilingual-text-field';
import OptionList from 'widgets/option-list';
import ActivityChart from 'widgets/activity-chart';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';
import ErrorBoundary from 'widgets/error-boundary';

import './repo-summary-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Repo Summary page.
 *
 * @extends AsyncComponent
 */
class RepoSummaryPage extends AsyncComponent {
    static displayName = 'RepoSummaryPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, projectID, repoID, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            system: undefined,
            project: undefined,
            repo: undefined,
            statistics: undefined,

            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<RepoSummaryPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            return RepoFinder.findRepo(db, repoID).then((repo) => {
                props.repo = repo;
            });
        }).then(() => {
            meanwhile.show(<RepoSummaryPageSync {...props} />);
            return ProjectFinder.findProject(db, projectID).then((project) => {
                props.project = project;
            });
        }).then(() => {
            meanwhile.show(<RepoSummaryPageSync {...props} />);
            return StatisticsFinder.findDailyActivitiesOfRepo(db, props.project, props.repo).then((statistics) => {
                props.statistics = statistics;
            });
        }).then(() => {
            return <RepoSummaryPageSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the Repo Summary page.
 *
 * @extends PureComponent
 */
class RepoSummaryPageSync extends PureComponent {
    static displayName = 'RepoSummaryPage.Sync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            newRepo: null,
            saving: false,
            problems: {},
        };
    }

    /**
     * Return edited copy of repo object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getRepo(state) {
        let { repo, editing } = this.props;
        let { newRepo } = this.state;
        if (editing && (!state || state === 'current')) {
            return newRepo || repo || emptyRepo;
        } else {
            return repo || emptyRepo;
        }
    }

    /**
     * Return a property of the repo object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getRepoProperty(path, state) {
        let repo = this.getRepo(state);
        return _.get(repo, path);
    }

    /**
     * Modify a property of the repo object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRepoProperty(path, value) {
        let { repo } = this.props;
        let newRepo = this.getRepo();
        let newRepoAfter = _.decoupleSet(newRepo, path, value);
        let hasChanges = true;
        if (_.isEqual(newRepoAfter, repo)) {
            newRepoAfter = null;
            hasChanges = false;
        }
        this.setState({ newRepo: newRepoAfter, hasChanges });
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability(edit) {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.editing = edit || undefined;
        return route.replace(route.name, params);
    }

    /**
     * Return to repo list
     *
     * @return {Promise}
     */
    returnToList() {
        let { route } = this.props;
        let params = { projectID: route.params.projectID };
        return route.push('repo-list-page', params);
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
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { editing } = this.props;
        if (nextProps.editing !== editing) {
            if (nextProps.editing) {
                this.setState({
                    newRepo: null,
                    hasChanges: false,
                });
            } else {
                this.setState({ problems: {} });
            }
        }
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
        let repo = this.getRepo();
        let title = p(_.get(repo, 'details.title')) || repo.name;
        return (
            <div className="repo-summary-page">
                {this.renderButtons()}
                <h2>{t('repo-summary-$title', title)}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
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
        let { route, env, project, editing } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('repo-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('repo-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            let repoID = route.params.repo;
            let active = (project) ? _.includes(project.repo_ids, repoID) : true;
            let preselected = (!active) ? 'restore' : undefined;
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('repo-summary-return')}
                        </option>
                        <option name="remove" disabled={!active} onClick={this.handleRemoveClick}>
                            {t('repo-summary-remove')}
                        </option>
                        <option name="restore" hidden={active} onClick={this.handleRestoreClick}>
                            {t('repo-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('repo-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render form for entering repo details
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderIssueTrackingStatus()}
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
            value: this.getRepoProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            readOnly: !editing,
            env,
            onChange: this.handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('repo-summary-title')}
            </MultilingualTextField>
        );
    }

    /**
     * Render repo name input (read only)
     *
     * @return {ReactElement}
     */
    renderNameInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'name',
            value: this.getRepoProperty('name'),
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('repo-summary-gitlab-name')}
            </TextField>
        );
    }

    /**
     * Render issue tracker status
     *
     * @return {ReactElement}
     */
    renderIssueTrackingStatus() {
        let { env } = this.props;
        let { t } = env.locale;
        let issueTrackStatus;
        if (this.getRepoProperty('details.issues_enabled')) {
            issueTrackStatus = t('repo-summary-issue-tracker-enabled');
        } else {
            issueTrackStatus = t('repo-summary-issue-tracker-disabled');
        }
        let props = {
            id: 'issue-tracker',
            value: issueTrackStatus,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('repo-summary-issue-tracker')}
            </TextField>
        );
    }

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions() {
        let { env, editing } = this.props;
        let instructionProps = {
            folder: 'repo',
            topic: 'repo-summary',
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
     * @return {ReactElement}
     */
    renderChart() {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        let chartProps = {
            statistics,
            env,
        };
        return (
            <div className="statistics">
                <ErrorBoundary env={env}>
                    <ActivityChart {...chartProps}>
                        {t('repo-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }

    /**
     * Save project with repo added or removed
     *
     * @param  {Boolean} include
     *
     * @return {Promise<Project>}
     */
    changeInclusion(include) {
        let { database, project, repo } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let repoIDs = project.repo_ids;
        if (include) {
            repoIDs = _.union(repoIDs, [ repo.id ]);
        } else {
            repoIDs = _.difference(repoIDs, [ repo.id ]);
        }
        let projectAfter = _.assign({}, project, { repo_ids: repoIDs });
        return db.saveOne({ table: 'project' }, projectAfter).catch((err) => {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        });
    }

    /**
     * Called when user clicks remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick = (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('repo-summary-confirm-remove');
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeInclusion(false).then((project) => {
                    if (project) {
                        return this.returnToList();
                    }
                });
            }
        });
    }

    /**
     * Called when user clicks restore button
     *
     * @param  {Event} evt
     */
    handleRestoreClick = (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('repo-summary-confirm-restore');
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeInclusion(true);
            }
        });
    }

    /**
     * Called when user clicks return button
     *
     * @param  {Event} evt
     */
    handleReturnClick = (evt) => {
        return this.returnToList();
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        return this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        return this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        let { database } = this.props;
        let { saving } = this.state;
        if (saving) {
            return;
        }
        let db = database.use({ schema: 'global', by: this });
        let repo = this.getRepo();
        this.setState({ saving: true, problems: {} }, () => {
            return db.start().then((currentUserID) => {
                return db.saveOne({ table: 'repo' }, repo).then((repo) => {
                    this.setState({ hasChanges: false, saving: false }, () => {
                        this.setEditability(false);
                    });
                });
            }).catch((err) => {
                let problems = { unexpected: err.message };
                this.setState({ problems, saving: false });
            });
        });
    }

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleTitleChange = (evt) => {
        this.setRepoProperty(`details.title`, evt.target.value);
    }
}

const emptyRepo = {
    details: {}
};

export {
    RepoSummaryPage as default,
    RepoSummaryPage,
    RepoSummaryPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RepoSummaryPage.propTypes = {
        editing: PropTypes.bool,
        projectID: PropTypes.number.isRequired,
        repoID: PropTypes.number.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    RepoSummaryPageSync.propTypes = {
        editing: PropTypes.bool,
        system: PropTypes.object,
        repo: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
