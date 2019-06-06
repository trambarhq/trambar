import * as RandomToken from 'common/utils/random-token.mjs';

const table = 'task';

async function createTask(db, action, user, options) {
    const task = {
        action,
        options,
        user_id: user.id,
        token: RandomToken.generate(),
    };
    return db.saveOne({ table }, task);
}

export {
    createTask,
};
