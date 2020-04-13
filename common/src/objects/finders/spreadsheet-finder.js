const table = 'spreadsheet';

/**
 * Find a spreadsheet by id
 *
 * @param  {Database} db
 * @param  {string} schema
 * @param  {number} id
 *
 * @return {Spreadsheet}
 */
function findSpreadsheet(db, schema, id) {
  return db.findOne({
    schema,
    table,
    criteria: { id },
    required: true
  });
}

/**
 * Find all spreadsheets
 *
 * @param  {Database} db
 * @param  {string} schema
 *
 * @return {Spreadsheet[]}
 */
function findAllSpreadsheets(db, schema) {
  return db.find({
    schema,
    table,
    criteria: {},
  });
}

export {
  findSpreadsheet,
  findAllSpreadsheets,
};
