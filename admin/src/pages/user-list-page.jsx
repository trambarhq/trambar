import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as RoleUtils from 'common/objects/utils/role-utils.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserSaver from 'common/objects/savers/user-saver.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';
import UserTypes from 'common/objects/types/user-types.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';
import { ProjectTooltip } from '../tooltips/project-tooltip.jsx';
import { RoleTooltip } from '../tooltips/role-tooltip.jsx';
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

import './user-list-page.scss';

async function UserListPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const users = await UserFinder.findAllUsers(database);
    render();
    const projects = await ProjectFinder.findProjectsWithMembers(database, users);
    render();
    const roles = await RoleFinder.findRolesOfUsers(database, users);
    render();

    function render() {
        const sprops = { users, projects, roles };
        show(<UserListPageSync {...sprops} {...props} />);
    }
}

function UserListPageSync(props) {
    const { users, projects, roles } = props;
    const { database, route, env, projectID, editing } = props;
    const { t, p, f } = env.locale;
    const readOnly = !editing;
    const activeUsers = filterUsers(users);
    const selection = useSelectionBuffer({
        original: activeUsers,
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
        route.push('user-summary-page', { userID: 'new' });
    });
    const handleSaveClick = useListener(async (evt) => {
        run(async () => {
            const removing = selection.removing();
            if (removing.length > 0) {
                await confirm(t('user-list-confirm-disable-$count', removing.length));
            }
            const adding = selection.adding();
            if (adding.length > 0) {
                await confirm(t('user-list-confirm-reactivate-$count', adding.length));
            }
            await UserSaver.disableUsers(database, removing);
            await UserSaver.restoreUsers(database, adding);
            warnDataLoss(false);
            handleCancelClick();
        });
    });

    warnDataLoss(selection.changed);

    return (
        <div className="user-list-page">
            {renderButtons()}
            <h2>{t('user-list-title')}</h2>
            <UnexpectedError error={error} />
            {renderTable()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const empty = _.isEmpty(users);
            return (
                <div className="buttons">
                    <ComboButton>
                        <option name="add" onClick={handleAddClick}>
                            {t('user-list-add')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" disabled={empty} onClick={handleEditClick}>
                        {t('user-list-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = selection;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('user-list-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('user-list-save')}
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
            tableProps.expanded = !readOnly;
            tableProps.expandable = true;
            tableProps.selectable = true;
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
                {renderUsernameColumn()}
                {renderTypeColumn()}
                {renderRolesColumn()}
                {renderProjectsColumn()}
                {renderEmailColumn()}
                {renderModifiedTimeColumn()}
            </tr>
        );
    }

    function renderRows() {
        const visible = (selection.shown) ? users : activeUsers;
        const sorted = sortUsers(visible, roles, projects, env, sort);
        return _.map(sorted, renderRow);
    }

    function renderRow(user) {
        const classNames = [];
        let onClick, title;
        if (user.deleted) {
            classNames.push('deleted');
            title = t('user-list-status-deleted');
        } else if (user.disabled) {
            classNames.push('disabled');
            title = t('user-list-status-disabled');
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
        let props = {
            className: classNames.join(' '),
            'data-id': user.id,
            title,
            onClick,
        };
        return (
            <tr key={user.id} {...props}>
                {renderNameColumn(user)}
                {renderUsernameColumn(user)}
                {renderTypeColumn(user)}
                {renderRolesColumn(user)}
                {renderProjectsColumn(user)}
                {renderEmailColumn(user)}
                {renderModifiedTimeColumn(user)}
            </tr>
        );
    }

    function renderNameColumn(user) {
        if (!user) {
            return <TH id="name">{t('user-list-column-name')}</TH>;
        } else {
            const name = UserUtils.getDisplayName(user, env);
            let url, badge;
            if (selection.shown) {
                if (selection.isAdding(user)) {
                    badge = <ActionBadge type="reactivate" env={env} />;
                } else if (selection.isRemoving(user)) {
                    badge = <ActionBadge type="disable" env={env} />;
                }
            } else {
                // don't create the link when we're editing the list
                const params = { userID: user.id }
                url = route.find('user-summary-page', params);
            }
            const image = <ProfileImage user={user} env={env} />;
            return (
                <td>
                    <a href={url}>{image} {name}</a>{badge}
                </td>
            );
        }
    }

    function renderUsernameColumn(user) {
        if (!env.isWiderThan('narrow')) {
            return null;
        }
        if (!user) {
            return <TH id="username">{t('user-list-column-username')}</TH>;
        } else {
            return (
                <td>{user.username}</td>
            );
        }
    }

    function renderTypeColumn(user) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="type">{t('user-list-column-type')}</TH>;
        } else {
            return <td>{t(`user-list-type-${user.type}`)}</td>;
        }
    }

    function renderProjectsColumn(user) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="projects">{t('user-list-column-projects')}</TH>;
        } else {
            const props = {
                projects: findProjects(projects, user),
                disabled: selection.shown,
                route,
                env,
            };
            return <td><ProjectTooltip {...props} /></td>;
        }
    }

    function renderRolesColumn(user) {
        if (!env.isWiderThan('super-wide')) {
            return null;
        }
        if (!user) {
            return <TH id="roles">{t('user-list-column-roles')}</TH>;
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
            return <TH id="email">{t('user-list-column-email')}</TH>;
        } else {
            let contents = '-';
            const email = user.details.email;
            if (email) {
                let url;
                if (!selection.shown) {
                    url = `mailto:${email}`;
                }
                contents = <a href={url}>{email}</a>;
            }
            return <td className="email">{contents}</td>;
        }
    }

    function renderModifiedTimeColumn(user) {
        if (!env.isWiderThan('standard')) {
            return null;
        }
        if (!user) {
            return <TH id="mtime">{t('user-list-column-last-modified')}</TH>
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

const sortUsers = memoizeWeak(null, function(users, roles, projects, env, sort) {
    const columns = _.map(sort.columns, (column) => {
        switch (column) {
            case 'name':
                return (user) => {
                    return _.toLower(UserUtils.getDisplayName(user, env));
                };
            case 'username':
                return (user) => {
                    return _.toLower(user.username);
                };
            case 'type':
                return (user) => {
                    return _.indexOf(UserTypes, user.type);
                };
            case 'roles':
                return (user) => {
                    let role0 = _.first(findRoles(roles, user));
                    if (!role0) {
                        return '';
                    }
                    return _.toLower(RoleUtils.getDisplayName(role0, env));
                };
            case 'projects':
                return (user) => {
                    let project0 = _.first(findProjects(projects, user));
                    if (!project0) {
                        return '';
                    }
                    return _.toLower(ProjectUtils.getDisplayName(project0, env));
                };
            case 'email':
                return 'details.email';
            default:
                return column;
        }
    });
    return _.orderBy(users, columns, sort.directions);
});

const filterUsers = memoizeWeak(null, function(users) {
    return _.filter(users, (user) => {
        return (user.disabled !== true) && (user.deleted !== true);
    });
});

const findProjects = memoizeWeak(null, function(projects, user) {
    return _.filter(projects, (project) => {
        return _.includes(project.user_ids, user.id);
    });
});

const findRoles = memoizeWeak(null, function(roles, user) {
    const hash = _.keyBy(roles, 'id');
    return _.filter(_.map(user.role_ids, (id) => {
        return hash[id];
    }));
});

const component = Relaks.memo(UserListPage);

export {
    component as default,
    component as UserListPage,
};
