import _ from 'lodash';

const emptyArray = [];

/**
 * Find system tasks that haven't yet ended
 *
 * @param  {Database} db
 * @param  {String} startTime
 * @param  {Number|undefined} minimum
 *
 * @return {Promise<Array<Task>>}
 */
async function findActiveTasks(db, startTime, minimum) {
    return db.find({
        schema: 'global',
        table: 'task',
        criteria: {
            etime: null,
            deleted: false,
            newer_than: startTime,
            limit: 10,
            user_id: null,
        },
        minimum
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
        schema: 'global',
        table: 'task',
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
    findActiveTasks,
    findServerTasks,
};
