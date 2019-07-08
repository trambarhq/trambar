const table = 'role';

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

async function disableSpreadsheet(db, schema, role) {
    const [ roleAfter ] = await disableSpreadsheets(db, schema, [ role ]);
    return roleAfter;
}

async function removeSpreadsheets(db, schema, role) {
    const changes = _.map(roles, (role) => {
        return { id: role.id, deleted: true };
    });
    return saveSpreadsheets(db, schema, changes);
}

async function removeSpreadsheet(db, schema, role) {
    const [ roleAfter ] = await removeSpreadsheets(db, schema, [ role ]);
    return roleAfter;
}

async function restoreSpreadsheets(db, schema, roles) {
    const changes = _.map(roles, (role) => {
        return { id: role.id, disabled: false, deleted: false };
    });
    return saveSpreadsheets(db, schema, changes);
}

async function restoreSpreadsheet(db, schema, role) {
    const [ roleAfter ] = await restoreSpreadsheets(db, schema, [ role ]);
    return roleAfter;
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
