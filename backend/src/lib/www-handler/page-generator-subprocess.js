const _ = require('lodash');
const Module = require('module');
const ChildProcess = require('child_process');
const HTTP = require('http');
const CrossFetch = require('cross-fetch');
const FS = require('fs');

const NGINX_HOST = process.env.NGINX_HOST;
const EXTERNAL_HOST = process.env.EXTERNAL_HOST;

const stdinText = FS.readFileSync(0, 'utf8');

// override module resolution
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
        let content;
        if (filename === './index.js') {
            // use text from stdin
            content = stdinText;
        } else {
            content = downloadRemote(filename);
        }
        module._compile(content, filename);
        return;
    }
    jsExtensionBefore(module, filename);
};

/**
 * Spawn a child process to retrieve code synchronously from GitLab
 * @param  {String} path
 *
 * @return {String}
 */
function downloadRemote(path) {
    const gitPath = path.substr(2);
    const env = {
        RETRIEVAL_SCHEMA: process.env.RETRIEVAL_SCHEMA,
        RETRIEVAL_TAG: process.env.RETRIEVAL_TAG,
        RETRIEVAL_TYPE: process.env.RETRIEVAL_TYPE,
        RETRIEVAL_PATH: gitPath,
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
        const status = result.status || 503;
        const message = result.stderr.toString();
        throw new HTTPError(status, message);
    }
    return result.stdout.toString();
}

function addHostHeader(options) {
    if (EXTERNAL_HOST) {
        const [ protocol, domain ] = EXTERNAL_HOST.split('://');
        const port = (protocol === 'https') ? 443 : 80;
        const host = domain + ':' + port;
        options = Object.assign({}, options);
        options.headers = Object.assign({ Host: host }, options.headers);
    }
    return options;
}

async function run() {
    try {
        const FrontEnd = require('./index.js');
        const path = process.env.RETRIEVAL_TYPE;
        const target = 'hydrate';

        // create a fetch() that remembers the URLs used
        const host = NGINX_HOST;
        const sourceURLs = [];
        const agent = new HTTP.Agent({ keepAlive: true });
        const fetch = (url, options) => {
            if (url.startsWith(host)) {
                sourceURLs.push(url.substr(host.length));
                options = addHostHeader(options);
                options.agent = agent;
            }
            return CrossFetch(url, options);
        };
        const options = { host, path, target, fetch };
        const html = await FrontEnd.render(options);
        process.stdout.write(html);
    } catch (err) {
        const status = err.status || 500;
        process.stderr.write(err.message);
        process.exit(status);
    }
}

run();
