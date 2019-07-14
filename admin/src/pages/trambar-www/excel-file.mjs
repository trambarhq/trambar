import { ExcelSheet } from './excel-sheet.mjs';
import { chooseLanguageVersion } from './excel-utils.mjs';

class ExcelFile {
    constructor(data) {
        this.title = data.title;
        this.type = data.type;
        this.name = data.name;
        this.sheets = [];
        for (let sheetData of data.sheets) {
            this.sheets.push(new ExcelSheet(this, sheetData));
        }
    }

    getChild(name, options) {
        const sheets = chooseLanguageVersion(this.sheets, options)
        for (let sheet of sheets) {
            if (sheet.name === name) {
                return sheet;
            }
        }
    }

    getPlainText(options) {
        return this.map((sheet) => sheet.getPlainText(options));
    }

    getRichText(options) {
        return this.map((sheet) => sheet.getRichText(options));
    }

    getData(options) {
        return this.map((sheet) => sheet.getData(options));
    }

    map(f) {
        const sheets = chooseLanguageVersion(this.sheets, options)
        const object = {};
        for (let sheet of sheets) {
            object[sheet.name] = f(sheet);
        }
        return object;
    }
}

export {
    ExcelFile,
};
