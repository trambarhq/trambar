import _ from 'lodash';
import CrossFetch from 'cross-fetch';
import ExcelJS from 'exceljs';
import Database from '../database.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs'

import Spreadsheet from '../accessors/spreadsheet.mjs';
import * as MediaImporter from '../media-server/media-importer.mjs';

async function discover(project, search) {
    const taskLog = TaskLog.start('excel-discover', {
        project: project.name,
        search,
    });
    try {
        const schema = project.name;
        const contents = [];
        const db = await Database.open();
        const criteria = {
            deleted: false,
            disabled: false,
            hidden: false,
        };
        if (search) {
            criteria.search = search;
        }
        const spreadsheets = await Spreadsheet.find(db, schema, criteria, 'name');
        for (let spreadsheet of spreadsheets) {
            contents.push(spreadsheet.name);
        }
        const cacheControl = {};

        taskLog.set('count', contents.length);
        await taskLog.finish();
        return { contents, cacheControl };
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

async function retrieve(project, identifier) {
    const taskLog = TaskLog.start('excel-retrieve', {
        project: project.name,
        identifier
    });
    try {
        const schema = project.name;
        const db = await Database.open();
        const criteria = {
            name: identifier,
            deleted: false,
            disabled: false
        };
        let spreadsheet = await Spreadsheet.findOne(db, schema, criteria, '*');
        if (!spreadsheet) {
            throw new HTTPError(404);
        }
        try {
            let changed = false;
            taskLog.describe(`retreiving ${spreadsheet.url}`);
            const buffer = await fetchSpreadsheet(spreadsheet);
            if (buffer) {
                taskLog.describe(`parsing Excel file`);
                const { etag, type, filename } = buffer;
                const workbook = await parseSpreadsheet(buffer);

                if (_.isEmpty(workbook.sheets)) {
                    if(!/ms\-excel|spreadsheetml/.test(type)) {
                        throw new Error('Not an Excel file');
                    }
                }

                // import media files
                const mediaImports = findMediaImports(workbook.sheets);
                const mediaCount = mediaImports.length;
                let mediaNumber = 1;
                for (let mediaImport of mediaImports) {
                    const { src } = mediaImport;
                    taskLog.describe(`importing ${src}`);
                    try {
                        const url = getFileURL(src);
                        const info = await MediaImporter.importFile(url);
                        _.assign(mediaImport, info);
                        taskLog.report(mediaNumber++, mediaCount);
                    } catch (err) {
                        mediaImport.error = err.message;
                    }
                }

                const { languages, ...details } = workbook;
                const spreadsheetChanges = {
                    id: spreadsheet.id,
                    details: {
                        ...spreadsheet.details,
                        type,
                        filename,
                        error: undefined,
                        ...details
                    },
                    language_codes: languages,
                    etag,
                };
                if (!spreadsheet.name && buffer.filename) {
                    // use the filename as the spreadsheet's name
                    const name = _.kebabCase(_.replace(buffer.filename, /\.\w+$/, ''));
                    spreadsheetChanges.name = name;
                }
                spreadsheet = await Spreadsheet.saveUnique(db, schema, spreadsheetChanges);
                changed = true;
            } else {
                const { error } = spreadsheet.details;
                if (error) {
                    // clear the error
                    const spreadsheetChanges = {
                        id: spreadsheet.id,
                        details: {
                            ...spreadsheet.details,
                            error: undefined,
                        },
                    };
                    spreadsheet = await Spreadsheet.saveUnique(db, schema, spreadsheetChanges);
                }
            }
            taskLog.set('changed', changed);
            if (buffer && buffer.filename) {
                taskLog.set('filename', buffer.filename);
            }
            await taskLog.finish();
        } catch (err) {
            // save the error
            const spreadsheetChanges = {
                id: spreadsheet.id,
                details: {
                    ...spreadsheet.details,
                    error: err.message,
                }
            };
            await Spreadsheet.updateOne(db, schema, spreadsheetChanges);

            // return existing copy if it's been retrieved before
            if (spreadsheet && spreadsheet.details.sheets) {
                await taskLog.abort(err);
            } else {
                throw err;
            }
        }

        // trim resource URLs
        const mediaBaseURL = '/srv/media/';
        const mediaImports = findMediaImports(spreadsheet.details.sheets);
        _.each(mediaImports, (res) => {
            if (_.startsWith(res.url, mediaBaseURL)) {
                res.url = res.url.substr(mediaBaseURL.length);
            }
        });

        const contents = {
            identifier: spreadsheet.name,
            title: spreadsheet.details.title || '',
            description: spreadsheet.details.description || '',
            subject: spreadsheet.details.subject || '',
            keywords: spreadsheet.details.keywords || [],
            sheets: spreadsheet.details.sheets || [],
        };
        const maxAge = _.get(spreadsheet, 'settings.cache_max_age', 10);
        const cacheControl = { 's-maxage': maxAge };
        return { contents, cacheControl };
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

        // get filename
        const disposition = res.headers.get('content-disposition');
        if (disposition) {
            const m = /filename=(".+?"|\S+)/i.exec(disposition);
            if (m) {
                const filename = _.trim(m[1], ' "');
                buffer.filename = filename;
            }
        }

        return buffer;
    } else if (res.status === 304) {
        return null;
    } else {
        const args = [ res.status ];
        try {
            const json = await res.json();
            args.push(json.error);
        } catch (err) {
            try {
                const message = await res.text();
                args.push(message);
            } catch (err) {
            }
        }
        throw new HTTPError(...args);
    }
}

async function parseSpreadsheet(buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const keywords = _.filter(_.split(_.trim(workbook.keywords), /\s+/));
    const title = workbook.title;
    const description = workbook.description;
    const subject = workbook.subject;
    const sheets = [];
    const flagLists = [];
    for (let worksheet of workbook.worksheets) {
        const { state, rowCount, columnCount } = worksheet;
        const sheetNameFlags = extractNameFlags(worksheet.name);
        if (state === 'visible' && sheetNameFlags) {
            const sheet = {
                ...sheetNameFlags,
                columns: [],
                rows: [],
            };
            const using = {};
            const importing = {};
            const { rowCount, columnCount } = worksheet;
            for (let r = 1; r <= rowCount; r++) {
                const row = worksheet.getRow(r);
                if (r === 1) {
                    for (let c = 1; c <= columnCount; c++) {
                        const cell = row.getCell(c);
                        const columnNameFlags = extractNameFlags(cell.text);
                        if (columnNameFlags) {
                            const column = columnNameFlags;
                            sheet.columns.push(column);
                            using[c] = true;
                            importing[c] = (column.flags && column.flags.indexOf('import') !== -1);
                            flagLists.push(column.flags);
                        }
                    }
                } else {
                    const currentRow = [];
                    for (let c = 1; c <= columnCount; c++) {
                        if (using[c]) {
                            const cell = row.getCell(c);
                            const value = extractCellValue(cell, importing[c]);
                            currentRow.push(value);
                        }
                    }
                    sheet.rows.push(currentRow);
                }
            }
            sheets.push(sheet);
            flagLists.push(sheet.flags)
        }
    }

    const languages = [];
    for (let flags of flagLists) {
        if (flags) {
            for (let flag of flags) {
                const m = /^\s*([a-z]{2})(-[a-z]{2})?\s*$/i.exec(flag);
                if (m) {
                    const code = _.toLower(m[1]);
                    if (!_.includes(languages, code) && code !== 'zz') {
                        languages.push(code);
                    }
                }
            }
        }
    }
    return { title, subject, description, keywords, sheets, languages };
}

function extractNameFlags(text) {
    const trimmed = _.trim(text);
    if (trimmed) {
        const m = /\s*\(([^\)]+)\)$/.exec(trimmed);
        const results = {};
        if (m) {
            const name = trimmed.substr(0, trimmed.length - m[0].length);
            const flags = m[1].split(/\s*,\s*/).map(_.toLower);
            return { name, flags };
        } else {
            return { name: trimmed };
        }
    }
}

function extractCellValue(cell, importing) {
    if (importing) {
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
        let richText = (cell.value) ? cell.value.richText : null;
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

function findMediaImports(sheets) {
    const list = [];
    for (let sheet of sheets) {
        for (let row of sheet.rows) {
            for (let cell of row) {
                if (/^https?:/.test(cell.src)) {
                    list.push(cell);
                }
            }
        }
    }
    return list;
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
    discover,
    retrieve,
};
