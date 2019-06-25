import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

import * as TemplateRetriever from './template-retriever.mjs';

async function generate(schema, commit, path) {
    const taskLog = TaskLog.start('page-generate', {
        project: schema,
    });
    try {
        taskLog.set('path', path);
        if (commit) {
            taskLog.set('commit', commit);
        }
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
