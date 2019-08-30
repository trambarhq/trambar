import _ from 'lodash';
import ChildProcess from 'child_process';
import Path from 'path';
import URL from 'url';
import Stream from 'stream';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

import * as SnapshotRetriever from './snapshot-retriever.mjs';

async function generate(schema, tag, path, baseURL, target, lang) {
    if (!tag) {
        tag = 'master';
    }
    const taskLog = TaskLog.start('page-generate', {
        project: schema,
        tag,
        path,
        lang,
    });
    try {
        const start = new Date;
        taskLog.describe(`retrieving index.js`);
        const codeBuffer = await SnapshotRetriever.retrieve(schema, tag, 'ssr', 'index.js');
        taskLog.describe(`running code in subprocess`);

        const env = {
            DATA_SOURCE_BASE_URL: baseURL,
            ROUTE_BASE_PATH: URL.parse(baseURL).pathname,
            ROUTE_PAGE_PATH: path,
            SSR_TARGET: target,
            DATABASE_SCHEMA: schema,
            GIT_TAG: tag,
            PREFERRED_LANG: lang,
        };
        const { body, headers } = await runSubprocess(codeBuffer, env, 5000);
        const html = '<!DOCTYPE html>\n' + body;
        const pageBuffer = Buffer.from(html);
        const sourceURLs = extractSourceURLs(headers);
        const end = new Date;
        taskLog.set('duration', `${end - start} ms`);
        taskLog.set('size', `${pageBuffer.length} bytes`);
        taskLog.set('sources', sourceURLs);
        await taskLog.finish();
        pageBuffer.sourceURLs = sourceURLs;
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

    if (!successful) {
        let { status, statusText, body } = parseResponse(Buffer.concat(stderrChunks));
        let message = body || statusText;
        if (child.killed) {
            message = `Script execution exceeded limit (${timeLimit} ms)`;
            status = 503;
        }
        throw new HTTPError(status, message);
    }

    return parseResponse(Buffer.concat(stdoutChunks));
}

function insertContents(html, ssr) {
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

function parseResponse(buffer) {
    const bodyIndex = buffer.indexOf('\n\n');
    let status = 500;
    let statusText = 'Internal Server Error';
    let headers = [];
    let body = '';
    if (bodyIndex !== -1) {
        headers = buffer.slice(0, bodyIndex).toString().split('\n');
        const m = /(\d+)\s(.*)/.exec(headers[0]);
        if (m) {
            status = parseInt(m[1])
            statusText = m[2];
            headers.shift();
        }
        body = buffer.slice(bodyIndex + 2).toString();
    }
    return { status, statusText, headers, body };
}

function extractSourceURLs(headers) {
    const urls = [];
    for (let header of headers) {
        const m = /^x-source-url: (.*)/i.exec(header);
        if (m) {
            urls.push(m[1]);
        }
    }
    return urls;
}

export {
    generate,
};
