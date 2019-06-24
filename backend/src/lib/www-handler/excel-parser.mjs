import _ from 'lodash';
import ExcelJS from 'exceljs';

async function parse(data) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    const sheets = {};
    workbook.eachSheet(function(worksheet, sheetId) {
        const sheetName = _.trim(worksheet.name);
        const { state, rowCount, columnCount } = worksheet;
        if (state === 'visible' && sheetName) {
            const { rowCount, columnCount } = worksheet;
            const fieldNames = [];
            const objects = [];
            for (let r = 1; r <= rowCount; r++) {
                const row = worksheet.getRow(r);
                const object = {};
                let empty = true;
                for (let c = 1; c <= columnCount; c++) {
                    let cell = row.getCell(c);
                    if (r === 1) {
                        const fieldName = _.trim(cell.text);
                        fieldNames.push(fieldName);
                    } else {
                        const fieldName = fieldNames[c - 1];
                        const fieldValue = extractCellValue(cell);
                        if (fieldName && fieldValue !== undefined) {
                            object[fieldName] = fieldValue;
                            empty = false;
                        }
                    }
                }
                if (!empty) {
                    objects.push(object);
                }
            }
            sheets[sheetName] = objects;
        }
    });
    return sheets;
}

function extractCellValue(cell) {
    return cell.text;
}

export {
    parse,
};
