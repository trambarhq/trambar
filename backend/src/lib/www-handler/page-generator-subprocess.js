const _ = require('lodash');
const Module = require('module');
const ChildProcess = require('child_process');
const HTTP = require('http');
const Stream = require('stream');
const CrossFetch = require('cross-fetch');
const FS = require('fs');

async function run() {
    try {
        // read code from stdin
        const preloaded = {}
        if (!process.stdin.isTTY) {
            preloaded['./index.js'] = FS.readFileSync(0, 'utf8')
        }
        overrideRequire(preloaded);

        const ssr = require('./index.js');
        const dataSourceBaseURL = process.env.DATA_SOURCE_BASE_URL;
        const routeBasePath = process.env.ROUTE_BASE_PATH;
        const routePagePath = process.env.ROUTE_PAGE_PATH;
        const ssrTarget = process.env.SSR_TARGET;
        const preferredLanguage = process.env.PREFERRED_LANG;

        // create a fetch() that remembers the URLs used
        const baseURLParts = new URL(dataSourceBaseURL);
        const sourceURLs = [];
        const agent = new HTTP.Agent({ keepAlive: true });
        const fetchFunc = (url, options) => {
            sourceURLs.push(url);

            const urlParts = new URL(url);
            if (urlParts.origin === baseURLParts.origin) {
                // talk to Nginx without using HTTPS
                url = 'http://nginx' + urlParts.pathname;
                if (urlParts.search) {
                    url += '?' + urlParts.search;
                }
                options = { agent, ...options };
                options.headers = { Host: urlParts.host, ...options.headers };
            }
            return CrossFetch(url, options);
        };

        const html = await ssr.render({
            dataSourceBaseURL,
            routeBasePath,
            routePagePath,
            ssrTarget,
            preferredLanguage,
            fetchFunc
        });
        const stream = new Stream.PassThrough();
        stream.write(`200 OK\n`);
        for (let url of sourceURLs) {
            stream.write(`x-source-url: ${url}\n`);
        }
        stream.write('\n');
        stream.end(html);
        stream.pipe(process.stdout);
    } catch (err) {
        const status = err.status || 500;
        const statusText = err.statusText || 'Internal Server Error';
        const stream = new Stream.PassThrough();
        stream.write(`${status} ${statusText}\n`);
        stream.write(`\n`);
        stream.write(`${err.message}\n`);
        stream.pipe(process.stderr);
        stream.once('end', () => {
            process.exit(1);
        });
    }
}

function overrideRequire(preloaded) {
    const resolveFilenameBefore = Module._resolveFilename;
    Module._resolveFilename = function(request, parent, isMain) {
        if (_.startsWith(request, './')) {
            return request;
        }
        return resolveFilenameBefore(request, parent, isMain);
    };

    const jsExtensionBefore = Module._extensions['.js'];
    Module._extensions['.js'] = function(module, filename) {
        if (_.startsWith(filename, './')) {
            let content = preloaded[filename];
            if (!content) {
                content = downloadRemote(filename);
            }
            module._compile(content, filename);
            return;
        }
        jsExtensionBefore(module, filename);
    };
}

/**
 * Spawn a child process to retrieve code synchronously from GitLab
 * @param  {String} path
 *
 * @return {String}
 */
function downloadRemote(path) {
    const gitPath = path.substr(2);
    const env = {
        DATABASE_SCHEMA: process.env.DATABASE_SCHEMA,
        GIT_TAG: process.env.GIT_TAG,
        PAGE_TYPE: process.env.PAGE_TYPE,
        FILE_PATH: gitPath,
    };
    const nodePath = process.argv[0];
    const scriptPath = `${__dirname}/snapshot-retriever-subprocess.js`;
    const args = [
        scriptPath
    ];
    const options = {
        env,
        stdio: [ 'pipe', 'pipe', 'pipe' ],
        timeout: 5000,
    };
    const result = ChildProcess.spawnSync(nodePath, args, options);
    if (result.status !== 0) {
        const { status, statusText, body } = parseResponse(result.stderr);
        const err = new Error(body);
        err.status = status;
        err.statusText = statusText;
        throw err;
    }
    const { body } = parseResponse(result.stdout);
    return body;
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

run();
