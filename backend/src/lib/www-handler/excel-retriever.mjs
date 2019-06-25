import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import ExcelJS from 'exceljs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs'

import Spreadsheet from '../accessors/spreadsheet.mjs';

async function retrieve(schema, name, redirection) {
    const taskLog = TaskLog.start('excel-retrieve', {
        project: schema,
    });
    try {
        const db = await Database.open();
        const criteria = { name, deleted: false };
        let spreadsheet = await Spreadsheet.findOne(db, schema, criteria, '*');
        if (!spreadsheet) {
            throw new HTTPError(404);
        }
        let changed = false;
        taskLog.describe(`retreiving ${spreadsheet.url}`);
        const buffer = await fetchSpreadsheet(spreadsheet);
        if (buffer) {
            taskLog.describe(`parsing Excel file`);
            const { etag, type } = buffer;
            const data = await parseSpreadsheet(buffer);

            // import media files
            const mediaImports = findMediaImports(data);
            const mediaCount = mediaImports.length;
            let mediaNumber = 1;
            for (let mediaImport of mediaImports) {
                taskLog.describe(`importing ${mediaImport.src}`);
                const info = await importMediaFile(mediaImport.src);
                _.assign(mediaImport, info);
                _.unset(mediaImport, 'src');
                taskLog.report(mediaNumber++, mediaCount);
            }

            const spreadsheetChanges = {
                id: spreadsheet.id,
                details: { type, data },
                etag,
            };
            spreadsheet = await Spreadsheet.updateOne(db, schema, spreadsheetChanges);
            changed = true;
        }
        taskLog.set('name', name);
        taskLog.set('changed', changed);
        await taskLog.finish();

        if (redirection) {
            // make URL shorter when we're using project-specific domain name
            trimURLs(spreadsheet.details.data);
        }
        return spreadsheet;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

async function fetchSpreadsheet(spreadsheet) {
    const { url, etag } = spreadsheet;
    const fileURL = getFileURL(url);
    const options = { timeout: 5000 };
    if (etag) {
        options.headers = {
            'If-None-Match': etag,
        };
    }
    const res = await CrossFetch(fileURL, options);
    if (res.status === 200) {
        const buffer = await res.buffer();
        buffer.type = res.headers.get('content-type');
        buffer.etag = res.headers.get('etag');
        if (!buffer.etag) {
            throw new HTTPError(400, `No e-tag: ${url}`);
        }
        return buffer;
    } else if (res.status === 304) {
        return null;
    } else {
        const error = new Error;
        try {
            let json = await res.json();
            for (let key in json.error) {
                error[key] = json.error[key];
            }
        } catch (err) {
            try {
                error.message = await res.text();
            } catch (err) {
            }
        }
        throw error;
    }
}

async function parseSpreadsheet(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const data = {};
    for (let worksheet of workbook.worksheets) {
        const sheetName = _.trim(worksheet.name);
        const { state, rowCount, columnCount } = worksheet;
        if (state === 'visible' && sheetName) {
            const { rowCount, columnCount } = worksheet;
            const fields = [];
            const objects = [];
            for (let r = 1; r <= rowCount; r++) {
                const row = worksheet.getRow(r);
                const object = {};
                let empty = true;
                for (let c = 1; c <= columnCount; c++) {
                    let cell = row.getCell(c);
                    if (r === 1) {
                        const field = extractFieldProperties(cell);
                        fields.push(field);
                    } else {
                        const field = fields[c - 1];
                        const fieldValue = extractCellValue(cell, field);
                        if (fieldValue !== undefined) {
                            object[field.name] = fieldValue;
                            empty = false;
                        }
                    }
                }
                if (!empty) {
                    objects.push(object);
                }
            }
            data[sheetName] = objects;
        }
    }
    return data;
}

function extractFieldProperties(cell) {
    const name = _.trim(cell.text);
    if (/\[import\]/i.test(name)) {
        return {
            name: name.replace(/\s*\[import\]\s*/, ''),
            import: true,
        };
    } else {
        return { name };
    }
}

function extractCellValue(cell, field) {
    if (!field || !field.name) {
        return;
    }
    if (field.import) {
        const src = _.trim(cell.text);
        return { src };
    } else {
        const style = {};
        if (cell.alignment && !_.isEqual(cell.alignment, defaultAlignment)) {
            style.alignment = cell.alignment;
        }
        if (cell.border && !_.isEqual(cell.border, defaultBorder)) {
            style.border = cell.border;
        }
        if (cell.fill && !_.isEqual(cell.fill, defaultFill)) {
            style.fill = cell.fill;
        }
        let richText = cell.value.richText;
        if (!richText) {
            if (cell.font) {
                richText = [ { font: cell.font, text: cell.text } ];
            } else if (!_.isEmpty(style)) {
                richText = [ { font: {}, text: cell.text }];
            }
        }
        if (richText) {
            return { richText, ...style };
        } else {
            return cell.text;
        }
    }
}

const defaultAlignment = { vertical: 'top', horizontal: 'left' };
const defaultFill = { type: 'pattern', pattern: 'none' };
const defaultBorder = {};

function findMediaImports(data) {
    const list = [];
    for (let [ name, objects ] of _.entries(data)) {
        for (let object of objects) {
            for (let fieldValue of _.values(object)) {
                if (/^https?:/.test(fieldValue.src)) {
                    list.push(fieldValue);
                }
            }
        }
    }
    return list;
}

function trimURLs(data) {
    for (let [ name, objects ] of _.entries(data)) {
        for (let object of objects) {
            for (let fieldValue of _.values(object)) {
                if (_.startsWith(fieldValue.url, '/srv/media')) {
                    fieldValue.url = fieldValue.url.substr(10);
                }
            }
        }
    }
}

/**
 * Ask Media Server to import a file at the specified URL
 *
 * @param  {String} url
 *
 * @return {Promise<Object>}
 */
async function importMediaFile(url) {
    const adjustedURL = getFileURL(url)
    const importURL = 'http://media_server/internal/import';
    const method = 'post';
    const headers = { 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url: adjustedURL });
    const response = await CrossFetch(importURL, { method, headers, body });
    const { status } = response;
    if (status === 200) {
        const info = await response.json();
        return info;
    } else {
        throw new HTTPError(status);
    }
}

const isOneDrive = /^https:\/\/(1drv\.ms|onedrive\.live\.com)\//;
const isDropbox = /^https:\/\/(www\.dropbox\.com)\//;

/**
 * Adjust a URL based on the cloud storage provider so that we receive the
 * actual contents
 *
 * @param  {String} url
 *
 * @return {String}
 */
function getFileURL(url) {
    if (isOneDrive.test(url)) {
        const shareURL = getOneDriveShareURL(url);
        return shareURL + '/root/content';
    } else if (isDropbox.test(url)) {
        return _.replace(url, 'www', 'dl');
    }
    return url;
}

/**
 * Encode a OneDrive shared file URL
 *
 * @param  {String} url
 *
 * @return {String}
 */
function getOneDriveShareURL(url) {
    let token = Buffer.from(url).toString('base64');
    token = _.trimEnd(token, '=');
    token = _.replace(token, /\//g, '_');
    token = _.replace(token, /\+/g, '-');
    token = 'u!' + token;
    const apiURL = 'https://api.onedrive.com/v1.0/shares/';
    return apiURL + token;
}

export {
    retrieve,
};
