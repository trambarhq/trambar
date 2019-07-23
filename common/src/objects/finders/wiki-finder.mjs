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

/**
 * Find public wikis
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Array<Wiki>>}
 */
function findPublicWikis(db, schema) {
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
