module.exports = {
    findPictures,
};

/**
 * Find pictures in collection for given purpose
 *
 * @param  {Database} db
 * @param  {String} purpose
 *
 * @return {Promise<Array<Picture>>}
 */
function findPictures(db, purpose) {
    return db.find({
        table: 'picture',
        criteria: {
            purpose: purpose,
            deleted: false,
        }
    });
}
