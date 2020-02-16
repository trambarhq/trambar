const _ = require('lodash');
const Module = require('module');
const ChildProcess = require('child_process');
const HTTP = require('http');
const Stream = require('stream');
const CrossFetch = require('cross-fetch');
const FS = require('fs');
const Events = require('events');

async function run() {
  const { stdin, stdout, stderr, env } = process;
  try {
    // read code from stdin
    const preloaded = {}
    if (!stdin.isTTY) {
      preloaded['./index.js'] = await readStream(stdin);
    }
    overrideRequire(preloaded);

    const ssr = require('./index.js');
    const dataSourceBaseURL = env.DATA_SOURCE_BASE_URL;
    const routeBasePath = env.ROUTE_BASE_PATH;
    const routePagePath = env.ROUTE_PAGE_PATH;
    const ssrTarget = env.SSR_TARGET;
    const preferredLanguage = env.PREFERRED_LANG;

    // create a fetch() that remembers the URLs used
    const baseURLParts = new URL(dataSourceBaseURL);
    const sourceURLs = [];
    const agent = new HTTP.Agent({ keepAlive: true });
    const fetchFunc = (url, options) => {
      const urlParts = new URL(url);
      if (urlParts.origin === baseURLParts.origin) {
        // remember the URL so we can purge the page
        // when data it uses is purged
        const sourceURL = urlParts.pathname + urlParts.search;
        sourceURLs.push(sourceURL);

        // talk to Nginx without using HTTPS
        url = 'http://nginx' + sourceURL;
        options = { agent, ...options };
        options.headers = {
          ...options.headers,
          'Host': urlParts.host,
          // don't use stale data
          'Cache-Control': 'stale-while-revalidate=0',
        };
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
    const chunks = [];
    chunks.push(`200 OK\n`);
    for (let url of sourceURLs) {
      chunks.push(`x-source-url: ${url}\n`);
    }
    chunks.push('\n');
    chunks.push(html);
    await writeStream(stdout, chunks);
    process.exit(0);
  } catch (err) {
    const status = err.status || 500;
    const statusText = err.statusText || 'Internal Server Error';
    const chunks = [];
    chunks.push(`${status} ${statusText}\n`);
    chunks.push(`\n`);
    chunks.push(`${err.message}\n`);
    if (err.html) {
      await writeStream(stdout, chunks);
      process.exit(0);
    } else {
      await writeStream(stderr, chunks);
      process.exit(1);
    }
  }
}

/**
 * Override require() so that code can be read from memory
 *
 * @param  {Object} preloaded
 */
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
      if (typeof(content) != 'string') {
        content = content.toString();
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

run();
