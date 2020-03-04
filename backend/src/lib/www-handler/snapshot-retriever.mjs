import CrossFetch from 'cross-fetch';
import { TaskLog } from '../task-log.mjs'
import { HTTPError } from '../errors.mjs';

async function retrieve(project, tag, type, path) {
  if (!tag) {
    tag = 'master';
  }
  const taskLog = TaskLog.start('snapshot-retrieve', {
    project: project.name,
    tag,
    type,
    path
  });
  try {
    const schema = project.name;
    const start = new Date;
    taskLog.describe(`retrieving ${tag}:${path}`);
    const url = `http://gitlab_adapter/internal/retrieve/${schema}/${tag}/${type}/${path}`;
    const response = await CrossFetch(url);
    if (response.status !== 200) {
      const text = await response.text();
      throw new HTTPError(response.status, text);
    }
    const buffer = await response.buffer();
    const end = new Date;
    taskLog.set('duration', `${end - start} ms`);
    taskLog.set('size', `${buffer.length} bytes`);
    await taskLog.finish();
    return buffer;
  } catch (err) {
    if (path === 'favicon.ico') {
      await taskLog.finish();
      return null;
    }
    await taskLog.abort(err);
    throw err;
  }
}

export {
  retrieve,
};
