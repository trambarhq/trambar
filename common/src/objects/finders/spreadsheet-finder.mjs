const table = 'spreadsheet';

/**
 * Find a spreadsheet by id
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Spreadsheet>}
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
 * @param  {String} schema
 *
 * @return {Promise<Array<Spreadsheet>>}
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
