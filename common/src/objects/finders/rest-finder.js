const table = 'rest';

/**
 * Find a REST source by id
 *
 * @param  {Database} db
 * @param  {string} schema
 * @param  {number} id
 *
 * @return {Rest}
 */
function findRest(db, schema, id) {
  return db.findOne({
    schema,
    table,
    criteria: { id },
    required: true
  });
}

/**
 * Find all REST sources
 *
 * @param  {Database} db
 * @param  {string} schema
 *
 * @return {Rest[]}
 */
function findAllRests(db, schema) {
  return db.find({
    schema,
    table,
    criteria: {},
  });
}

export {
  findRest,
  findAllRests,
};
