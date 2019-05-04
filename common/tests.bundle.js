import Promise from 'bluebird';

Promise.config({ warnings: false });

// search for js files in all /test subfolders
let requireTest = require.context('./src', true, /test\.mjs$/);
let files = requireTest.keys();
// run each of them
files.forEach((file) => {
    return requireTest(file);
});
