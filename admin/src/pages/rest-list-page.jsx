import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import * as ProjectFinder from 'common/objects/finders/project-finder.js';
import * as RestFinder from 'common/objects/finders/rest-finder.js';
import * as RestSaver from 'common/objects/savers/rest-saver.js';
import * as RestUtils from 'common/objects/utils/rest-utils.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
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

import './rest-list-page.scss';

async function RestListPage(props) {
  const { database, route, env, projectID, editing } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const project = await ProjectFinder.findProject(database, projectID);
  const schema = project.name;
  const rests = await RestFinder.findAllRests(database, schema);
  render();

  function render() {
    const sprops = { schema, project, rests };
    show(<RestListPageSync {...sprops} {...props} />);
  }
}

function RestListPageSync(props) {
  const { schema, project, rests } = props;
  const { database, route, env, editing } = props;
  const { t, p, f } = env.locale;
  const readOnly = !editing;
  const activeRests = filterRests(rests);
  const selection = useSelectionBuffer({
    original: activeRests,
    reset: readOnly,
  });
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

  const [ sort, handleSort ] = useSortHandler();
  const handleRowClick = useRowToggle(selection, rests);
  const handleEditClick = useListener((evt) => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener((evt) => {
    route.replace({ editing: undefined });
  });
  const handleAddClick = useListener((evt) => {
    route.push('rest-summary-page', {
      projectID: project.id,
      restID: 'new'
    });
  });
  const handleSaveClick = async (evt) => {
    run(async () => {
      const removing = selection.removing();
      if (removing.length > 0) {
        await confirm(t('rest-list-confirm-disable-$count', removing.length));
      }
      const adding = selection.adding();
      if (adding.length > 0) {
        await confirm(t('rest-list-confirm-reactivate-$count', adding.length));
      }
      await RestSaver.disableRests(database, schema, removing);
      await RestSaver.restoreRests(database, schema, adding);
      warnDataLoss(false);
      handleCancelClick();
    });
  };

  warnDataLoss(selection.changed);

  return (
    <div className="rest-list-page">
      {renderButtons()}
      <h2>{t('rest-list-title')}</h2>
      <UnexpectedError error={error} />
      {renderTable()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      const preselected = 'add';
      return (
        <div key="view" className="buttons">
          <ComboButton preselected={preselected}>
            <option name="add" onClick={handleAddClick}>
              {t('rest-list-add')}
            </option>
          </ComboButton>
          {' '}
          <PushButton className="emphasis" onClick={handleEditClick}>
            {t('rest-list-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = selection;
      return (
        <div key="edit" className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('rest-list-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('rest-list-save')}
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
        {renderURLColumn()}
        {renderTypeColumn()}
        {renderModifiedTimeColumn()}
      </tr>
    );
  }

  function renderRows() {
    const visible = (selection.shown) ? rests : activeRests;
    const sorted = sortRests(visible, env, sort);
    return _.map(sorted, renderRow);
  }

  function renderRow(rest) {
    const classNames = [];
    let title, onClick;
    if (rest.deleted) {
      classNames.push('deleted');
      title = t('rest-list-status-deleted');
    } else if (rest.disabled) {
      classNames.push('disabled');
      title = t('rest-list-status-disabled');
    }
    if (selection.shown) {
      if (selection.isExisting(rest)) {
        classNames.push('fixed');
      }
      if (selection.isKeeping(rest)) {
        classNames.push('selected');
      }
      onClick = handleRowClick;
    }
    const props = {
      className: classNames.join(' '),
      'data-id': rest.id,
      onClick,
      title,
    };
    return (
      <tr key={rest.id} {...props}>
        {renderNameColumn(rest)}
        {renderURLColumn(rest)}
        {renderTypeColumn(rest)}
        {renderModifiedTimeColumn(rest)}
      </tr>
    );
  }

  function renderNameColumn(rest) {
    if (!rest) {
      return <TH id="filename">{t('rest-list-column-identifier')}</TH>;
    } else {
      const name = RestUtils.getDisplayName(rest, env) || '-';
      let url, badge;
      if (selection.shown) {
        if (selection.isAdding(rest)) {
          badge = <ActionBadge type="reactivate" env={env} />;
        } else if (selection.isRemoving(rest)) {
          badge = <ActionBadge type="disable" env={env} />;
        }
      } else {
        // don't create the link when we're editing the list
        const params = { ...route.params, restID: rest.id };
        url = route.find('rest-summary-page', params);
      }
      return <td><a href={url}>{name}</a></td>;
    }
  }

  function renderURLColumn(rest) {
    if (!env.isWiderThan('wide')) {
      return null;
    }
    if (!rest) {
      return <TH id="url">{t('rest-list-column-url')}</TH>;
    } else {
      let url;
      if (!selection.shown) {
        url = rest.url;
      }
      return (
        <td className="no-wrap">
          <a href={url} target="_blank">{rest.url}</a>
        </td>
      );
    }
  }

  function renderTypeColumn(rest) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!rest) {
      return <TH id="type">{t('rest-list-column-type')}</TH>;
    } else {
      const type = rest.type || 'generic';
      return <td>{t(`rest-type-${type}`)}</td>
    }
  }

  function renderModifiedTimeColumn(rest) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!rest) {
      return <TH id="mtime">{t('rest-list-column-last-modified')}</TH>
    } else {
      const props = {
        time: rest.mtime,
        disabled: selection.shown,
        env,
      };
      return <td><ModifiedTimeTooltip {...props} /></td>;
    }
  }
}

const sortRests = memoizeWeak(null, function(rests, env, sort) {
  const columns = _.map(sort.columns, (column) => {
    switch (column) {
      case 'title':
        return (rest) => {
          return _.toLower(RestUtils.getDisplayName(rest, env));
        };
      case 'sheets':
        return 'details.filename';
      case 'sheets':
        return 'details.sheets.length';
      default:
        return column;
    }
  });
  return _.orderBy(rests, columns, sort.directions);
});

const filterRests = memoizeWeak(null, function(rests) {
  return _.filter(rests, (rest) => {
    return !rest.deleted && !rest.disabled;
  });
});

const component = Relaks.memo(RestListPage);

export {
  component as default,
  component as RestListPage,
};
