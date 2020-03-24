import React from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import { findProject } from 'common/objects/finders/project-finder.js';
import { findAllSpreadsheets } from 'common/objects/finders/spreadsheet-finder.js';
import { disableSpreadsheets, restoreSpreadsheets } from 'common/objects/savers/spreadsheet-saver.js';
import { getSpreadsheetName } from 'common/objects/utils/spreadsheet-utils.js';
import { orderBy } from 'common/utils/array-utils.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { SortableTable, TH } from '../widgets/sortable-table.jsx';
import { SpreadsheetCountTooltip } from '../tooltips/spreadsheet-count-tooltip.jsx';
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

import './spreadsheet-list-page.scss';

export default async function SpreadsheetListPage(props) {
  const { database, route, env, projectID, editing } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const project = await findProject(database, projectID);
  const schema = project.name;
  const spreadsheets = await findAllSpreadsheets(database, schema);
  render();

  function render() {
    const sprops = { schema, project, spreadsheets };
    show(<SpreadsheetListPageSync {...sprops} {...props} />);
  }
}

function SpreadsheetListPageSync(props) {
  const { schema, project, spreadsheets } = props;
  const { database, route, env, editing } = props;
  const { t, p, f } = env.locale;
  const readOnly = !editing;
  const activeSpreadsheets = filterSpreadsheets(spreadsheets);
  const selection = useSelectionBuffer({
    original: activeSpreadsheets,
    reset: readOnly,
  });
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

  const [ sort, handleSort ] = useSortHandler();
  const handleRowClick = useRowToggle(selection, spreadsheets);
  const handleEditClick = useListener((evt) => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener((evt) => {
    route.replace({ editing: undefined });
  });
  const handleAddClick = useListener((evt) => {
    route.push('spreadsheet-summary-page', {
      projectID: project.id,
      spreadsheetID: 'new'
    });
  });
  const handleSaveClick = async (evt) => {
    run(async () => {
      const removing = selection.removing();
      if (removing.length > 0) {
        await confirm(t('spreadsheet-list-confirm-disable-$count', removing.length));
      }
      const adding = selection.adding();
      if (adding.length > 0) {
        await confirm(t('spreadsheet-list-confirm-reactivate-$count', adding.length));
      }
      await disableSpreadsheets(database, schema, removing);
      await restoreSpreadsheets(database, schema, adding);
      warnDataLoss(false);
      handleCancelClick();
    });
  };

  warnDataLoss(selection.changed);

  return (
    <div className="spreadsheet-list-page">
      {renderButtons()}
      <h2>{t('spreadsheet-list-title')}</h2>
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
              {t('spreadsheet-list-add')}
            </option>
          </ComboButton>
          {' '}
          <PushButton className="emphasis" onClick={handleEditClick}>
            {t('spreadsheet-list-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = selection;
      return (
        <div key="edit" className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('spreadsheet-list-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('spreadsheet-list-save')}
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
        {renderFilenameColumn()}
        {renderURLColumn()}
        {renderSheetCountColumn()}
        {renderModifiedTimeColumn()}
      </tr>
    );
  }

  function renderRows() {
    const visible = (selection.shown) ? spreadsheets : activeSpreadsheets;
    const sorted = sortSpreadsheets(visible, env, sort);
    return sorted?.map(renderRow);
  }

  function renderRow(spreadsheet) {
    const classNames = [];
    let title, onClick;
    if (spreadsheet.deleted) {
      classNames.push('deleted');
      title = t('spreadsheet-list-status-deleted');
    } else if (spreadsheet.disabled) {
      classNames.push('disabled');
      title = t('spreadsheet-list-status-disabled');
    }
    if (selection.shown) {
      if (selection.isExisting(spreadsheet)) {
        classNames.push('fixed');
      }
      if (selection.isKeeping(spreadsheet)) {
        classNames.push('selected');
      }
      onClick = handleRowClick;
    }
    const props = {
      className: classNames.join(' '),
      'data-id': spreadsheet.id,
      onClick,
      title,
    };
    return (
      <tr key={spreadsheet.id} {...props}>
        {renderFilenameColumn(spreadsheet)}
        {renderURLColumn(spreadsheet)}
        {renderSheetCountColumn(spreadsheet)}
        {renderModifiedTimeColumn(spreadsheet)}
      </tr>
    );
  }

  function renderFilenameColumn(spreadsheet) {
    if (!spreadsheet) {
      return <TH id="filename">{t('spreadsheet-list-column-filename')}</TH>;
    } else {
      const filename = getSpreadsheetName(spreadsheet, env) || '-';
      let url, badge;
      if (selection.shown) {
        if (selection.isAdding(spreadsheet)) {
          badge = <ActionBadge type="reactivate" env={env} />;
        } else if (selection.isRemoving(spreadsheet)) {
          badge = <ActionBadge type="disable" env={env} />;
        }
      } else {
        // don't create the link when we're editing the list
        const params = { ...route.params, spreadsheetID: spreadsheet.id };
        url = route.find('spreadsheet-summary-page', params);
      }
      return <td><a href={url}>{filename}</a></td>;
    }
  }

  function renderURLColumn(spreadsheet) {
    if (!env.isWiderThan('wide')) {
      return null;
    }
    if (!spreadsheet) {
      return <TH id="url">{t('spreadsheet-list-column-url')}</TH>;
    } else {
      let url;
      if (!selection.shown) {
        url = spreadsheet.url;
      }
      return (
        <td className="no-wrap">
          <a href={url} target="_blank">{spreadsheet.url}</a>
        </td>
      );
    }
  }

  function renderSheetCountColumn(spreadsheet) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!spreadsheet) {
      return <TH id="sheets">{t('spreadsheet-list-column-sheets')}</TH>;
    } else {
      const props = {
        spreadsheet,
        disabled: selection.shown,
        route,
        env,
      };
      return <td><SpreadsheetCountTooltip {...props} /></td>;
    }
  }

  function renderModifiedTimeColumn(spreadsheet) {
    if (!env.isWiderThan('standard')) {
      return null;
    }
    if (!spreadsheet) {
      return <TH id="mtime">{t('spreadsheet-list-column-last-modified')}</TH>
    } else {
      const props = {
        time: spreadsheet.mtime,
        disabled: selection.shown,
        env,
      };
      return <td><ModifiedTimeTooltip {...props} /></td>;
    }
  }
}

const sortSpreadsheets = memoizeWeak(null, (spreadsheets, env, sort) => {
  const columns = sort.columns.map((column) => {
    switch (column) {
      case 'title':
        return s => getSpreadsheetName(s, env).toLowerCase();
      case 'sheets':
        return 'details.filename';
      case 'sheets':
        return 'details.sheets.length';
      default:
        return column;
    }
  });
  return orderBy(spreadsheets, columns, sort.directions);
});

const filterSpreadsheets = memoizeWeak(null, (spreadsheets) => {
  return spreadsheets.filter((spreadsheet) => {
    return !spreadsheet.deleted && !spreadsheet.disabled;
  });
});
