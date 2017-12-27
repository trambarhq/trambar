if (process.env.PLATFORM === 'browser') {
    module.exports = require('./photo-capture-dialog-box-browser');
} else if (process.env.PLATFORM === 'cordova') {
    module.exports = require('./photo-capture-dialog-box-cordova');
}
