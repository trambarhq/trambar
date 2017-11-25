if (process.env.PLATFORM === 'browser') {
    module.exports = require('./video-capture-dialog-box-browser');
} else if (process.env.PLATFORM === 'mobile') {
    module.exports = require('./video-capture-dialog-box-mobile');
}
