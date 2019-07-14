import { chooseLanguageVersion } from './excel-utils.mjs';

class ExcelRow {
    constructor(sheet) {
        this.sheet = sheet;
        this.cells = [];
    }

    getChild(name) {
        const columns = this.sheet.columns;
        const chosen = chooseLanguageVersion(columns, options)
        for (let [ index, column ] of columns.entries()) {
            if (column.name === name) {
                if (chosen.indexOf(column) !== -1) {
                    return this.cells[index];
                }
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
        const columns = this.sheet.columns;
        const chosen = chooseLanguageVersion(columns, options)
        const object = {};
        for (let [ index, cell ] of this.cell) {
            const column = columns[index];
            if (chosen.indexOf(column) !== -1) {
                object[column.name] = f(cell);
            }
        }
        return object;
    }
}

export {
    ExcelRow,
};
