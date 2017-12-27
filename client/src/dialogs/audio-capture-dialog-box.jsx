if (process.env.PLATFORM === 'browser') {
    module.exports = require('./audio-capture-dialog-box-browser');
} else if (process.env.PLATFORM === 'cordova') {
    module.exports = require('./audio-capture-dialog-box-cordova');
}
