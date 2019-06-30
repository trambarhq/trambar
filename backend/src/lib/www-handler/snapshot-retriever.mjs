import CrossFetch from 'cross-fetch';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

async function retrieve(schema, tag, type, path) {
    if (!tag) {
        tag = 'master';
    }
    const taskLog = TaskLog.start('snapshot-retrieve', {
        project: schema,
        tag,
    });
    try {
        taskLog.describe(`retrieving ${tag}:${path}`);
        const url = `http://gitlab_adapter/internal/retrieve/${schema}/${tag}/${type}/${path}`;
        const response = await CrossFetch(url);
        if (response.status !== 200) {
            const text = await response.text();
            throw new HTTPError(response.status, text);
        }
        const buffer = await response.buffer();
        taskLog.set('path', path);
        taskLog.set('type', type);
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
