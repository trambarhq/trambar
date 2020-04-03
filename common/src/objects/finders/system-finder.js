const schema = 'global';
const table = 'system';
const emptyArray = [];

/**
 * Find system object
 *
 * @param  {Database} db
 *
 * @return {Promise<System>}
 */
async function findSystem(db) {
  return db.findOne({
    schema,
    table,
    criteria: {},
    prefetch: true,
  });
}

export {
  findSystem,
};
