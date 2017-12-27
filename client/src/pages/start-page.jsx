if (process.env.PLATFORM === 'browser') {
    module.exports = require('./start-page-browser');
} else if (process.env.PLATFORM === 'cordova') {
    module.exports = require('./start-page-cordova');
} else {
    throw new Error('Unknown platform');
}
