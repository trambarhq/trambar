import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import { useRichText } from 'trambar-www';

import './excel-preview.scss';

function ExcelPreview(props) {
    const { sheet, localized, env } = props;
    const [ limit, setLimit ] = useState(1000);
    const rt = useRichText({
        devicePixelRatio: env.devicePixelRatio,
        imageWidth: 100,
        imageFilters: {
            sharpen: true
        },
        imageServer: env.address,
    });

    useEffect(() => {
        if (sheet && sheet.rows.length > limit) {
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
        let label = name;
        if (!_.isEmpty(flags)) {
            label += ` (${_.join(flags, ', ')})`;
        }
        const className = localized.includes(column) ? undefined : 'foreign';
        return (
            <th className={className} key={i}>
                {label}
            </th>
        );
    }

    function renderRow(row, i) {
        return (
            <tr key={i}>
                {_.map(row.cells, renderCell)}
            </tr>
        );
    }

    function renderCell(cell, i) {
        const className = localized.includes(cell) ? undefined : 'foreign';
        return (
            <td className={className} key={i}>
                {rt(cell)}
            </td>
        );
    }
}

export {
    ExcelPreview,
};
