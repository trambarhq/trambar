import _ from 'lodash';
import React from 'react';

// widgets
import { Tooltip } from '../widgets/tooltip.jsx';

import './spreadsheet-count-tooltip.scss';

/**
 * Tooltip showing the number of sheets in an Excel file
 */
function SpreadsheetCountTooltip(props) {
  const { route, env, spreadsheet, disabled } = props;
  if (!spreadsheet) {
    return null;
  }
  const sheets = spreadsheet.details?.sheets ?? [];
  const list = _.map(sheets, (sheet, i) => {
    const { name, flags } = sheet;
    let label = name;
    if (!_.isEmpty(flags)) {
      label += ` (${flags.join(', ')})`;
    }
    return <div className="item" key={i}>{label}</div>;
  });
  let contents = '-';
  if (list.length > 0) {
    const label = sheets.length;
    const max = 20;
    if (list.length > max) {
      list.splice(max);
      list.push(
        <div className="ellipsis" key={0}>
          <i className="fasfa-ellipsis-v" />
        </div>
      );
    }
    const tooltip = (
      <Tooltip className="spreadsheet" disabled={disabled || list.length === 0} key={1}>
        <inline>{label}</inline>
        <window>{list}</window>
      </Tooltip>
    );
    contents = tooltip;
  }
  return <span>{contents}</span>;
}

export {
  SpreadsheetCountTooltip as default,
  SpreadsheetCountTooltip,
};
