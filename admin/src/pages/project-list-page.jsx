import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import ComponentRefs from 'common/utils/component-refs.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';

// widgets
import PushButton from '../widgets/push-button.jsx';
import ComboButton from '../widgets/combo-button.jsx';
import SortableTable, { TH } from '../widgets/sortable-table.jsx';
import UserTooltip from '../tooltips/user-tooltip.jsx';
import RepositoryTooltip from '../tooltips/repository-tooltip.jsx';
import ActivityTooltip from '../tooltips/activity-tooltip.jsx';
import ModifiedTimeTooltip from '../tooltips/modified-time-tooltip.jsx'
import ActionBadge from '../widgets/action-badge.jsx';
import ActionConfirmation from '../widgets/action-confirmation.jsx';
import DataLossWarning from '../widgets/data-loss-warning.jsx';
import UnexpectedError from '../widgets/unexpected-error.jsx';

import './project-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Project List page.
 *
 * @extends AsyncComponent
 */
class ProjectListPage extends AsyncComponent {
    static displayName = 'ProjectListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            database,
            route,
            env,
            editing,
        };
        meanwhile.show(<ProjectListPageSync {...props} />);
        let currentUserID = await db.start();
        props.projects = await ProjectFinder.findAllProjects(db);
        meanwhile.show(<ProjectListPageSync {...props} />);
        props.repos = await RepoFinder.findProjectRepos(db, props.projects)
        props.users = await UserFinder.findProjectMembers(db, props.projects)
        props.statistics = await StatisticsFinder.findDailyActivitiesOfProjects(db, props.projects)
        return <ProjectListPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Project List page.
 *
 * @extends PureComponent
 */
class ProjectListPageSync extends PureComponent {
    static displayName = 'ProjectListPageSync';

    constructor(props) {
        let { editing } = props;
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            restoringProjectIDs: [],
            archivingProjectIDs: [],
            hasChanges: false,
            renderingFullList: editing,
            problems: {},
        };
    }

    /**
     * Toggle rendering of full list when entering and exiting edit mode
     *
     * @param  {Object} props
     * @param  {Object} state
     *
     * @return {Object|null}
     */
    static getDerivedStateFromProps(props, state) {
        let { editing } = props;
        let { renderingFullList } = state;
        if (editing && !renderingFullList) {
            return {
                renderingFullList: true,
            };
        } else if (!editing && renderingFullList) {
            return {
                renderingFullList: false,
                restoringProjectIDs: [],
                archivingProjectIDs: [],
                hasChanges: false,
                problems: {},
            };
        }
        return null;
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
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t } = env.locale;
        return (
            <div className="project-list-page">
                {this.renderButtons()}
                <h2>{t('project-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderTable()}
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
        let { env, projects, editing } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('project-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('project-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let preselected;
            let empty = _.isEmpty(projects);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" className="separated" onClick={this.handleAddClick}>
                            {t('project-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('project-list-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable() {
        let { editing } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        let tableProps = {
            sortColumns,
            sortDirections,
            onSort: this.handleSort,
        };
        if (renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = editing;
            tableProps.onClick = this.handleRowClick;
        }
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {this.renderHeadings()}
                </thead>
                <tbody>
                    {this.renderRows()}
                </tbody>
            </SortableTable>
        );
    }

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderUsersColumn()}
                {this.renderRepositoriesColumn()}
                {this.renderDateRangeColumn()}
                {this.renderLastMonthColumn()}
                {this.renderThisMonthColumn()}
                {this.renderToDateColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    }

    /**
     * Render table rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows() {
        let { env, projects, users, repos, statistics } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (!renderingFullList) {
            projects = filterProjects(projects);
        }
        projects = sortProjects(projects, users, repos, statistics, env, sortColumns, sortDirections);
        return _.map(projects, (project) => {
            return this.renderRow(project);
        });
    }

    /**
     * Render a table row
     *
     * @param  {Object} project
     *
     * @return {ReactElement}
     */
    renderRow(project) {
        let { env } = this.props;
        let { renderingFullList, restoringProjectIDs, archivingProjectIDs } = this.state;
        let { t } = env.locale;
        let classes = [];
        let onClick, title;
        if (project.deleted) {
            classes.push('deleted');
            title = t('project-list-status-deleted');
        } else if (project.archived) {
            classes.push('disabled');
            title = t('project-list-status-archived');
        }
        if (renderingFullList) {
            if (project.deleted || project.archived) {
                if (_.includes(restoringProjectIDs, project.id)) {
                    classes.push('selected');
                }
            } else {
                classes.push('fixed');
                if (!_.includes(archivingProjectIDs, project.id)) {
                    classes.push('selected');
                }
            }
            onClick = this.handleRowClick;
        }
        let props = {
            className: classes.join(' '),
            'data-project-id': project.id,
            title,
            onClick,
        };
        return (
            <tr key={project.id} {...props}>
                {this.renderTitleColumn(project)}
                {this.renderUsersColumn(project)}
                {this.renderRepositoriesColumn(project)}
                {this.renderDateRangeColumn(project)}
                {this.renderLastMonthColumn(project)}
                {this.renderThisMonthColumn(project)}
                {this.renderToDateColumn(project)}
                {this.renderModifiedTimeColumn(project)}
            </tr>
        );
    }

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement}
     */
    renderTitleColumn(project) {
        let { env, route } = this.props;
        let { renderingFullList, restoringProjectIDs, archivingProjectIDs } = this.state;
        let { t, p } = env.locale;
        if (!project) {
            return <TH id="title">{t('table-heading-name')}</TH>;
        } else {
            let title = p(project.details.title) || project.name;
            let url, badge;
            if (renderingFullList) {
                // add a badge next to the name if we're archiving or
                // restoring a project
                let includedBefore, includedAfter;
                if (project.deleted || project.archived) {
                    includedBefore = false;
                    includedAfter = _.includes(restoringProjectIDs, project.id);
                } else {
                    includedBefore = true;
                    includedAfter = !_.includes(archivingProjectIDs, project.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="restore" env={env} />;
                    } else {
                        badge = <ActionBadge type="archive" env={env} />;
                    }
                }
            } else {
                // link to project summary in non-editing mode
                url = route.find('project-summary-page', {
                    projectID: project.id
                });
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
                </td>
            );
        }
    }

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn(project) {
        let { route, env, users } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!project) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            let props = {
                users: findUsers(users, project),
                project,
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    /**
     * Render repositories column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderRepositoriesColumn(project) {
        let { route, env, repos } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!project) {
            return <TH id="repos">{t('table-heading-repositories')}</TH>
        } else {
            let props = {
                repos: findRepos(repos, project),
                project,
                route,
                env,
            };
            return <td><RepositoryTooltip {...props} /></td>;
        }
    }

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn(project) {
        let { env, statistics } = this.props;
        let { t, localeCode } = env.locale;
        if (!env.isWiderThan('ultra-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            if (!project.deleted) {
                let start, end;
                let range = _.get(statistics, [ project.id, 'range' ]);
                if (range) {
                    start = Moment(range.start).locale(localeCode).format('ll');
                    end = Moment(range.end).locale(localeCode).format('ll');
                }
                return <td>{t('date-range-$start-$end', start, end)}</td>;
            } else {
                return <td>{t('project-list-status-deleted')}</td>;
            }
        }
    }

    /**
     * Render column showing the number of stories last month
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn(project) {
        let { env, statistics } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ project.id, 'last_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn(project) {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ project.id, 'this_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn(project) {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ project.id, 'to_date' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn(project) {
        let { env } = this.props;
        let { t } = env.locale;
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!project) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            let props = {
                time: project.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort = (evt) => {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    }

    /**
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        let { route } = this.props;
        return route.push('project-summary-page', { projectID: 'new' });
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = async (evt) => {
        let { database, env, projects } = this.props;
        let { archivingProjectIDs, restoringProjectIDs } = this.state;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let messages = [
            t('project-list-confirm-archive-$count', archivingProjectIDs.length),
            t('project-list-confirm-restore-$count', restoringProjectIDs.length),
        ];
        let bypass = [
            _.isEmpty(archivingProjectIDs) ? true : undefined,
            _.isEmpty(restoringProjectIDs) ? true : undefined,
        ];
        let confirmed = await confirmation.askSeries(messages, bypass);
        if (!confirmed) {
            return;
        }
        this.setState({ problems: {} });
        let db = database.use({ schema: 'global', by: this });
        let currentUserID = await db.start();
        let projectsAfter = [];
        for (let project of projects) {
            let flags = {};
            if (_.includes(archivingProjectIDs, project.id)) {
                flags.archived = true;
            } else if (_.includes(restoringProjectIDs, project.id)) {
                flags.archived = flags.deleted = false;
            } else {
                continue;
            }
            let projectAfter = _.assign({}, project, flags);
            projectsAfter.push(projectAfter);
        }
        try {
            await db.save({ table: 'project' }, projectsAfter);
            this.setState({ hasChanges: false }, () => {
                this.setEditability(false);
            });
        } catch (err) {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        }
    }

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick = (evt) => {
        let { projects } = this.props;
        let { restoringProjectIDs, archivingProjectIDs } = this.state;
        let projectID = parseInt(evt.currentTarget.getAttribute('data-project-id'));
        let project = _.find(projects, { id: projectID });
        if (project.deleted || project.archived) {
            if (_.includes(restoringProjectIDs, project.id)) {
                restoringProjectIDs = _.without(restoringProjectIDs, project.id);
            } else {
                restoringProjectIDs = _.concat(restoringProjectIDs, project.id);
            }
        } else {
            if (_.includes(archivingProjectIDs, project.id)) {
                archivingProjectIDs = _.without(archivingProjectIDs, project.id);
            } else {
                archivingProjectIDs = _.concat(archivingProjectIDs, project.id);
            }
        }
        let hasChanges = !_.isEmpty(restoringProjectIDs) || !_.isEmpty(archivingProjectIDs);
        this.setState({ restoringProjectIDs, archivingProjectIDs, hasChanges });
    }
}

let sortProjects = memoizeWeak(null, function(projects, users, repos, statistics, env, columns, directions) {
    let { p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (project) => {
                    return p(project.details.title)
                };
            case 'users':
                return (project) => {
                    return _.size(findUsers(users, project));
                };
            case 'repos':
                return (project) => {
                    return _.size(findRepos(repos, project));
                };
            case 'range':
                return (project) => {
                    return _.get(statistics, [ project.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (project) => {
                    return _.get(statistics, [ project.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (project) => {
                    return _.get(statistics, [ project.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (project) => {
                    return _.get(statistics, [ project.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(projects, columns, directions);
});

let filterProjects = memoizeWeak(null, function(projects) {
    return _.filter(projects, (project) => {
        return !project.deleted && !project.archived;
    });
});

let findRepos = memoizeWeak(null, function(repos, project) {
    let hash = _.keyBy(repos, 'id');
    return _.filter(_.map(project.repo_ids, (id) => {
        return hash[id];
    }));
});

let findUsers = memoizeWeak(null, function(users, project) {
    let hash = _.keyBy(users, 'id');
    return _.filter(_.map(project.user_ids, (id) => {
        return hash[id];
    }));
});

export {
    ProjectListPage as default,
    ProjectListPage,
    ProjectListPageSync,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectListPage.propTypes = {
        editing: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    ProjectListPageSync.propTypes = {
        editing: PropTypes.bool,
        projects: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.objectOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
