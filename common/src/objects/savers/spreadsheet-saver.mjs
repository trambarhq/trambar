const table = 'spreadsheet';

async function saveSpreadsheets(db, schema, spreadsheets) {
    const spreadsheetsAfter = await db.save({ schema,  table }, spreadsheets);
    return spreadsheetsAfter;
}

async function saveSpreadsheet(db, schema, spreadsheet) {
    const [ spreadsheetAfter ] = await saveSpreadsheets(db, schema, [ spreadsheet ]);
    return spreadsheetAfter;
}

async function disableSpreadsheets(db, schema, spreadsheets) {
    const changes = _.map(spreadsheets, (spreadsheet) => {
        return { id: spreadsheet.id, disabled: true };
    });
    return saveSpreadsheets(db, schema, changes);
}

async function disableSpreadsheet(db, schema, spreadsheet) {
    const [ spreadsheetAfter ] = await disableSpreadsheets(db, schema, [ spreadsheet ]);
    return spreadsheetAfter;
}

async function removeSpreadsheets(db, schema, spreadsheets) {
    const changes = _.map(spreadsheets, (spreadsheet) => {
        return { id: spreadsheet.id, deleted: true };
    });
    return saveSpreadsheets(db, schema, changes);
}

async function removeSpreadsheet(db, schema, spreadsheet) {
    const [ spreadsheetAfter ] = await removeSpreadsheets(db, schema, [ spreadsheet ]);
    return spreadsheetAfter;
}

async function restoreSpreadsheets(db, schema, spreadsheets) {
    const changes = _.map(spreadsheets, (spreadsheet) => {
        return { id: spreadsheet.id, disabled: false, deleted: false };
    });
    return saveSpreadsheets(db, schema, changes);
}

async function restoreSpreadsheet(db, schema, spreadsheet) {
    const [ spreadsheetAfter ] = await restoreSpreadsheets(db, schema, [ spreadsheet ]);
    return spreadsheetAfter;
}

export {
    saveSpreadsheet,
    saveSpreadsheets,
    disableSpreadsheet,
    disableSpreadsheets,
    removeSpreadsheet,
    removeSpreadsheets,
    restoreSpreadsheet,
    restoreSpreadsheets,
};
