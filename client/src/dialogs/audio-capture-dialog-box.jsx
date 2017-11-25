if (process.env.PLATFORM === 'browser') {
    module.exports = require('./audio-capture-dialog-box-browser');
} else if (process.env.PLATFORM === 'mobile') {
    module.exports = require('./audio-capture-dialog-box-mobile');
}
