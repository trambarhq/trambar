import React from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { findProject } from 'common/objects/finders/project-finder.js';
import { associateUsers, addUsers } from 'common/objects/savers/project-saver.js';
import { findRolesOfUsers } from 'common/objects/finders/role-finder.js';
import { findExistingUsers } from 'common/objects/finders/user-finder.js';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { findDailyActivitiesOfUsers } from 'common/objects/finders/statistics-finder.js';
import { hashById, findByIds, orderBy } from 'common/utils/array-utils.js';

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
} from '../hooks.js';

import './member-list-page.scss';

export default async function MemberListPage(props) {
  const { database, route, env, projectID, editing } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const project = await findProject(database, projectID);
  const users = await findExistingUsers(database);
  render();
  const roles = await findRolesOfUsers(database, users);
  render();
  const members = filterUsers(users, project);
  const statistics = await findDailyActivitiesOfUsers(database, project, members);
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
  const [ sort, handleSort ] = useSortHandler();
  const visibleUsers = useMemo(() => {
    const visible = (selection.shown) ? users : membersPlus;
    return sortUsers(visible, roles, statistics, env, sort);
  }, [ selection.shown, roles, statistics, env, sort ]);
  const rolesOfUsers = useMemo(() => {
    return hashById(users, user => findByIds(roles, user.role_ids));
  });

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
    route.push('member-summary-page', { userID: 'new' });
  });
  const handleSaveClick = async (evt) => {
    run(async () => {
      await associateUsers(database, project, selection.current);
      warnDataLoss(false);
      handleCancelClick();
    });
  };
  const handleApproveClick = useListener((evt) => {
    run(async () => {
      const pendingUsers = users.filter((user) => {
        return user.requested_project_ids.includes(project.id);
      });
      await addUsers(database, project, pendingUser);
    });
  });
  const handleRejectClick = useListener((evt) => {
    run(async () => {
      const pendingUsers = users.filter((user) => {
        return user.requested_project_ids.includes(project.id);
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
      const membersPending = membersPlus?.length > members?.length;
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
    return visibleUsers.map(renderRow);
  }

  function renderRow(user) {
    const classNames = [];
    let title, onClick;
    if (!selection.isExisting(user)) {
      const pending = user.requested_project_ids.includes(project.id);
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
      return <TH id="name">{t('member-list-column-name')}</TH>;
    } else {
      const name = getUserName(user, env);
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
      return <TH id="type">{t('member-list-column-type')}</TH>;
    } else {
      return <td>{t(`user-list-type-${user.type}`)}</td>;
    }
  }

  function renderRolesColumn(user) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!user) {
      return <TH id="roles">{t('member-list-column-roles')}</TH>;
    } else {
      const props = {
        roles: rolesOfUsers[user.id],
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
      return <TH id="email">{t('member-list-column-email')}</TH>;
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
      return <TH id="range">{t('member-list-column-date-range')}</TH>
    } else {
      const range = statistics?.[user.id]?.range;
      const start = f(range?.start);
      const end = f(range?.end);
      return <td>{t('date-range-$start-$end', start, end)}</td>;
    }
  }

  function renderLastMonthColumn(user) {
    if (!env.isWiderThan('super-wide')) {
      return null;
    }
    if (!user) {
      return <TH id="last_month">{t('member-list-column-last-month')}</TH>
    } else {
      const props = {
        statistics: statistics?.[user.id]?.last_month,
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
      return <TH id="this_month">{t('member-list-column-this-month')}</TH>
    } else {
      const props = {
        statistics: statistics?.[user.id]?.this_month,
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
      return <TH id="to_date">{t('member-list-column-to-date')}</TH>
    } else {
      const props = {
        statistics: statistics?.[user.id]?.to_date,
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
      return <TH id="mtime">{t('member-list-column-last-modified')}</TH>
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

function sortUsers(users, roles, statistics, env, sort) {
  if (!users) {
    return [];
  }
  const columns = sort.columns.map((column) => {
    switch (column) {
      case 'name':
        return (user) => {
          return getUserName(user, env).toLowerCase();
        };
      case 'range':
        return (user) => {
          return statistics?.[user.id]?.range?.start ?? '';
        };
      case 'last_month':
        return (user) => {
          return statistics?.[user.id]?.last_month?.total ?? 0;
        };
      case 'this_month':
        return (user) => {
          return statistics?.[user.id]?.this_month?.total ?? 0;
        };
      case 'to_date':
        return (user) => {
          return statistics?.[user.id]?.to_date?.total ?? 0;
        };
      default:
        return column;
    }
  });
  return orderBy(users, columns, sort.directions);
}

function filterUsers(users, project, includePending) {
  const results = [];
  for (let user of users) {
    let include = false;
    if (project.user_ids.includes(user.id)) {
      include = true;
    }
    if (!include && includePending) {
      if (user.requested_project_ids) {
        if (user.requested_project_ids?.includes(project.id)) {
          include = true;
        }
      }
    }
    if (include) {
      results.push(user);
    }
  }
  return results;
});
