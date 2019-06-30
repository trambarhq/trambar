import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

import * as SnapshotRetriever from './snapshot-retriever.mjs';

async function generate(schema, tag, path) {
    if (!tag) {
        tag = 'master';
    }
    const taskLog = TaskLog.start('page-generate', {
        project: schema,
        tag,
    });
    try {
        taskLog.set('path', path);
        await taskLog.finish();
        return '';
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

export {
    generate,
};
