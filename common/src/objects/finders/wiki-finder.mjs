const table = 'wiki';
const emptyArray = [];

/**
 * Find a wiki by id
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Number} id
 *
 * @return {Promise<Wiki>}
 */
function findWiki(db, schema, id) {
    return db.find({
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
 * @param  {String} schema
 *
 * @return {Promise<Array<Wiki>>}
 */
function findAllWikis(db, schema) {
    return db.find({
        schema,
        table,
        criteria: { deleted: false },
    });
}

export {
    findWiki,
    findAllWikis,
};
