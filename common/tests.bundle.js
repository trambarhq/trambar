// search for js files in all /test subfolders
var requireTest = require.context('./src', true, /\/test\/.+\.js$/);
var files = requireTest.keys();
// run each of them
files.forEach((file) => {
    return requireTest(file);
});
