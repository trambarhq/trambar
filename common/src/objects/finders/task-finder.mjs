import _ from 'lodash';

const schema = 'global';
const table = 'task';
const emptyArray = [];

/**
 * Find system tasks that haven't yet ended
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Task>>}
 */
async function findActiveTask(db, startTime) {
    return db.findOne({
        schema,
        table,
        criteria: {
            etime: null,
            deleted: false,
            failed: false,
            newer_than: startTime || undefined,
            user_id: null,
        }
    });
}

async function findFailedTask(db, startTime) {
    return db.findOne({
        schema,
        table,
        criteria: {
            etime: null,
            deleted: false,
            failed: true,
            newer_than: startTime || undefined,
            user_id: null,
        }
    });
}

/**
 * Find tasks associated with a server
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Task>>}
 */
async function findServerTasks(db, server, minimum) {
    if (!server) {
        return emptyArray;
    }
    return db.find({
        schema,
        table,
        criteria: {
            options: {
                server_id: server.id,
            },
            deleted: false,
            limit: 1000,
        },
        minimum
    });
}

export {
    findActiveTask,
    findFailedTask,
    findServerTasks,
};
