import _ from 'lodash';
import React, { useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as RoleSaver from 'common/objects/savers/role-saver.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { UserTooltip } from '../tooltips/user-tooltip.jsx';
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

import './role-list-page.scss';

async function RoleListPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const roles = await RoleFinder.findAllRoles(database);
    render();
    const users = await UserFinder.findUsersWithRoles(database, roles);
    render();

    function render() {
        const sprops = { roles, users };
        show(<RoleListPageSync {...sprops} {...props} />);
    }
}

function RoleListPageSync(props) {
    const { roles, users } = props;
    const { database, route, env, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const activeRoles = filterRoles(roles);
    const selection = useSelectionBuffer({
        original: _.map(activeRoles, 'id'),
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const [ sort, handleSort ] = useSortHandler();
    const handleRowClick = useRowToggle(selection, 'data-role-id');
    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        route.replace({ editing: undefined });
    });
    const handleAddClick = useListener((evt) => {
        route.push('role-summary-page', { roleID: 'new' });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            const removal = _.filter(roles, 'removing');
            const addition = _.filter(roles, 'adding');
            if (removal.length > 0) {
                await confirm(t('role-list-confirm-disable-$count', removal.length));
            }
            if (addition.length > 0) {
                await confirm(t('role-list-confirm-reactivate-$count', addition.length));
            }
            await RoleSaver.disableRoles(database, removal);
            await RoleSaver.restoreRoles(database, addition);
            warnDataLoss(false);
            handleCancelClick();
        });
    });

    warnDataLoss(selection.changed);

    return (
        <div className="role-list-page">
            {renderButtons()}
            <h2>{t('role-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
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
        } else {
            const { changed } = selection;
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
                const params = { roleID: role.id };
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
                disabled: selection.shown,
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
                disabled: selection.shown,
                env,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
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
