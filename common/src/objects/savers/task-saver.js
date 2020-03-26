import { generateToken } from 'common/utils/random-token.js';

const table = 'task';

async function createTask(db, action, user, options) {
  const task = {
    action,
    options,
    user_id: user.id,
    token: generateToken(),
  };
  return db.saveOne({ table }, task);
}

async function markTasksAsSeen(db, tasks) {
  const changes = tasks.map((task) => {
    return { id: task.id, seen: true };
  });
  const tasksAfter = await db.save({ schema: 'global', table }, changes);
  return tasksAfter;
}

async function markTaskAsSeen(db, task) {
  const [ taskAfter ] = await markTasksAsSeen(db, [ task ]);
  return taskAfter;
}

export {
  createTask,
  markTaskAsSeen,
  markTasksAsSeen,
};
