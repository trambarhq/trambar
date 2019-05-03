import _ from 'lodash';
import { Workbook } from 'exceljs';

async function parse(data) {
    let workbook = new Workbook();
    await workbook.xlsx.load(data);
    let sheets = {};
    workbook.eachSheet(function(worksheet, sheetId) {
        let sheetName = _.trim(worksheet.name);
        if (worksheet.state === 'show' && sheetName) {
            let { rowCount, columnCount } = worksheet;
            let fieldNames = [];
            let objects = [];
            for (let r = 1; r <= rowCount; r++) {
                let row = worksheet.getRow(r);
                let object = null;
                let empty = true;
                for (let c = 1; c <= columnCount; c++) {
                    let cell = row.getCell(c);
                    if (r === 1) {
                        let fieldName = _.trim(cell.text);
                        fieldNames.push(fieldName);
                    } else {
                        let fieldName = fieldNames[c - 1];
                        let fieldValue = extractCellValue(cell);
                        if (fieldName && fieldValue !== undefined) {
                            if (!object) {
                                object = {};
                            }
                            object[fieldName] = fieldValue;
                        }
                    }
                }
                if (object) {
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

import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);

async function run() {
    let path = __dirname + '/test.xlsx';
    let data = await FS.readFileAsync(path);
    let sheets = await parseExcelFile(data);
    console.log(sheets);
}

if (process.argv[1] === __filename) {
    run();
}
