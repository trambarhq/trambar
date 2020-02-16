const Stream = require('stream');
const CrossFetch = require('cross-fetch');

async function run() {
  const { stdout, stderr, env } = process;
  const schema = env.DATABASE_SCHEMA;
  const tag = env.GIT_TAG;
  const type = env.PAGE_TYPE;
  const path = env.FILE_PATH;

  const url = `http://gitlab_adapter/internal/retrieve/${schema}/${tag}/${type}/${path}`;
  const response = await CrossFetch(url);
  const buffer = await response.buffer();
  const chunks = [
    `${response.status} ${response.statusText}\n`,
    `\n`,
    buffer
  ];

  if (response.status === 200) {
    await writeStream(stdout, chunks);
    process.exit(0);
  } else {
    await writeStream(stderr, chunks);
    process.exit(1);
  }
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
