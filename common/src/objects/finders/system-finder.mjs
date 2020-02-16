import _ from 'lodash';

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
  let system = await db.findOne({
    schema,
    table,
    criteria: {},
    prefetch: true,
  });
  return system || {};
}

export {
  findSystem,
};
