var _ = require('lodash');
var Promise = require('bluebird');
var Empty = require('data/empty');

module.exports = {
    findActiveTasks,
    findServerTasks,
};

/**
 * Find system tasks that haven't yet ended
 *
 * @param  {Database} db
 * @param  {String} startTime
 *
 * @return {Promise<Array<Task>>}
 */
function findActiveTasks(db, startTime) {
    return db.find({
        schema: 'global',
        table: 'task',
        criteria: {
            etime: null,
            deleted: false,
            newer_than: startTime,
            limit: 10,
            user_id: null,
        }
    });
}

/**
 * Find tasks associated with a server
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Task>>}
 */
function findServerTasks(db, server) {
    if (!server) {
        return Promise.resolve(Empty.array);
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
        prefetch: false
    });
}
