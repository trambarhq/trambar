import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';
import { ActivityTooltip } from '../tooltips/activity-tooltip.jsx';
import { RoleTooltip } from '../tooltips/role-tooltip.jsx';
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './member-list-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Member List page.
 */
async function MemberListPage(props) {
    const { database, route, env, projectID, editing } = props;
    const { t, p, f } = env.locale;
    const [ show ] = useProgress();
    const [ sort, setSort ] = useState({ columns: [ 'name' ], directions: [ 'asc' ] });
    const selection = useSaveBuffer({
        original: { adding: [], removing: [] },
        compare: _.isEqual,
    });
    const [ renderingFullList, setRenderingFullList ] = useState(false);
    const [ problems, setProblems ] = useState({});
    const db = database.use({ schema: 'global', by: this });

    const handleSort = useCallback((evt) => {
        const { columns, directions } = evt;
        setSort({ columns, directions });
    });
    const handleEditClick = useCallback((evt) => {
        route.modify({ editing: true });
    }, [ route ]);
    const handleAddClick = useCallback((evt) => {
        const params = _.assign({}, route.params, { userID: 'new' });
        route.push('member-summary-page', params);
    }, [ route ]);
    const handleCancelClick = useCallback((evt) => {
        route.modify({ editing: undefined });
    }, [ route ]);
    const handleSaveClick = useCallback(async (evt) => {
        try {
            await saveSelection();
            await route.modify({ editing: undefined });
            selection.reset();
        } catch (err) {
            saveUnexpectError(err);
        }
    }, [ route, saveSelection ]);
    const handleApproveClick = useCallback(async (evt) => {
        try {
            await updateMemberList();
        } catch (err) {
            saveUnexpectError(err);
        }
    }, [ updateMemberList ]);
    const handleRejectClick = useCallback(async(evt) => {
        try {
            await rejectPendingUsers();
        } catch (err) {
            saveUnexpectError(err);
        }
    }, [ rejectPendingUsers ]);
    const handleRowClick = useCallback((evt) => {
        const userID = parseInt(evt.currentTarget.getAttribute('data-user-id'));
        toggleUser(userID);
    }, [ toggleUser ]);

    render();
    const currentUserID = await db.start();
    const project = await ProjectFinder.findProject(db, projectID);
    const users = await UserFinder.findExistingUsers(db);
    render();
    const roles = await RoleFinder.findRolesOfUsers(db, users);
    render();
    const members = findUsers(users, project);
    const statistics = await StatisticsFinder.findDailyActivitiesOfUsers(db, project, members);
    render();

    function render() {
        const { changed } = selection;
        show (
            <div className="member-list-page">
                {renderButtons()}
                <h2>{t('member-list-title')}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {renderTable()}
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = selection;
        if (editing) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('member-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('member-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            const userIDs = _.get(project, 'user_ids');
            const membersPending = _.some(users, (user) => {
                return !_.includes(userIDs, user.id);
            });
            const preselected = (membersPending) ? 'approve' : undefined;
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="approve" disabled={!membersPending} onClick={handleApproveClick}>
                            {t('member-list-approve-all')}
                        </option>
                        <option name="reject" disabled={!membersPending} onClick={handleRejectClick}>
                            {t('member-list-reject-all')}
                        </option>
                        <option name="add" separator onClick={handleAddClick}>
                            {t('member-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('member-list-edit')}
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
        if (renderingFullList) {
            tableProps.expandable = true;
            tableProps.selectable = true;
            tableProps.expanded = editing;
        }
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {renderHeadings()}
                </thead>
                <tbody>
                    {renderRows()}
                </tbody>
            </SortableTable>
        );
    }

    function renderHeadings() {
        return (
            <tr>
                {renderNameColumn()}
                {renderTypeColumn()}
                {renderRolesColumn()}
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
        if (renderingFullList) {
            // list all users when we're editing the list
            visible = users;
        } else {
            // list only those who're in the project--or are trying to join
            visible = findUsers(users, project);
        }
        visible = sortUsers(visible, roles, statistics, env, sort);
        return _.map(visible, renderRow);
    }

    function renderRow(user) {
        const existing = _.includes(project.user_ids, user.id);
        const pending = _.includes(user.requested_project_ids, project.id);
        const classNames = [];
        let title, onClick;
        if (!existing) {
            if (pending) {
                classNames.push('pending');
                title = t('member-list-status-pending');
            } else {
                classNames.push('disabled');
                title = t('member-list-status-non-member');
            }
        }
        if (renderingFullList) {
            if (existing || pending) {
                classNames.push('fixed');
            }
            if (existing) {
                if (!_.includes(selection.removing, user.id)) {
                    classNames.push('selected');
                }
            } else {
                if (_.includes(selection.adding, user.id)) {
                    classNames.push('selected');
                }
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-user-id': user.id,
            onClick,
            title,
        };
        return (
            <tr key={user.id} {...props}>
                {renderNameColumn(user)}
                {renderTypeColumn(user)}
                {renderRolesColumn(user)}
                {renderDateRangeColumn(user)}
                {renderLastMonthColumn(user)}
                {renderThisMonthColumn(user)}
                {renderToDateColumn(user)}
                {renderModifiedTimeColumn(user)}
            </tr>
        );
    }

    function renderNameColumn(user) {
        if (!user) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            const name = p(user.details.name);
            let url, badge;
            if (renderingFullList) {
                // compare against original list if the member will be added or removed
                const userIDs = _.get(project, 'user_ids', []);
                const includedBefore = _.includes(userIDs, user.id);
                const includedAfter = (includedBefore)
                                    ? !_.includes(selection.removing, user.id)
                                    : _.includes(selection.adding, user.id);
                if (includedBefore !== includedAfter) {
                    if (includedAfter) {
                        badge = <ActionBadge type="add" env={env} />;
                    } else {
                        badge = <ActionBadge type="remove" env={env} />;
                    }
                }
            } else {
                // don't create the link when we're editing the list
                const params = _.clone(route.params);
                params.userID = user.id;
                url = route.find('member-summary-page', params);
            }
            const image = <ProfileImage user={user} env={env} />;
            return (
                <td>
                    <a href={url}>{image} {name}</a>{badge}
                </td>
            );
        }
    }

    function renderTypeColumn(user) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!user) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`user-list-type-${user.type}`)}</td>;
        }
    }

    function renderRolesColumn(user) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="roles">{t('table-heading-roles')}</TH>;
        } else {
            const props = {
                roles: findRoles(roles, user),
                disabled: renderingFullList,
                route,
                env,
            };
            return <td><RoleTooltip {...props} /></td>;
        }
    }

    function renderEmailColumn(user) {
        let { env } = this.props;
        let { renderingFullList } = this.state;
        let { t } = env.locale;
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!user) {
            return <TH id="email">{t('table-heading-email')}</TH>;
        } else {
            let contents = '-';
            let email = user.details.email;
            let url;
            if (!renderingFullList && email) {
                url = `mailto:${email}`;
            }
            return <td><a href={url}>{email}</a></td>;
        }
    }

    function renderDateRangeColumn(user) {
        if (!env.isWiderThan('ultra-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="range">{t('table-heading-date-range')}</TH>
        } else {
            const range = _.get(statistics, [ user.id, 'range' ]);
            const start = f(_.get(range, 'start'));
            const end = f(_.get(range, 'end'));
            return <td>{t('date-range-$start-$end', start, end)}</td>;
        }
    }

    function renderLastMonthColumn(user) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="last_month">{t('table-heading-last-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ user.id, 'last_month' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderThisMonthColumn(user) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="this_month">{t('table-heading-this-month')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ user.id, 'this_month' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderToDateColumn(user) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="to_date">{t('table-heading-to-date')}</TH>
        } else {
            const props = {
                statistics: _.get(statistics, [ user.id, 'to_date' ]),
                disabled: renderingFullList,
                env,
            };
            return <td><ActivityTooltip {...props} /></td>;
        }
    }

    function renderModifiedTimeColumn(user) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: user.mtime,
                disabled: renderingFullList,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    function toggleUser(userID) {
        let { adding, removing } = selection.current;
        if (_.includes(project.user_ids, userID)) {
            removing = _.toggle(removing, userID);
        } else {
            adding = _.toggle(adding, userID);
        }
        selection.set({ adding, removing });
    }

    async function saveSelection() {
        const { adding, removing } = selection.current;
        updateMemberList(adding, removing);
    }

    async function approvePendingUsers() {
        const pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        const adding = _.map(pendingUsers, 'id');
        return updateMemberList(adding, []);
    }

    async function rejectPendingUsers() {
        const pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        const changes = _.map(pendingUsers, (user) => {
            return {
                id: user.id,
                requested_project_ids: _.without(user.requested_project_ids, project.id),
            };
        });
        const currentUserID = await db.start();
        const users = await db.save({ table: 'user' }, changes);
        return users;
    }

    async function updateMemberList(adding, removing) {
        const userIDs = project.user_ids;
        const userIDsAfter = _.difference(_.union(userIDs, adding), removing);
        const columns = { id: project.id, user_ids: userIDsAfter };
        const currentUserID = await db.start();
        const projectAfter = await db.saveOne({ table: 'project' }, columns);
        return projectAfter;
    }

    function saveUnexpectError(err) {
        const newProblems = { unexpected: err.message };
        setProblems(newProblems);
    }
}

const sortUsers = memoizeWeak(null, function(users, roles, statistics, env, sort) {
    const { p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return p(user.details.name);
                };
            case 'range':
                return (user) => {
                    return _.get(statistics, [ user.id, 'range', 'start' ], '');
                };
            case 'last_month':
                return (user) => {
                    return _.get(statistics, [ user.id, 'last_month', 'total' ], 0);
                };
            case 'this_month':
                return (user) => {
                    return _.get(statistics, [ user.id, 'this_month', 'total' ], 0);
                };
            case 'to_date':
                return (user) => {
                    return _.get(statistics, [ user.id, 'to_date', 'total' ], 0);
                };
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, sort.directions);
});

const findUsers = memoizeWeak(null, function(users, project) {
    if (project) {
        const hash = _.keyBy(users, 'id');
        const existingUsers = _.filter(_.map(project.user_ids, (id) => {
            return hash[id];
        }));
        const pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        // need to use union() here, since user.requested_project_ids could contain
        // the project id even when project.user_ids has the user id
        //
        // this will happen right after the project is saved and the the updated
        // users (changed by backend) haven't been retrieved yet
        return _.union(existingUsers, pendingUsers);
    }
});

const findRoles = memoizeWeak(null, function(roles, user) {
    const hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});

const component = Relaks.memo(MemberListPage);

export {
    component as default,
    component as MemberListPage,
};
