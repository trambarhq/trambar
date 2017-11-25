if (process.env.PLATFORM === 'browser') {
    module.exports = require('./photo-capture-dialog-box-browser');
} else if (process.env.PLATFORM === 'mobile') {
    module.exports = require('./photo-capture-dialog-box-mobile');
}
