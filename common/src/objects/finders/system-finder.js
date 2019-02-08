import _ from 'lodash';

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
        schema: 'global',
        table: 'system',
        criteria: {},
        prefetch: true,
    });
    return system || {};
}

export {
    findSystem,
};
