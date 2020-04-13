const schema = 'global';
const table = 'picture';

/**
 * Find pictures in collection for given purpose
 *
 * @param  {Database} db
 * @param  {string} purpose
 * @param  {number|undefined} minimum
 *
 * @return {Picture[]}
 */
async function findPictures(db, purpose, minimum) {
  return db.find({
    schema,
    table,
    criteria: {
      purpose: purpose,
      deleted: false,
    },
    minimum
  });
}

export {
  findPictures,
};
