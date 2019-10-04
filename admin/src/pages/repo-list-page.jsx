import _ from 'lodash';
import React, { useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ExternalDataUtils from 'common/objects/utils/external-data-utils.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSaver from 'common/objects/savers/project-saver.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as RepoSaver from 'common/objects/savers/repo-saver.mjs';
import * as RepoUtils from 'common/objects/utils/repo-utils.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as ServerUtils from 'common/objects/utils/server-utils.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { ActivityTooltip } from '../tooltips/activity-tooltip.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useSelectionBuffer,
    useSortHandler,
    useRowToggle,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './repo-list-page.scss';

async function RepoListPage(props) {
    const { database, projectID } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    const repos = await RepoFinder.findExistingRepos(database);
    render();
    const servers = await ServerFinder.findRepoServers(database, repos);
    render();
    const linkedRepos = findRepos(repos, project);
    const statistics = await StatisticsFinder.findDailyActivitiesOfRepos(database, project, linkedRepos);
    render();

    function render() {
        const sprops = { project, repos, servers, statistics };
        show(<RepoListPageSync {...sprops} {...props} />);
    }
}

function RepoListPageSync(props) {
    const { project, repos, servers, statistics } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const linkedRepos = findRepos(repos, project);
    const selection = useSelectionBuffer({
        original: linkedRepos,
        save: (base, ours) => {
        },
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ]  = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, repos);
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick  = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            const removing = selection.removing();
            if (removing.length > 0) {
                await confirm(t('repo-list-confirm-remove-$count', removing.length));
            }
            await ProjectSaver.associateRepos(database, project, selection.current);
            warnDataLoss(false);
            handleCancelClick();
        });
    });

    warnDataLoss(selection.changed);

    return (
        <div className="repo-list-page">
            {renderButtons()}
            <h2>{t('repo-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const empty = _.isEmpty(repos);
            return (
                <div className="buttons">
                    <PushButton className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('repo-list-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = selection;
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
        }
    }

    function renderTable() {
        const tableProps = {
            sortColumns: sort.columns,
            sortDirections: sort.directions,
            onSort: handleSort,
        };
        if (selection.shown) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = !readOnly;
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
        const visible = (selection.shown) ? repos : linkedRepos;
        const sorted = sortRepos(visible, servers, statistics, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(repo, i) {
        const classNames = [];
        let onClick;
        if (selection.shown) {
            if (selection.isExisting(repo)) {
                classNames.push('fixed');
            }
            if (selection.isKeeping(repo)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-id': repo.id,
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
            return <TH id="title">{t('repo-list-column-title')}</TH>;
        } else {
            const title = p(repo.details.title) || repo.name;
            let url, badge;
            if (selection.shown) {
                if (selection.isAdding(repo)) {
                    badge = <ActionBadge type="add" env={env} />;
                } else if (selection.isRemoving(repo)) {
                    badge = <ActionBadge type="remove" env={env} />;
                }
            } else {
                // don't create the link when we're editing the list
                const params = { ...route.params, repoID: repo.id };
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
            return <TH id="server">{t('repo-list-column-server')}</TH>
        } else {
            const server = findServer(servers, repo);
            let contents;
            if (server) {
                const title = ServerUtils.getDisplayName(server, env);
                let url;
                if (!selection.shown) {
                    url = route.find('server-summary-page', {
                        serverID: server.id
                    });
                }
                contents = (
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
            return <TH id="issue_tracker">{t('repo-list-column-issue-tracker')}</TH>
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
            return <TH id="range">{t('repo-list-column-date-range')}</TH>
        } else {
            const range = statistics?.[repo.id]?.range;
            const start = f(range?.start);
            const end = f(range?.end);
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    }

    function renderLastMonthColumn(repo) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!repo) {
            return <TH id="last_month">{t('repo-list-column-last-month')}</TH>
        } else {
            const props = {
                statistics: statistics?.[repo.id]?.last_month,
                disabled: selection.shown,
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
            return <TH id="this_month">{t('repo-list-column-this-month')}</TH>
        } else {
            const props = {
                statistics: statistics?.[repo.id]?.this_month,
                disabled: selection.shown,
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
            return <TH id="to_date">{t('repo-list-column-to-date')}</TH>
        } else {
            const props = {
                statistics: statistics?.[repo.id]?.to_date,
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
            return <TH id="mtime">{t('repo-list-column-last-modified')}</TH>
        } else {
            const props = {
                time: repo.mtime,
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }
}

const sortRepos = memoizeWeak(null, function(repos, servers, statistics, env, sort) {
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'title':
                return (repo) => {
                    return _.toLower(RepoUtils.getDisplayName(repo, env));
                };
            case 'server':
                return (repo) => {
                    let server = findServer(servers, repo);
                    return _.toLower(ServerUtils.getDisplayName(server, env));
                };
            case 'issue_tracker':
                return 'details.issues_enabled';
            case 'range':
                return (repo) => {
                    return statistics?.[repo.id]?.range?.start ?? '';
                };
            case 'last_month':
                return (repo) => {
                    return statistics?.[repo.id]?.last_month?.total ?? 0;
                };
            case 'this_month':
                return (repo) => {
                    return statistics?.[repo.id]?.this_month?.total ?? 0;
                };
            case 'to_date':
                return (repo) => {
                    return statistics?.[repo.id]?.to_date?.total ?? 0;
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
