import React from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import { findAllServers } from 'common/objects/finders/server-finder.js';
import { disableServers, restoreServers } from 'common/objects/savers/server-saver.js';
import { getServerName, getServerIconClass } from 'common/objects/utils/server-utils.js';
import { findActiveUsers } from 'common/objects/finders/user-finder.js';
import { orderBy } from 'common/utils/array-utils.js';

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
} from '../hooks.js';

import './server-list-page.scss';

export default async function ServerListPage(props) {
  const { database } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const servers = await findAllServers(database);
  render();
  const users = await findActiveUsers(database);
  render();

  function render() {
    const sprops = { servers, users };
    show(<ServerListPageSync {...sprops} {...props} />);
  }
}

function ServerListPageSync(props) {
  const { servers, users } = props;
  const { database, route, env, editing } = props;
  const { t, p, f } = env.locale;
  const readOnly = !editing;
  const activeServers = filterServers(servers);
  const selection = useSelectionBuffer({
    original: activeServers,
    reset: readOnly,
  });
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

  const [ sort, handleSort ] = useSortHandler();
  const handleRowClick = useRowToggle(selection, servers);
  const handleEditClick = useListener((evt) => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener((evt) => {
    route.replace({ editing: undefined });
  });
  const handleAddClick = useListener((evt) => {
    route.push('server-summary-page', { serverID: 'new' });
  });
  const handleSaveClick = useListener((evt) => {
    run(async () => {
      const removing = selection.removing();
      if (removing.length > 0) {
        await confirm(t('server-list-confirm-disable-$count', removing.length));
      }
      const adding = selection.adding();
      if (adding.length > 0) {
        await confirm(t('server-list-confirm-reactivate-$count', adding.length));
      }
      await disableServers(database, removing);
      await restoreServers(database, adding);
      warnDataLoss(false);
      handleCancelClick();
    });
  });

  warnDataLoss(selection.changed);

  return (
    <div className="server-list-page">
      {renderButtons()}
      <h2>{t('server-list-title')}</h2>
      <UnexpectedError error={error} />
      {renderTable()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      const preselected = 'add';
      const empty = !servers?.length;
      return (
        <div className="buttons">
          <ComboButton preselected={preselected}>
            <option name="add" onClick={handleAddClick}>
              {t('server-list-add')}
            </option>
          </ComboButton>
          {' '}
          <PushButton name="edit" className="emphasis" disabled={empty} onClick={handleEditClick}>
            {t('server-list-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = selection;
      return (
        <div className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('server-list-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('server-list-save')}
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
        {renderTypeColumn()}
        {renderOAuthColumn()}
        {renderAPIColumn()}
        {renderUsersColumn()}
        {renderModifiedTimeColumn()}
      </tr>
    );
  }

  function renderRows() {
    const visible = (selection.shown) ? servers : activeServers;
    const sorted = sortServers(visible, users, env, sort);
    return sorted?.map(renderRow);
  }

  function renderRow(server) {
    const classNames = [];
    let onClick, title;
    if (server.deleted) {
      classNames.push('deleted');
      title = t('server-list-status-deleted');
    } else if (server.disabled) {
      classNames.push('disabled');
      title = t('server-list-status-disabled');
    }
    if (selection.shown) {
      if (selection.isExisting(server)) {
        classNames.push('fixed');
      }
      if (selection.isKeeping(server)) {
        classNames.push('selected');
      }
      onClick = handleRowClick;
    }
    const props = {
      className: classNames.join(' '),
      'data-id': server.id,
      title,
      onClick,
    };
    return (
      <tr key={server.id} {...props}>
        {renderTitleColumn(server)}
        {renderTypeColumn(server)}
        {renderOAuthColumn(server)}
        {renderAPIColumn(server)}
        {renderUsersColumn(server)}
        {renderModifiedTimeColumn(server)}
      </tr>
    );
  }

  function renderTitleColumn(server) {
    if (!server) {
      return <TH id="title">{t('server-list-column-title')}</TH>;
    } else {
      const title = getServerName(server, env);
      let url, badge;
      if (selection.shown) {
        if (selection.isAdding(server)) {
          badge = <ActionBadge type="reactivate" env={env} />;
        } else if (selection.isRemoving(server)) {
          badge = <ActionBadge type="disable" env={env} />;
        }
      } else {
        const params = { serverID: server.id };
        url = route.find('server-summary-page', params);
      }
      return (
        <td>
          <a href={url}>{title}</a>{badge}
        </td>
      );
    }
  }

  function renderTypeColumn(server) {
    if (!server) {
      return <TH id="type">{t('server-list-column-type')}</TH>;
    } else {
      const iconClass = getServerIconClass(server);
      return (
        <td>
          <i className={iconClass} />
          {' '}
          {t(`server-type-${server.type}`)}
        </td>
      )
    }
  }

  function renderOAuthColumn(server) {
    if (!env.isWiderThan('wide')) {
      return null;
    }
    if (!server) {
      return <TH id="oauth">{t('server-list-column-oauth')}</TH>;
    } else {
      const active = hasOAuthCredentials(server);
      return <td>{t(`server-list-oauth-${active}`)}</td>
    }
  }

  function renderAPIColumn(server) {
    if (!env.isWiderThan('wide')) {
      return null;
    }
    if (!server) {
      return <TH id="api">{t('server-list-column-api-access')}</TH>;
    } else {
      const active = hasAPICredentials(server);
      return <td>{t(`server-list-api-access-${active}`)}</td>
    }
  }

  function renderUsersColumn(server) {
    if (!env.isWiderThan('super-wide')) {
      return null;
    }
    if (!server) {
      return <TH id="users">{t('server-list-column-users')}</TH>;
    } else {
      const props = {
        users: findUsers(users, server),
        disabled: selection.shown,
        route,
        env,
      };
      return <td><UserTooltip {...props} /></td>;
    }
  }

  function renderModifiedTimeColumn(server) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!server) {
      return <TH id="mtime">{t('server-list-column-last-modified')}</TH>
    } else {
      const props = {
        time: server.mtime,
        disabled: selection.shown,
        env,
      };
      return <td><ModifiedTimeTooltip {...props} /></td>;
    }
  }
}

const filterServers = memoizeWeak(null, (servers) => {
  return servers.filter((server) => {
    return !server.deleted && !server.disabled;
  });
});

const sortServers = memoizeWeak(null, (servers, users, env, sort) => {
  const columns = sort.columns.map((column) => {
    switch (column) {
      case 'title':
        return (server) => {
          return getServerName(server, env).toLowerCase();
        };
      case 'type':
        return (server) => {
          return t(`server-type-${server.type}`);
        };
      case 'users':
        return (server) => {
          return findUsers(users, server)?.length || 0;
        };
      case 'api':
        return (server) => {
          return hasAPICredentials(server);
        };
      default:
        return column;
    }
  });
  return orderBy(servers, columns, sort.directions);
});

function hasOAuthCredentials(server) {
  const oauth = server?.settings?.oauth;
  if (oauth?.client_id && oauth?.client_secret) {
    return true;
  }
  return false;
}

function hasAPICredentials(server) {
  const api = server?.settings?.api;
  if (api?.access_token) {
    return true;
  }
  return false;
}

const findUsers = memoizeWeak(null, (users, server) => {
  return users.filter((user) => {
    return user.external.some((link) => {
      return (link.server_id === server.id);
    });
  });
});
