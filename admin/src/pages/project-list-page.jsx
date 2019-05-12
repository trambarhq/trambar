import _ from 'lodash';
import React, { useRef, useCallback } from 'react';
import Relaks, { useProgress } from 'relaks';
import { useSelectionBuffer, useSortHandling, useEditToggle, useErrorHandling } from '../hooks.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
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
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './project-list-page.scss';

async function ProjectListPage(props) {
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const [ show ] = useProgress();
    const selection = useSelectionBuffer(editing);
    const confirmation = useRef();
    const db = database.use({ schema: 'global', by: this });

    const [ sort, handleSort ] = useSortHandling();
    const [ problems, setProblems, setUnexpectedError ] = useErrorHandling();
    const [ handleEditClick, handleCancelClick, handleAddClick ] = useEditToggle(route, {
        page: 'project-summary-page',
        params: { 'projectID': 'new' },
    });
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
        const projectID = parseInt(evt.currentTarget.getAttribute('data-project-id'));
        selection.toggle(projectID);
    });

    render();
    const currentUserID = await db.start();
    const projects = await ProjectFinder.findAllProjects(db);
    const activeProjects = filterProjects(projects);
    selection.base(_.map(activeProjects, 'id'));
    render();
    const repos = await RepoFinder.findProjectRepos(db, projects);
    render();
    const users = await UserFinder.findProjectMembers(db, projects);
    render();
    const statistics = await StatisticsFinder.findDailyActivitiesOfProjects(db, projects);
    render();

    function render() {
        const { changed } = selection;
        show(
            <div className="project-list-page">
                {renderButtons()}
                <h2>{t('project-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {renderTable()}
                <ActionConfirmation ref={confirmation} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = selection;
        if (editing) {
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
        } else {
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
            if (selection.existing(project.id)) {
                classNames.push('fixed');
            }
            if (selection.adding(project.id) || selection.keeping(project.id)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-project-id': project.id,
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
            return <TH id="title">{t('table-heading-name')}</TH>;
        } else {
            let title = p(project.details.title) || project.name;
            let url, badge;
            if (selection.shown) {
                // add a badge next to the name if we're archiving or
                // restoring a project
                if (selection.adding(project.id)) {
                    badge = <ActionBadge type="restore" env={env} />;
                } else if (selection.removing(project.id)) {
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
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            const props = {
                users: findUsers(users, project),
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
            return <TH id="repos">{t('table-heading-repositories')}</TH>
        } else {
            const props = {
                repos: findRepos(repos, project),
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
            return <TH id="range">{t('table-heading-date-range')}</TH>
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
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'last_month' ]),
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
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'this_month' ]),
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
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ project.id, 'to_date' ]),
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
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: project.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    async function saveSelection() {
        const changes = [];
        let remove = 0, add = 0;
        for (let project of projects) {
            const columns = { id: project.id };
            if (selection.removing(project.id)) {
                columns.archived = true;
                remove++;
            } else if (selection.adding(project.id)) {
                columns.archived = columns.deleted = false;
                add++;
            } else {
                continue;
            }
            changes.push(columns);
        }

        const { ask } = confirmation.current;
        if (remove) {
            const confirmed = await ask(t('project-list-confirm-archive-$count', remove));
            if (!confirmed) {
                return;
            }
        }
        if (add) {
            const confirmed = await ask(t('project-list-confirm-restore-$count', add));
            if (!confirmed) {
                return;
            }
        }
        const projectsAfter = await db.save({ table: 'project' }, changes);
        return projectsAfter;
    }
}

const sortProjects = memoizeWeak(null, function(projects, users, repos, statistics, env, sort) {
    const { p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
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
