import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import ExternalDataUtils from 'objects/utils/external-data-utils';
import ProjectFinder from 'objects/finders/project-finder';
import RepoFinder from 'objects/finders/repo-finder';
import ServerFinder from 'objects/finders/server-finder';
import StatisticsFinder from 'objects/finders/statistics-finder';

// widgets
import PushButton from 'widgets/push-button';
import SortableTable from 'widgets/sortable-table', TH = SortableTable.TH;
import ActivityTooltip from 'tooltips/activity-tooltip';
import ModifiedTimeTooltip from 'tooltips/modified-time-tooltip'
import ActionBadge from 'widgets/action-badge';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './repo-list-page.scss';

class RepoListPage extends AsyncComponent {
    static displayName = 'RepoListPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            project: null,
            repos: null,
            servers: null,
            statistics: null,

            database,
            route,
            env,
        };
        meanwhile.show(<RepoListPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return ProjectFinder.findProject(db, route.params.project).then((project) => {
                props.project = project;
            });
        }).then(() => {
            return RepoFinder.findExistingRepos(db).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            meanwhile.show(<RepoListPageSync {...props} />);
            return ServerFinder.findServersOfRepos(db, props.repos).then((servers) => {
                props.servers = servers;
            });
        }).then(() => {
            meanwhile.show(<RepoListPageSync {...props} />);
            let repos = findRepos(props.repos, props.project);
            return StatisticsFinder.findDailyActivitiesOfRepos(db, props.project, repos).then((statistics) => {
                props.statistics = statistics;
            });
        }).then(() => {
            return <RepoListPageSync {...props} />;
        });
    }
}

class RepoListPageSync extends PureComponent {
    static displayName = 'RepoListPage.Sync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
            selectedRepoIDs: [],
            hasChanges: false,
            renderingFullList: this.isEditing(),
            problems: {},
        };
    }

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing(props) {
        let { route } = props || this.props;
        return route.params.edit;
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
        params.edit = edit;
        return route.replace(route.name, params);
    }

    /**
     * Check if we're switching into edit mode
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { project } = this.props;
        let { selectedRepoIDs } = this.state;
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                // initial list of ids to the current list
                this.setState({
                    renderingFullList: true,
                    selectedRepoIDs: _.get(nextProps.project, 'repo_ids', []),
                    hasChanges: false,
                });
            } else {
                setTimeout(() => {
                    if (!this.isEditing()) {
                        this.setState({ renderingFullList: false, problems: {} });
                    }
                }, 500);
            }
        }
        if (nextProps.project !== project && nextProps.project) {
            let originalRepoIDs = _.get(project, 'repo_ids', []);
            let incomingRepoIDs = _.get(nextProps.project, 'repo_ids', []);
            if (selectedRepoIDs === originalRepoIDs) {
                // use the list from the incoming object if no change has been made yet
                selectedRepoIDs = incomingRepoIDs;
            } else {
                if (!_.isEqual(originalRepoIDs, incomingRepoIDs)) {
                    // merge the list when a change has been made (by someone else presumably)
                    selectedRepoIDs = _.union(selectedRepoIDs, incomingRepoIDs);
                }
            }
            this.setState({ selectedRepoIDs });
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
        let { t } = env.locale;
        return (
            <div className="repo-list-page">
                {this.renderButtons()}
                <h2>{t('repo-list-title')}</h2>
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
        let { env, repos } = this.props;
        let { hasChanges } = this.state;
        let { t } = env.locale;
        if (this.isEditing()) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('repo-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('repo-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let empty = _.isEmpty(repos);
            return (
                <div className="buttons">
                    <PushButton className="emphasis" disabled={empty} onClick={this.handleEditClick}>
                        {t('repo-list-edit')}
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
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        let tableProps = {
            sortColumns,
            sortDirections,
            onSort: this.handleSort,
        };
        if (renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = this.isEditing();
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
                {this.renderServerColumn()}
                {this.renderIssueTrackerColumn()}
                {this.renderDateRangeColumn()}
                {this.renderLastMonthColumn()}
                {this.renderThisMonthColumn()}
                {this.renderToDateColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    }

    /**
     * Render rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows() {
        let { env, project, repos, servers, statistics } = this.props;
        let { renderingFullList, sortColumns, sortDirections } = this.state;
        if (!renderingFullList) {
            repos = findRepos(repos, project);
        }
        repos = sortRepos(repos, servers, statistics, env, sortColumns, sortDirections);
        return _.map(repos, (repo) => {
            return this.renderRow(repo);
        });
    }

    /**
     * Render a table row
     *
     * @param  {Object} repo
     *
     * @return {ReactElement}
     */
    renderRow(repo) {
        let { project } = this.props;
        let { renderingFullList, selectedRepoIDs } = this.state;
        let props = {};
        if (renderingFullList) {
            let originalRepoIDs = _.get(project, 'repo_ids', []);
            if (_.includes(originalRepoIDs, repo.id)) {
                props.className = 'fixed';
            }
            if (_.includes(selectedRepoIDs, repo.id)) {
                props.className += ' selected';
            }
            props.onClick = this.handleRowClick;
            props['data-repo-id'] = repo.id;
        }
        return (
            <tr key={repo.id} {...props}>
                {this.renderTitleColumn(repo)}
                {this.renderServerColumn(repo)}
                {this.renderIssueTrackerColumn(repo)}
                {this.renderDateRangeColumn(repo)}
                {this.renderLastMonthColumn(repo)}
                {this.renderThisMonthColumn(repo)}
                {this.renderToDateColumn(repo)}
                {this.renderModifiedTimeColumn(repo)}
            </tr>
        );
    }

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement}
     */
    renderTitleColumn(repo) {
        let { route, env, project } = this.props;
        let { renderingFullList, selectedRepoIDs } = this.state;
        let { t, p } = env.locale;
        if (!repo) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            let title = p(repo.details.title) || repo.name;
            let url;
            let badge;
            if (renderingFullList) {
                // compare against original project object to see if the repo
                // will be added or removed
                let originalRepoIDs = _.get(project, 'repo_ids', []);
                let includedBefore = _.includes(originalRepoIDs, repo.id);
                let includedAfter = _.includes(selectedRepoIDs, repo.id);
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" env={env} />;
                    } else {
                        badge = <ActionBadge type="remove" env={env} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                let params = _.clone(route.parameters);
                params.repo = repo.id;
                url = route.find('repo-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
                </td>
            );
        }
    }

    /**
     * Render server column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderServerColumn(repo) {
        let { route, env, servers } = this.props;
        let { t, p } = env.locale;
        if (!repo) {
            return <TH id="server">{t('table-heading-server')}</TH>
        } else {
            let server = findServer(servers, repo);
            let contents;
            if (server) {
                let title = p(server.details.title) || t(`server-type-${server.type}`);
                let params = { server: server.id };
                let url = route.find('server-summary-page', params);
                contents =(
                    <a href={url}>
                        <i className={`fa fa-${server.type} fa-fw`} />
                        {' '}
                        {title}
                    </a>
                );
            }
            return <td>{contents}</td>;
        }
    }

    /**
     * Render issue tracker column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderIssueTrackerColumn(repo) {
        let { env } = this.props;
        let { t, p } = env.locale;
        if (env.isBelowMode('ultra-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="issue_tracker">{t('table-heading-issue-tracker')}</TH>
        } else {
            let enabled = !!repo.details.issues_enabled;
            return <td>{t(`repo-list-issue-tracker-enabled-${enabled}`)}</td>;
        }
    }

    /**
     * Render active period column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderDateRangeColumn(repo) {
        let { env, statistics } = this.props;
        let { t, localeCode } = env.locale;
        if (env.isBelowMode('wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            let start, end;
            let range = _.get(statistics, [ repo.id, 'range' ]);
            if (range) {
                start = Moment(range.start).locale(localeCode).format('ll');
                end = Moment(range.end).locale(localeCode).format('ll');
            }
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    }

    /**
     * Render column showing the number of stories last month
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderLastMonthColumn(repo) {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (env.isBelowMode('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ repo.id, 'last_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories this month
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderThisMonthColumn(repo) {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (env.isBelowMode('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ repo.id, 'this_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the number of stories to date
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderToDateColumn(repo) {
        let { env, statistics } = this.props;
        let { t } = env.locale;
        if (env.isBelowMode('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            let props = {
                statistics: _.get(statistics, [ repo.id, 'to_date' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn(repo) {
        let { env } = this.props;
        let { t } = env.locale;
        if (env.isBelowMode('standard')) {
            return null;
        }
        if (!repo) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            let props = {
                time: repo.mtime,
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
    handleSaveClick = (evt) => {
        let { database, env, project, repos } = this.props;
        let { selectedRepoIDs } = this.state;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let originalRepoIDs = _.get(project, 'repo_ids', []);
        let removing = _.difference(originalRepoIDs, selectedRepoIDs);
        let message = t('repo-list-confirm-remove-$count', removing.length);
        let bypass = _.isEmpty(removing) ? true : undefined;
        return confirmation.ask(message, bypass).then((confirmed) => {
            if (!confirmed) {
                return;
            }
            this.setState({ problems: {} });
            let db = database.use({ schema: 'global', by: this });
            return db.start().then((userID) => {
                // remove ids of repo that no longer exist
                let existingRepoIDs = _.map(repos, 'id');
                let project = {
                    id: project.id,
                    repo_ids: _.intersection(selectedRepoIDs, existingRepoIDs)
                };
                return db.saveOne({ table: 'project' }, project).then((project) => {
                    this.setState({ hasChanges: false }, () => {
                        this.setEditability(false);
                    });
                }).catch((err) => {
                    let problems = { unexpected: err.message };
                    this.setState({ problems });
                });
            });
        });
    }

    /**
     * Called when user clicks a row in edit mode
     *
     * @param  {Event} evt
     */
    handleRowClick = (evt) => {
        let { project } = this.props;
        let { selectedRepoIDs } = this.state;
        let repoID = parseInt(evt.currentTarget.getAttribute('data-repo-id'));
        let hasChanges = true;
        if (_.includes(selectedRepoIDs, repoID)) {
            selectedRepoIDs = _.without(selectedRepoIDs, repoID);
        } else {
            selectedRepoIDs = _.concat(selectedRepoIDs, repoID);
        }
        if (selectedRepoIDs.length === project.repo_ids.length) {
            // if the new list has the same element as the old, use the latter so
            // to avoid a mere change in order of the ids
            if (_.difference(selectedRepoIDs, project.repo_ids).length === 0) {
                selectedRepoIDs = project.repo_ids;
                hasChanges = false;
            }
        }
        this.setState({ selectedRepoIDs, hasChanges });
    }
}

let sortRepos = Memoize(function(repos, servers, statistics, env, columns, directions) {
    let { t, p } = env.locale;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (repo) => {
                    return p(repo.details.title) || repo.name;
                };
            case 'server':
                return (repo) => {
                    let server = findServer(servers, repo);
                    if (server)  {
                        return p(server.details.title) || t(`server-type-${server.type}`);
                    }
                    return '';
                };
            case 'issue_tracker':
                return 'details.issues_enabled';
            case 'range':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (repo) => {
                    return _.get(statistics, [ repo.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(repos, columns, directions);
});

let findServer = Memoize(function(servers, repo) {
    return _.find(servers, (server) => {
        let link = ExternalDataUtils.findLink(repo, server);
        return !!link;
    });
});

let findRepos = Memoize(function(repos, project) {
    if (project) {
        let hash = _.keyBy(repos, 'id');
        return _.filter(_.map(project.repo_ids, (id) => {
            return hash[id];
        }));
    } else {
        return [];
    }
});

export {
    RepoListPage as default,
    RepoListPage,
    RepoListPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RepoListPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    RepoListPageSync.propTypes = {
        repos: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        statistics: PropTypes.objectOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
