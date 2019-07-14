import { ExcelRichTextCell, containsRichText } from './excel-rich-text-cell.mjs';
import { ExcelPlainTextCell } from './excel-plain-text-cell.mjs';

class ExcelColumn {
    constructor(sheet, data) {
        if (typeof(data) === 'string') {
            data = {
                name: data,
                flags: [],
            }
        }
        this.sheet = sheet;
        this.name = data.name;
        this.flags = data.flags || [];
        this.cells = [];
        if (containsRichText(data)) {
            this.header = new ExcelRichTextCell(sheet, data);
        } else {
            this.header = new ExcelPlainTextCell(sheet, data.text || data.name);
        }
    }

    getChild(rowNumber) {
        return this.cells[rowNumber - 1];
    }

    getPlainText(options) {
        return this.map((cell) => cell.getPlainText(options));
    }

    getRichText(options) {
        return this.map((cell) => cell.getRichText(options));
    }

    getData(options) {
        return this.map((cell) => cell.getData(options));
    }

    map(f) {
        const objects = [];
        for (let cell of this.cells) {
            objects.push(f(cell));
        }
        return objects;
    }
}

export {
    ExcelColumn,
};
