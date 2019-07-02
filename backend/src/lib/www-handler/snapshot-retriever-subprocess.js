const Stream = require('stream');
const CrossFetch = require('cross-fetch');

async function run() {
    const schema = process.env.RETRIEVAL_SCHEMA;
    const tag = process.env.RETRIEVAL_TAG;
    const type = process.env.RETRIEVAL_TYPE;
    const path = process.env.RETRIEVAL_PATH;

    const url = `http://gitlab_adapter/internal/retrieve/${schema}/${tag}/${type}/${path}`;
    const response = await CrossFetch(url);
    if (response.status !== 200) {
        const text = await response.text();
        process.stderr.write(text);
        process.exit(response.status);
    }

    const buffer = await response.buffer();
    const stream = new Stream.PassThrough();
    stream.end(buffer);
    stream.pipe(process.stdout);
}

run();
