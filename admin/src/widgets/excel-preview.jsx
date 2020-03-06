import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import { usePlainText, useRichText } from 'trambar-www';
import { detectDirection } from 'common/utils/plain-text.js';

import './excel-preview.scss';

export function ExcelPreview(props) {
  const { sheet, env } = props;
  const [ limit, setLimit ] = useState(1000);
  const pt = usePlainText();
  const rt = useRichText({
    devicePixelRatio: env.devicePixelRatio,
    imageWidth: 100,
    imageFilters: {
      sharpen: true
    },
    imageBaseURL: env.address,
  });

  useEffect(() => {
    if (sheet?.rows?.length > limit) {
      setTimeout(() => {
        setLimit(Infinity);
      }, 50);
    }
  }, [ sheet, limit ]);

  return (
    <div className="excel-preview">
      {renderTable()}
    </div>
  );

  function renderTable() {
    let columns, rows;
    if (sheet) {
      columns = sheet.columns;
      if (sheet.rows.length > limit) {
        rows = _.slice(sheet.rows, 0, limit);
      } else {
        rows = sheet.rows;
      }
    }
    return (
      <table>
        <thead>
          <tr>
            {_.map(columns, renderHeader)}
          </tr>
        </thead>
        <tbody>
          {_.map(rows, renderRow)}
        </tbody>
      </table>
    );
  }

  function renderHeader(column, i) {
    const { name, flags } = column;
    const classNames = [];
    if (!sheet.match || !column.match) {
      classNames.push('foreign');
    }
    return (
      <th key={i} className={classNames.join(' ')}>
        {name} {renderColumnFlags(flags)}
      </th>
    );
  }

  function renderColumnFlags(flags) {
    if (!_.isEmpty(flags)) {
      return (
        <span class="flags">
          ({_.join(flags, ', ')})
        </span>
      );
    }
  }

  function renderRow(row, i) {
    return (
      <tr key={i}>
        {_.map(row.cells, renderCell)}
      </tr>
    );
  }

  function renderCell(cell, i) {
    const classNames = [];
    if (!sheet.match || !cell.match) {
      classNames.push('foreign');
    }
    const direction = detectDirection(cell.content);
    if (direction === 'rtl') {
      classNames.push('rtl');
    }
    return (
      <td key={i} className={classNames.join(' ')}>
        {rt(cell.content)}
      </td>
    );
  }
}
