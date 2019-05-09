import _ from 'lodash';
import React, { useRef, useCallback } from 'react';
import Relaks, { useProgress } from 'relaks';
import { useSelectionBuffer, useSortHandling, useEditToggle, useErrorHandling } from '../hooks.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { UserTooltip } from '../tooltips/user-tooltip.jsx';
import { ModifiedTimeTooltip } from '../tooltips/modified-time-tooltip.jsx'
import { ActionBadge } from '../widgets/action-badge.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './role-list-page.scss';

async function RoleListPage(props) {
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const [ show ] = useProgress();
    const selection = useSelectionBuffer(editing);
    const confirmation = useRef();
    const db = database.use({ schema: 'global', by: this });

    const [ sort, handleSort ] = useSortHandling();
    const [ problems, setProblems, setUnexpectedError ] = useErrorHandling();
    const [ handleEditClick, handleCancelClick, handleAddClick ] = useEditToggle(route, {
        page: 'role-summary-page',
        params: { roleID: 'new' },
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
        const roleID = parseInt(evt.currentTarget.getAttribute('data-role-id'));
        selection.toggle(roleID);
    });

    render();
    const currentUserID = await db.start();
    const roles = await RoleFinder.findAllRoles(db);
    const activeRoles = filterRoles(roles);
    selection.base(_.map(activeRoles, 'id'));
    render();
    const users = await UserFinder.findUsersWithRoles(db, roles);
    render();

    function render() {
        const { changed } = selection;
        show(
            <div className="role-list-page">
                {renderButtons()}
                <h2>{t('role-list-title')}</h2>
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
                        {t('role-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('role-list-save')}
                    </PushButton>
                </div>
            );
        } else {
            const preselected = 'add';
            const empty = _.isEmpty(roles);
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="add" onClick={handleAddClick}>
                            {t('role-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('role-list-edit')}
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
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        const visible = (selection.shown) ? roles : activeRoles;
        const sorted = sortRoles(visible, users, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(role) {
        const classNames = [];
        let onClick, title;
        if (role.deleted) {
            classNames.push('deleted');
            title = t('role-list-status-deleted');
        } else if (role.disabled) {
            classNames.push('disabled');
            title = t('role-list-status-disabled');
        }
        if (selection.shown) {
            if (selection.existing(role.id)) {
                classNames.push('fixed');
            }
            if (selection.adding(role.id) || selection.keeping(role.id)) {
                classNames.push('selected');
            }
            onClick = handleRowClick;
        }
        const props = {
            className: classNames.join(' '),
            'data-role-id': role.id,
            title,
            onClick,
        };
        return (
            <tr key={role.id} {...props}>
                {renderTitleColumn(role)}
                {renderUsersColumn(role)}
                {renderModifiedTimeColumn(role)}
            </tr>
        );
    }

    function renderTitleColumn(role) {
        if (!role) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            const title = p(role.details.title) || role.name || '-';
            let url, badge;
            if (selection.shown) {
                // add a badge next to the name if we're disabling or
                // restoring a role
                if (selection.adding(role.id)) {
                    badge = <ActionBadge type="reactivate" env={env} />;
                } else if (selection.removing(role.id)) {
                    badge = <ActionBadge type="disable" env={env} />;
                }
            } else {
                let params = { roleID: role.id };
                url = route.find('role-summary-page', params);
            }
            return (
                <td>
                    <a href={url}>{title}</a> {badge}
                </td>
            );
        }
    }

    function renderUsersColumn(role) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!role) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            const props = {
                users: findUsers(users, role),
                route,
                env,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    }

    function renderModifiedTimeColumn(role) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!role) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            const props = {
                time: role.mtime,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    }

    async function saveSelection() {
        const { ask } = confirmation.current;
        const { adding, removing } = selection.current;
        if (!_.isEmpty(removing)) {
            const question = t('role-list-confirm-disable-$count', removing.length);
            const confirmed = await ask(question);
            if (!confirmed) {
                return;
            }
        }
        if (!_.isEmpty(adding)) {
            const question = t('role-list-confirm-reactivate-$count', adding.length);
            const confirmed = await ask(question);
        }
        const changes = [];
        for (let role of roles) {
            const columns = { id: role.id };
            if (_.includes(removing, role.id)) {
                columns.disabled = true;
            } else if (_.includes(adding, role.id)) {
                columns.disabled = flags.deleted = false;
            } else {
                continue;
            }
            changes.push(columns);
        }
        const rolesAfter = await db.save({ table: 'role' }, changes);
        return rolesAfter;
    }
}

const filterRoles = memoizeWeak(null, function(roles) {
    return _.filter(roles, (role) => {
        return !role.deleted && !role.disabled;
    });
});

const sortRoles = memoizeWeak(null, function(roles, users, env, sort) {
    const { p } = env.locale;
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'title':
                return (role) => {
                    return p(role.details.title)
                };
            case 'users':
                return (role) => {
                    return _.size(findUsers(users, role));
                };
            default:
                return column;
        }
    });
    return _.orderBy(roles, columns, sort.directions);
});

const findUsers = memoizeWeak(null, function(users, role) {
    return _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
});

const component = Relaks.memo(RoleListPage);

export {
    component as default,
    component as RoleListPage,
};
