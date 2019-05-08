import _ from 'lodash';
import React, { useRef, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer } from 'relaks';
import { useAfterglow, useErrorHandling, useSortHandling, useEditToggle } from '../hooks.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ExternalDataUtils from 'common/objects/utils/external-data-utils.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { ActivityTooltip } from '../tooltips/activity-tooltip.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './repo-list-page.scss';

/**
 * Asynchronous component that render the Repo List page.
 */
async function RepoListPage(props) {
    const { database, route, env, projectID, editing } = props;
    const { t, p, f } = env.locale;
    const [ show ] = useProgress();
    const selection = useSaveBuffer({
        original: { adding: [], removing: [] },
        compare: _.isEqual,
    });
    const fullList = useAfterglow(editing);
    const confirmation = useRef();
    const db = database.use({ schema: 'global', by: this });

    const [ sort, handleSort ] = useSortHandling();
    const [ problems, setProblems, setUnexpectedError ] = useErrorHandling();
    const [ handleEditClick, handleCancelClick ] = useEditToggle(route);
    const handleSaveClick = useCallback(async (evt) => {
        try {
            setProblems({});
            await saveSelection();
            handleCancelClick();
        } catch (err) {
            setUnexpectedError(err);
        }
    }, [ saveSelection, handleCancelClick ]);
    const handleRowClick = useCallback((evt) => {
        const repoID = parseInt(evt.currentTarget.getAttribute('data-repo-id'));
        toggleRepo(repoID);
    }, [ toggleRepo ]);

    render();
    const currentUserID = await db.start();
    const project = await ProjectFinder.findProject(db, projectID);
    const repos = await RepoFinder.findExistingRepos(db);
    render();
    const servers = await ServerFinder.findServersOfRepos(db, repos);
    render();
    const linkedRepos = findRepos(props.repos, props.project);
    const statistics = await StatisticsFinder.findDailyActivitiesOfRepos(db, project, linkedRepos);
    render();

    function render() {
        const { changed } = selection;
        show(
            <div className="repo-list-page">
                {renderButtons()}
                <h2>{t('repo-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {renderTable()}
                <ActionConfirmation ref={confirmation} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        let { changed } = selection;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('repo-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('repo-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            let empty = _.isEmpty(repos);
            return (
                <div className="buttons">
                    <PushButton className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('repo-list-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderTable() {
        const tableProps = {
            sortColumns: sort.columns,
            sortDirections: sort.directions,
            onSort: handleSort,
        };
        if (fullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = !!editing;
        }
        return (
            <SortableTable {...tableProps}>
                <thead>{renderHeadings()}</thead>
                <tbody>{renderRows()}</tbody>
            </SortableTable>
        );
    }

    function renderHeadings() {
        return (
            <tr>
                {renderTitleColumn()}
                {renderServerColumn()}
                {renderIssueTrackerColumn()}
                {renderDateRangeColumn()}
                {renderLastMonthColumn()}
                {renderThisMonthColumn()}
                {renderToDateColumn()}
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        let visible;
        if (fullList) {
            visible = repos;
        } else {
            visible = findRepos(repos, project);
        }
        visible = sortRepos(visible, servers, statistics, env, sort);
        return _.map(visible, renderRow);
    }

    function renderRow(repo, i) {
        const repoIDs = _.get(project, 'repo_ids', []);
        const existing = _.includes(repoIDs, repo.id);
        const classNames = [];
        let onClick;
        if (fullList) {
            if (existing) {
                classNames.push('fixed');
            }
            const { adding, removing } = selection.current;
            const keep = existing && !_.includes(removing, repo.id);
            const add = !existing && _.includes(adding, repo.id);
            if (add || keep) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-repo-id': repo.id,
            onClick,
        };
        return (
            <tr key={repo.id} {...props}>
                {renderTitleColumn(repo)}
                {renderServerColumn(repo)}
                {renderIssueTrackerColumn(repo)}
                {renderDateRangeColumn(repo)}
                {renderLastMonthColumn(repo)}
                {renderThisMonthColumn(repo)}
                {renderToDateColumn(repo)}
                {renderModifiedTimeColumn(repo)}
            </tr>
        );
    }

    function renderTitleColumn(repo) {
        if (!repo) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            const title = p(repo.details.title) || repo.name;
            let url, badge;
            if (fullList) {
                // compare against original project object to see if the repo
                // will be added or removed
                const { adding, removing } = selection.current;
                const repoIDs = _.get(project, 'repo_ids', []);
                let includedBefore = _.includes(repoIDs, repo.id);
                let includedAfter;
                if (includedBefore) {
                    includedAfter = !_.includes(removing, repo.id);
                } else {
                    includedAfter = _.includes(adding, repo.id);
                }
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" env={env} />;
                    } else {
                        badge = <ActionBadge type="remove" env={env} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                const params = _.assign({}, route.params, { repoID: repo.id });
                url = route.find('repo-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
                </td>
            );
        }
    }

    function renderServerColumn(repo) {
        if (!repo) {
            return <TH id="server">{t('table-heading-server')}</TH>
        } else {
            const server = findServer(servers, repo);
            let contents;
            if (server) {
                const title = p(server.details.title) || t(`server-type-${server.type}`);
                const url = route.find('server-summary-page', {
                    serverID: server.id
                });
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

    function renderIssueTrackerColumn(repo) {
        if (!env.isWiderThan('ultra-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="issue_tracker">{t('table-heading-issue-tracker')}</TH>
        } else {
            const enabled = !!repo.details.issues_enabled;
            return <td>{t(`repo-list-issue-tracker-enabled-${enabled}`)}</td>;
        }
    }

    function renderDateRangeColumn(repo) {
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            const range = _.get(statistics, [ repo.id, 'range' ]);
            const start = f(_.get(range, 'start'));
            const end = f(_.get(range, 'end'));
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    }

    function renderLastMonthColumn(repo) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ repo.id, 'last_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderThisMonthColumn(repo) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ repo.id, 'this_month' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderToDateColumn(repo) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ repo.id, 'to_date' ]),
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderModifiedTimeColumn(repo) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!repo) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: repo.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    function toggleRepo(repoID) {
        let { adding, removing } = selection.current;
        if (_.includes(project.repo_ids, repoID)) {
            removing = _.toggle(removing, repoID);
        } else {
            adding = _.toggle(adding, repoID);
        }
        selection.set({ adding, removing });
    }

    async function saveSelection() {
        const { ask } = confirmation.current;
        const { adding, removing } = selection.current;

        if (!_.isEmpty(removing)) {
            const confirmed = await ask(t('repo-list-confirm-remove-$count', removing.length));
            if (!confirmed) {
                return;
            }
        }

        const repoIDs = project.repo_ids;
        const repoIDsAfter = _.difference(_.union(userIDs, adding), removing);
        // remove ids of repo that no longer exist
        const existingRepoIDs = _.map(repos, 'id');
        const columns = {
            id: project.id,
            repo_ids: _.intersection(repoIDsAfter, existingRepoIDs)
        };
        const currentUserID = await db.start();
        const projectAfter = await db.saveOne({ table: 'project' }, columns);
        return projectAfter;
    }
}

const sortRepos = memoizeWeak(null, function(repos, servers, statistics, env, sort) {
    const { t, p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
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
    return _.orderBy(repos, columns, sort.directions);
});

const findServer = memoizeWeak(null, function(servers, repo) {
    return _.find(servers, (server) => {
        let link = ExternalDataUtils.findLink(repo, server);
        return !!link;
    });
});

const findRepos = memoizeWeak(null, function(repos, project) {
    if (project) {
        let hash = _.keyBy(repos, 'id');
        return _.filter(_.map(project.repo_ids, (id) => {
            return hash[id];
        }));
    }
});

const component = Relaks.memo(RepoListPage);

export {
    component as default,
    component as RepoListPage,
};
