import _ from 'lodash';
import Moment from 'moment';
import React, { useRef } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as ServerSaver from 'common/objects/savers/server-saver.mjs';
import * as ServerUtils from 'common/objects/utils/server-utils.mjs';
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

import './server-list-page.scss';

async function ServerListPage(props) {
  const { database } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const servers = await ServerFinder.findAllServers(database);
  render();
  const users = await UserFinder.findActiveUsers(database);
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
      await ServerSaver.disableServers(database, removing);
      await ServerSaver.restoreServers(database, adding);
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
      const empty = _.isEmpty(servers);
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
    return _.map(sorted, renderRow);
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
      const title = ServerUtils.getDisplayName(server, env);
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
      const iconName = ServerUtils.getIcon(server);
      return (
        <td>
          <i className={`fa fa-${iconName} fa-fw`} />
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

const filterServers = memoizeWeak(null, function(servers) {
  return _.filter(servers, (server) => {
    return !server.deleted && !server.disabled;
  });
});

const sortServers = memoizeWeak(null, function(servers, users, env, sort) {
  const columns = _.map(sort.columns, (column) => {
    switch (column) {
      case 'title':
        return (server) => {
          return _.toLower(ServerUtils.getDisplayName(server, env));
        };
      case 'type':
        return (server) => {
          return t(`server-type-${server.type}`);
        };
      case 'users':
        return (server) => {
          return _.size(findUsers(users, server));
        };
      case 'api':
        return (server) => {
          return hasAPICredentials(server);
        };
      default:
        return column;
    }
  });
  return _.orderBy(servers, columns, sort.directions);
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

const findUsers = memoizeWeak(null, function(users, server) {
  return _.filter(users, (user) => {
    return _.some(user.external, (link) => {
      if (link.server_id === server.id) {
        return true;
      }
    });
  });
});

const component = Relaks.memo(ServerListPage);

export {
  component as default,
  component as ServerListPage,
};
