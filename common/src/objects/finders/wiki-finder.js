const table = 'wiki';
const emptyArray = [];

/**
 * Find a wiki by id
 *
 * @param  {Database} db
 * @param  {string} schema
 * @param  {number} id
 *
 * @return {Wiki}
 */
async function findWiki(db, schema, id) {
  return db.findOne({
    schema,
    table,
    criteria: { deleted: false, id },
    required: true
  });
}

/**
 * Find all wikis
 *
 * @param  {Database} db
 * @param  {string} schema
 *
 * @return {Wiki[]}
 */
async function findAllWikis(db, schema) {
  return db.find({
    schema,
    table,
    criteria: { deleted: false },
  });
}

/**
 * Find public wikis
 *
 * @param  {Database} db
 * @param  {string} schema
 *
 * @return {Wiki[]}
 */
async function findPublicWikis(db, schema) {
  return db.find({
    schema,
    table,
    criteria: {
      public: true,
      deleted: false,
    },
  });
}

export {
  findWiki,
  findAllWikis,
  findPublicWikis,
};
