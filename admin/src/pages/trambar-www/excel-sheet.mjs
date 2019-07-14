import { ExcelColumn } from './excel-column.mjs';
import { ExcelRow } from './excel-row.mjs';
import { ExcelPlainTextCell, containsPlainText } from './excel-plain-text-cell.mjs';
import { ExcelRichTextCell, containsRichText } from './excel-rich-text-cell.mjs';
import { ExcelImageCell, containsImage } from './excel-image-cell.mjs';
import { chooseLanguageVersion } from './excel-utils.mjs';

class ExcelSheet {
    constructor(file, data) {
        this.file = file;
        this.name = data.name;
        this.flags = data.flags;
        this.columns = [];
        this.rows = [];
        for (let columnData of data.columns) {
            this.columns.push(new ExcelColumn(this, columnData));
        }
        for (let rowData of data.rows) {
            const row = new ExcelRow(this);
            const cells = [];
            let columnIndex = 0;
            for (let data of rowData) {
                const column = this.columns[columnIndex++];
                let cell;
                if (containsPlainText(data)) {
                    cell = new ExcelPlainTextCell(column, data);
                } else if (containsRichText(data)) {
                    cell = new ExcelRichTextCell(column, data);
                } else if (containsImage(data)) {
                    cell = new ExcelImageCell(column, data);
                } else {
                    cell = new ExcelPlainTextCell(column, '[invalid data]');
                }
                row.cells.push(cell);
                column.cells.push(cell);
            }
            this.rows.push(row);
        }
    }

    getChild(name, options) {
        const columns = chooseLanguageVersion(this.columns, options);
        for (let column of columns) {
            if (column.name === name) {
                return column;
            }
        }
    }

    getPlainText(options) {
        return this.map(options, (cell) => cell.getPlainText(options));
    }

    getRichText(options) {
        return this.map(options, (cell) => cell.getRichText(options));
    }

    getData(options) {
        return this.map(options, (cell) => cell.getData(options));
    }

    map(options, f) {
        const columns = chooseLanguageVersion(this.columns, options);
        const objects = [];
        for (let column of columns) {
            for (let [ index, cell ] of column.cells.entries()) {
                const object = objects[index];
                if (!object) {
                    object = objects[index] = {};
                }
                object[column.name] = f(cell);
            }
        }
        return objects;
    }
}

export {
    ExcelSheet,
};
