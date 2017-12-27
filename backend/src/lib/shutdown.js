var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    on,
    off,
    initiate,
    close,
};

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
 * Close an HTTP server
 *
 * @param  {HTTPServer|null} server
 * @param  {Number} maxWait
 *
 * @return {Promise}
 */
function close(server, maxWait) {
    if (maxWait === undefined) {
        maxWait = 1000;
    }
    return new Promise((resolve, reject) => {
        if (server) {
            var resolved = false;
            server.on('close', () => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
            server.close();
            setTimeout(() => {
                // just in case close isn't firing
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, maxWait);
        } else {
            resolve();
        }
    });
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
