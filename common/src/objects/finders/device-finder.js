const schema = 'global';
const table = 'device';
const emptyArray = [];

/**
 * Find devices belonging to a given user
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Object>>}
 */
async function findUserDevices(db, user, minimum) {
  if (!user) {
    return emptyArray;
  }
  return db.find({
    schema,
    table,
    criteria: {
      user_id: user.id
    },
    prefetch: true,
    minimum
  });
}

export {
  findUserDevices,
};
