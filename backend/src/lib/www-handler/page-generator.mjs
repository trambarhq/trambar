import _ from 'lodash';
import ChildProcess from 'child_process';
import Path from 'path';
import URL from 'url';
import Stream from 'stream';
import Events from 'events';
import * as TaskLog from '../task-log.mjs'
import HTTPError from '../common/errors/http-error.mjs';

import * as SnapshotRetriever from './snapshot-retriever.mjs';

async function generate(project, tag, path, baseURL, target, lang) {
    if (!tag) {
        tag = 'master';
    }
    const taskLog = TaskLog.start('page-generate', {
        project: project.name,
        tag,
        path,
        lang,
    });
    try {
        const start = new Date;
        taskLog.describe(`retrieving index.js`);
        const codeBuffer = await SnapshotRetriever.retrieve(project, tag, 'ssr', 'index.js');
        taskLog.describe(`running code in subprocess`);

        const env = {
            DATA_SOURCE_BASE_URL: baseURL,
            ROUTE_BASE_PATH: URL.parse(baseURL).pathname,
            ROUTE_PAGE_PATH: path,
            SSR_TARGET: target,
            DATABASE_SCHEMA: project.name,
            GIT_TAG: tag,
            PREFERRED_LANG: lang,
        };
        const { status, body, headers } = await runSubprocess(codeBuffer, env, 5000);
        const html = '<!DOCTYPE html>\n' + body;
        const pageBuffer = Buffer.from(html);
        const sourceURLs = extractSourceURLs(headers);
        const end = new Date;
        taskLog.set('duration', `${end - start} ms`);
        taskLog.set('size', `${pageBuffer.length} bytes`);
        taskLog.set('sources', sourceURLs);
        if (status !== 200) {
            taskLog.set('status', status);
        }
        await taskLog.finish();
        pageBuffer.sourceURLs = sourceURLs;
        pageBuffer.statusCode = status;
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
    await writeStream(child.stdin, [ input ]);

    try {
        const output = await readStream(child.stdout);
        clearTimeout(timeout);
        return parseResponse(output);
    } catch (err) {
        const errorOutput = await readStream(child.stderr);
        let { status, statusText, body } = parseResponse(errorOutput);
        let message = body || statusText;
        if (child.killed) {
            message = `Script execution exceeded limit (${timeLimit} ms)`;
            status = 503;
        }
        throw new HTTPError(status, message);
    }
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

/**
 * Parse a HTTP response
 *
 * @param  {Buffer} buffer
 *
 * @return {Object}
 */
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

/**
 * Read data from a stream into a buffer
 *
 * @param  {ReadableStream} stream
 *
 * @return {Promise<Buffer>}
 */
async function readStream(stream) {
    const chunks = [];
    stream.on('data', (data) => {
        chunks.push(data);
    });
    await Events.once(stream, 'end');
    return Buffer.concat(chunks);
}

/**
 * Write data into a stream
 *
 * @param  {WritableStream} stream
 * @param  {Array<String|Buffer>} chunks
 *
 * @return {Promise}
 */
async function writeStream(stream, chunks) {
    for (let chunk of chunks) {
        if (!stream.write(chunk)) {
            await Events.once(stream, 'drain');
        }
    }
    stream.end();
    await Events.once(stream, 'finish');
}

export {
    generate,
};
