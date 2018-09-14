import _ from 'lodash';
import Promise from 'bluebird';
import Empty from 'data/empty';

/**
 * Find system object
 *
 * @param  {Database} db
 *
 * @return {Promise<System>}
 */
function findSystem(db) {
    return db.findOne({
        schema: 'global',
        table: 'system',
        criteria: {},
        prefetch: true,
    }).then((system) => {
        return system || {};
    });
}

export {
    findSystem,
    exports as default,
};
