var _ = require('lodash');
var Promise = require('bluebird');

exports.on = on;
exports.off = off;
exports.initiate = initiate;

var listeners = [];

/**
 * Add shutdown listener
 *
 * @param  {Function} callback
 */
function on(callback) {
    listeners.push(callback);
}

/**
 * Remove shutdown listener
 *
 * @param  {Function} callback
 */
function off(callback) {
    _.pull(listeners, callback);
}

/**
 * Start shutting down system
 */
function initiate() {
    console.log('Shutting down...');
    broadcast().catch((err) => {
        console.error(err);
    }).finally(() => {
        process.exit(0);
    });
}

/**
 * Call shutdown callbacks, handling scenario where shutdown functions add
 * additional handlers
 *
 * @return {Promise}
 */
function broadcast() {
    var rounds = [ 1, 2 ];
    return Promise.reduce(rounds, (a, v) => {
        var list = listeners;
        listeners = [];
        return Promise.each(list, (callback) => {
            return Promise.try(() => {
                return callback();
            }).catch((err) => {
                console.error(err);
            });
        });
    }, null)
}

process.on('SIGTERM', initiate);
process.on('SIGUSR2', initiate);
process.on('uncaughtException', function(err) {
    console.error(err);
});
