// search for js files in all /test subfolders
const requireTest = require.context('./src', true, /test\.js$/);
const files = requireTest.keys();
// run each of them
files.forEach((file) => {
  return requireTest(file);
});
