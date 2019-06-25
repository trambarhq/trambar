import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSaver from 'common/objects/savers/project-saver.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';
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

import './member-list-page.scss';

async function MemberListPage(props) {
    const { database, route, env, projectID, editing } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    const users = await UserFinder.findExistingUsers(database);
    render();
    const roles = await RoleFinder.findRolesOfUsers(database, users);
    render();
    const members = filterUsers(users, project);
    const statistics = await StatisticsFinder.findDailyActivitiesOfUsers(database, project, members);
    render();

    function render() {
        const sprops = { project, users, roles, statistics };
        show(<MemberListPageSync {...sprops} {...props} />);
    }
}

function MemberListPageSync(props) {
    const { project, users, roles, statistics } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const members = filterUsers(users, project);
    const membersPlus = filterUsers(users, project, true);
    const selection = useSelectionBuffer({
        original: members,
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, users);
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleAddClick = useListener((evt) => {
        route.push('member-summary-page', { userID: 'new' });
    });
    const handleSaveClick = async (evt) => {
        run(async () => {
            await ProjectSaver.associateUsers(database, project, selection.current);
            warnDataLoss(false);
            handleCancelClick();
        });
    };
    const handleApproveClick = useListener((evt) => {
        run(async () => {
            const pendingUsers = _.filter(users, (user) => {
                return _.includes(user.requested_project_ids, project.id);
            });
            await ProjectSaver.addUsers(database, project, pendingUser);
        });
    });
    const handleRejectClick = useListener((evt) => {
        run(async () => {
            const pendingUsers = _.filter(users, (user) => {
                return _.includes(user.requested_project_ids, project.id);
            });
            await UserSaver.removeRequestedProject(database, pendingUsers, project);
        });
    });

    warnDataLoss(selection.changed);

    return (
        <div className="member-list-page">
            {renderButtons()}
            <h2>{t('member-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const membersPending = _.size(membersPlus) > _.size(members);
            const preselected = (membersPending) ? 'approve' : 'add';
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
        } else {
            const { changed } = selection;
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
        const visible = (selection.shown) ? users : membersPlus;
        const sorted = sortUsers(visible, roles, statistics, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(user) {
        const classNames = [];
        let title, onClick;
        if (!selection.isExisting(user)) {
            const pending = _.includes(user.requested_project_ids, project.id);
            if (pending) {
                classNames.push('pending');
                title = t('member-list-status-pending');
            } else {
                classNames.push('disabled');
                title = t('member-list-status-non-member');
            }
        }
        if (selection.shown) {
            if (selection.isExisting(user)) {
                classNames.push('fixed');
            }
            if (selection.isKeeping(user)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-id': user.id,
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
            const name = UserUtils.getDisplayName(user, env);
            let url, badge;
            if (selection.shown) {
                if (selection.isAdding(user)) {
                    badge = <ActionBadge type="add" env={env} />;
                } else if (selection.isRemoving(user)) {
                    badge = <ActionBadge type="remove" env={env} />;
                }
            } else {
                // don't create the link when we're editing the list
                const params = { ...route.params, userID: user.id };
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
                disabled: selection.shown,
                route,
                env,
            };
            return <td><RoleTooltip {...props} /></td>;
        }
    }

    function renderEmailColumn(user) {
        if (!env.isWiderThan('wide')) {
            return null;
        }
        if (!user) {
            return <TH id="email">{t('table-heading-email')}</TH>;
        } else {
            const contents = '-';
            const email = user.details.email;
            let url;
            if (!selection.shown && email) {
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
                disabled: selection.shown,
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
                disabled: selection.shown,
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
                disabled: selection.shown,
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
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }
}

const sortUsers = memoizeWeak(null, function(users, roles, statistics, env, sort) {
    const { p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return _.toLower(UserUtils.getDisplayName(user, env));
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

const filterUsers = memoizeWeak(null, function(users, project, includePending) {
    const existingUsers = _.filter(users, (user) => {
        return _.includes(project.user_ids, user.id);
    });
    if (includePending) {
        const pendingUsers = _.filter(users, (user) => {
            return _.includes(user.requested_project_ids, project.id);
        });
        // need to use union() here, since user.requested_project_ids could contain
        // the project id even when project.user_ids has the user id
        //
        // this will happen right after the project is saved and the the updated
        // users (changed by backend) haven't been retrieved yet
        return _.union(existingUsers, pendingUsers);
    } else {
        return existingUsers;
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
