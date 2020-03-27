const table = 'task';
const emptyArray = [];

/**
 * Find system tasks that haven't yet ended
 *
 * @param  {Database} db
 *
 * @return {Promise<Array<Task>>}
 */
async function findActiveTasks(db) {
  return db.find({
    schema: 'global',
    table,
    criteria: {
      etime: null,
      deleted: false,
      failed: false,
      user_id: null,
    }
  });
}

async function findFailedTasks(db) {
  return db.find({
    schema: 'global',
    table,
    criteria: {
      etime: null,
      deleted: false,
      failed: true,
      seen: false,
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
    schema: 'global',
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
  findActiveTasks,
  findFailedTasks,
  findServerTasks,
};
