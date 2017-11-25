if (process.env.PLATFORM === 'browser') {
    module.exports = require('./start-page-browser');
} else if (process.env.PLATFORM === 'mobile') {
    module.exports = require('./start-page-mobile');
}
