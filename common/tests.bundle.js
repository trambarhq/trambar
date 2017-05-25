var requireTest = require.context('./src', true, /\/test\/.+\.js$/);
var files = requireTest.keys();
files.forEach((file) => {
    return requireTest(file);
});
