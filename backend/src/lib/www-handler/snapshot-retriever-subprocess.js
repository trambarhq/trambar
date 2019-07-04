const Stream = require('stream');
const CrossFetch = require('cross-fetch');

async function run() {
    const schema = process.env.FILE_SCHEMA;
    const tag = process.env.FILE_TAG;
    const type = process.env.FILE_TYPE;
    const path = process.env.FILE_PATH;

    const url = `http://gitlab_adapter/internal/retrieve/${schema}/${tag}/${type}/${path}`;
    const response = await CrossFetch(url);
    const buffer = await response.buffer();
    const stream = new Stream.PassThrough();
    stream.write(`${response.status} ${response.statusText}\n`);
    stream.write(`\n`);
    stream.end(buffer);

    if (response.status === 200) {
        stream.pipe(process.stdout);
    } else {
        stream.pipe(process.stderr);
        stream.once('end', () => {
            process.exit(1);
        });
    }
}

run();
