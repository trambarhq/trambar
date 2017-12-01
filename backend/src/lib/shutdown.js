var _ = require('lodash');
var Promise = require('bluebird');

exports.on = on;
exports.off = off;
exports.initiate = initiate;

var listeners = [];

function on(callback) {
    listeners.push(callback);
}

function off(callback) {
    _.pull(listeners, callback);
}

function initiate() {
    console.log('Shutting down...');
    Promise.each(listeners, (callback) => {
        return Promise.try(() => {
            return callback();
        }).catch((err) => {
            console.error(err);
        });
    }).then(() => {
        process.exit(0);
    });
}

process.on('SIGTERM', initiate);
process.on('SIGUSR2', initiate);
process.on('uncaughtException', function(err) {
    console.error(err);
});
