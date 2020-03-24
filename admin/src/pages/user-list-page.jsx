import Moment from 'moment';
import React, { useState, useRef, useMemo } from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { findProjectsWithMembers } from 'common/objects/finders/project-finder.js';
import { getProjectName } from 'common/objects/utils/project-utils.js';
import { findRolesOfUsers } from 'common/objects/finders/role-finder.js';
import { getRoleName } from 'common/objects/utils/role-utils.js';
import { findAllUsers } from 'common/objects/finders/user-finder.js';
import { disableUsers, restoreUsers } from 'common/objects/savers/user-saver.js';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { UserTypes } from 'common/objects/types/user-types.js';
import { findByIds, orderBy } from 'common/utils/array-utils.js';

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
import { useSelectionBuffer, useSortHandler, useRowToggle, useConfirmation, useDataLossWarning, } from '../hooks.js';

import './user-list-page.scss';

export default async function UserListPage(props) {
  const { database } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const users = await findAllUsers(database);
  render();
  const projects = await findProjectsWithMembers(database, users);
  render();
  const roles = await findRolesOfUsers(database, users);
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
  const activeUsers = useMemo(() => {
    return filterUsers(users);
  });
  const selection = useSelectionBuffer({
    original: activeUsers,
    reset: readOnly,
  });
  const [ sort, handleSort ] = useSortHandler();
  const visibleUsers = useMemo(() => {
    const visible = (selection.shown) ? users : activeUsers;
    return sortUsers(visible, roles, projects, env, sort);
  }, [ selection.shown, users, roles, projects, env, sort ]);
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

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
      await disableUsers(database, removing);
      await restoreUsers(database, adding);
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
      const empty = !users?.length;
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
    return visibleUsers.map(renderRow);
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
      const name = getUserName(user, env);
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
        roles: findByIds(roles, user.role_ids),
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

function sortUsers(users, roles, projects, env, sort) {
  if (!users) {
    return [];
  }
  const columns = sort.columns.map((column) => {
    switch (column) {
      case 'name':
        return u => getUserName(u, env).toLowerCase();
      case 'username':
        return u => user.username.toLowerCase();
      case 'type':
        return u => UserTypes.indexOf(u.type);
      case 'roles':
        return (user) => {
          const role0 = findByIds(roles, user.role_ids)[0];
          if (!role0) {
            return '';
          }
          return getRoleName(role0, env).toLowerCase();
        };
      case 'projects':
        return (user) => {
          let project0 = findProjects(projects, user)[0];
          if (!project0) {
            return '';
          }
          return getProjectName(project0, env).toLowerCase();
        };
      case 'email':
        return u => u.details.email || '';
      default:
        return column;
    }
  });
  return orderBy(users, columns, sort.directions);
}

function filterUsers(users) {
  if (!users) {
    return [];
  }
  return users.filter((user) => {
    return (user.disabled !== true) && (user.deleted !== true);
  });
}

function findProjects(projects, user) {
  if (!projects) {
    return [];
  }
  return projects.filter((project) => {
    return (project.user_ids.includes(user.id));
  });
}
