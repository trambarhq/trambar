import _ from 'lodash';
import React, { useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSaver from 'common/objects/savers/project-saver.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { UserTooltip } from '../tooltips/user-tooltip.jsx';
import { RepositoryTooltip } from '../tooltips/repository-tooltip.jsx';
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

import './project-list-page.scss';

async function ProjectListPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const projects = await ProjectFinder.findAllProjects(database);
    render();
    const repos = await RepoFinder.findProjectRepos(database, projects);
    render();
    const users = await UserFinder.findProjectMembers(database, projects);
    render();
    const statistics = await StatisticsFinder.findDailyActivitiesOfProjects(database, projects);
    render();

    function render() {
        const sprops = { projects, repos, users, statistics };
        show(<ProjectListPageSync {...sprops} {...props} />);
    }
}

function ProjectListPageSync(props) {
    const { projects, repos, users, statistics } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const activeProjects = filterProjects(projects);
    const selection = useSelectionBuffer({
        original: activeProjects,
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, projects);
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleAddClick = useListener((evt) => {
        route.push('project-summary-page', { projectID: 'new' });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            const removing = selection.removing();
            if (removing.length > 0) {
                await confirm(t('project-list-confirm-archive-$count', removing.length));
            }
            const adding = selection.adding();
            if (adding.length > 0) {
                await confirm(t('project-list-confirm-restore-$count', adding.length));
            }
            await ProjectSaver.archiveProjects(database, removing);
            await ProjectSaver.restoreProjects(database, adding);
            warnDataLoss(false);
            handleCancelClick();
        })
    });

    warnDataLoss(selection.changed);

    return (
        <div className="project-list-page">
            {renderButtons()}
            <h2>{t('project-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const empty = _.isEmpty(projects);
            return (
                <div className="buttons">
                    <ComboButton>
                        <option name="add" className="separated" onClick={handleAddClick}>
                            {t('project-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('project-list-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = selection;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('project-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('project-list-save')}
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
            tableProps.expanded = !!editing;
            tableProps.onClick = handleRowClick;
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
                {renderUsersColumn()}
                {renderRepositoriesColumn()}
                {renderDateRangeColumn()}
                {renderLastMonthColumn()}
                {renderThisMonthColumn()}
                {renderToDateColumn()}
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        const visible = (selection.shown) ? projects : activeProjects;
        const sorted = sortProjects(visible, users, repos, statistics, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(project) {
        const classNames = [];
        let onClick, title;
        if (project.deleted) {
            classNames.push('deleted');
            title = t('project-list-status-deleted');
        } else if (project.archived) {
            classNames.push('disabled');
            title = t('project-list-status-archived');
        }
        if (selection.shown) {
            if (selection.isExisting(project)) {
                classNames.push('fixed');
            }
            if (selection.isKeeping(project)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-id': project.id,
            title,
            onClick,
        };
        return (
            <tr key={project.id} {...props}>
                {renderTitleColumn(project)}
                {renderUsersColumn(project)}
                {renderRepositoriesColumn(project)}
                {renderDateRangeColumn(project)}
                {renderLastMonthColumn(project)}
                {renderThisMonthColumn(project)}
                {renderToDateColumn(project)}
                {renderModifiedTimeColumn(project)}
            </tr>
        );
    }

    function renderTitleColumn(project) {
        if (!project) {
            return <TH id="title">{t('project-list-column-title')}</TH>;
        } else {
            let title = p(project.details.title) || project.name;
            let url, badge;
            if (selection.shown) {
                // add a badge next to the name if we're archiving or
                // restoring a project
                if (selection.isAdding(project)) {
                    badge = <ActionBadge type="restore" env={env} />;
                } else if (selection.isRemoving(project)) {
                    badge = <ActionBadge type="archive" env={env} />;
                }
            } else {
                // link to project summary in non-editing mode
                const params = { projectID: project.id };
                url = route.find('project-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{title}</a>{badge}
                </td>
            );
        }
    }

    function renderUsersColumn(project) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!project) {
            return <TH id="users">{t('project-list-column-users')}</TH>;
        } else {
            const props = {
                users: findUsers(users, project),
                disabled: selection.shown,
                project,
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    function renderRepositoriesColumn(project) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!project) {
            return <TH id="repos">{t('project-list-column-repositories')}</TH>
        } else {
            const props = {
                repos: findRepos(repos, project),
                disabled: selection.shown,
                project,
                route,
                env,
            };
            return <td><RepositoryTooltip {...props} /></td>;
        }
    }

    function renderDateRangeColumn(project) {
        if (!env.isWiderThan('ultra-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="range">{t('project-list-column-date-range')}</TH>
        } else {
            if (!project.deleted) {
                const range = _.get(statistics, [ project.id, 'range' ]);
                const start = f(_.get(range, 'start'));
                const end = f(_.get(range, 'end'));
                return <td>{t('date-range-$start-$end', start, end)}</td>;
            } else {
                return <td>{t('project-list-status-deleted')}</td>;
            }
        }
    }

    function renderLastMonthColumn(project) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="last_month">{t('project-list-column-last-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'last_month' ]),
                disabled: selection.shown,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderThisMonthColumn(project) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="this_month">{t('project-list-column-this-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'this_month' ]),
                disabled: selection.shown,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderToDateColumn(project) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!project) {
            return <TH id="to_date">{t('project-list-column-to-date')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'to_date' ]),
                disabled: selection.shown,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderModifiedTimeColumn(project) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!project) {
            return <TH id="mtime">{t('project-list-column-last-modified')}</TH>
        } else {
            const props = {
                time: project.mtime,
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }
}

const sortProjects = memoizeWeak(null, function(projects, users, repos, statistics, env, sort) {
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'title':
                return (project) => {
                    return _.toLower(ProjectUtils.getDisplayName(project, env))
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
    return _.orderBy(projects, columns, sort.directions);
});

const filterProjects = memoizeWeak(null, function(projects) {
    return _.filter(projects, (project) => {
        return !project.deleted && !project.archived;
    });
});

const findRepos = memoizeWeak(null, function(repos, project) {
    const hash = _.keyBy(repos, 'id');
    return _.filter(_.map(project.repo_ids, (id) => {
        return hash[id];
    }));
});

const findUsers = memoizeWeak(null, function(users, project) {
    const hash = _.keyBy(users, 'id');
    return _.filter(_.map(project.user_ids, (id) => {
        return hash[id];
    }));
});

const component = Relaks.memo(ProjectListPage);

export {
    component as default,
    component as ProjectListPage,
};
