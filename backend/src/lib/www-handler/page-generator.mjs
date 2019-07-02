import ChildProcess from 'child_process';
import Path from 'path';
import URL from 'url';
import Stream from 'stream';
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
        path,
    });
    try {
        taskLog.describe(`retrieving index.js`);
        const codeBuffer = await SnapshotRetriever.retrieve(schema, tag, 'ssr', 'index.js');
        taskLog.describe(`retrieving index.html`);
        const htmlBuffer = await SnapshotRetriever.retrieve(schema, tag, 'ssr', 'index.html');
        taskLog.describe(`running code in subprocess`);
        const env = {
            RETRIEVAL_SCHEMA: schema,
            RETRIEVAL_TAG: tag,
            RETRIEVAL_TYPE: 'ssr',
            RETRIEVAL_PATH: path
        };
        const ssrBuffer = await runSubprocess(codeBuffer, env, 5000);
        const pageBuffer = insertContents(htmlBuffer, ssrBuffer);
        taskLog.set('size', pageBuffer.length);
        taskLog.set('contents', ssrBuffer.length);
        await taskLog.finish();
        return pageBuffer;
    } catch (err) {
        await taskLog.abort(err);
        throw err;
    }
}

async function runSubprocess(input, env, timeLimit) {
    // spawn Node.js child process, running as "nobody"
    const nodePath = process.argv[0];
    const folder = Path.dirname(URL.fileURLToPath(import.meta.url));
    const scriptPath = `${folder}/page-generator-subprocess.js`;
    const args = [
        scriptPath
    ];
    const options = {
        env,
        stdio: [ 'pipe', 'pipe', 'pipe' ],
        uid: 65534,
        gid: 65534,
    };
    const child = ChildProcess.spawn(nodePath, args, options);

    // impose time limit
    const timeout = setTimeout(() => {
        child.kill()
    }, timeLimit);

    // pipe code into subprocess
    const inputStream = new Stream.PassThrough();
    inputStream.end(input);
    inputStream.pipe(child.stdin);

    const stdoutChunks = [];
    const stderrChunks = [];
    const successful = await new Promise((resolve, reject) => {
        let resolved = false;

        child.on('error', (err) => {
            if (!resolved) {
                reject(err);
                resolved = true;
            }
        });

        child.on('exit', (code) => {
            if (!resolved) {
                resolve(code === 0);
                resolved = true;
            }
        });

        // save data chunks
        child.stdout.on('data', (data) => {
            stdoutChunks.push(data);
        });
        child.stderr.on('data', (data) => {
            stderrChunks.push(data);
        });
    });
    clearTimeout(timeout);

    // join the data chunks
    if (!successful) {
        let message = Buffer.concat(stderrChunks).toString() || undefined;
        let status = 500;
        if (child.killed) {
            message = `Script execution exceeded limit (${timeLimit} ms)`;
            status = 503;
        }
        throw new HTTPError(status, message);
    }

    return Buffer.concat(stdoutChunks);
}

function insertContents(htmlBuffer, ssrBuffer) {
    const html = htmlBuffer.toString();
    const ssr = ssrBuffer.toString();
    const placeholder = '<!--REACT-->';
    const placeholderIndex = html.indexOf(placeholder);
    if (placeholderIndex === -1) {
        throw new HTTPError(500, `Unable to find ${placeholder} in HTML template`);
    }
    const header = html.substr(0, placeholderIndex);
    const trailer = html.substr(placeholderIndex + placeholder.length);
    const buffer = Buffer.from(header + ssr + trailer);
    return buffer;
}

export {
    generate,
};
