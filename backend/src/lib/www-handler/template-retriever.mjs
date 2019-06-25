import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

async function retrieve(schema, commit, type, path) {
    const taskLog = TaskLog.start('template-retrieve', {
        project: schema,
        commit,
    });
    try {
        if (!commit) {
            commit = 'master';
        }
        taskLog.describe(`retrieving ${commit}:${path}`);
        const url = `http://gitlab_adapter/internal/retrieve/${schema}/${commit}/${type}/${path}`;
        const response = await CrossFetch(url);
        const buffer = await response.buffer();
        taskLog.set('path', path);
        await taskLog.finish();
        return buffer;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

export {
    retrieve,
};
