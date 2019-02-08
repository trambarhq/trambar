let listeners = [];

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
    let index = listeners.indexOf(callback);
    if (index !== -1) {
        listeners.splice(index, 1);
    }
}

/**
 * Close an HTTP server
 *
 * @param  {HTTPServer|null} server
 * @param  {Number} maxWait
 *
 * @return {Promise}
 */
async function close(server, maxWait) {
    if (maxWait === undefined) {
        maxWait = 1000;
    }
    if (!server) {
        return;
    }
    await new Promise((resolve, reject) => {
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
    });
}

/**
 * Start shutting down system
 */
async function initiate() {
    console.log('Shutting down...');
    await broadcast();
    process.exit(0);
}

/**
 * Call shutdown callbacks, handling scenario where shutdown functions add
 * additional handlers
 *
 * @return {Promise}
 */
async function broadcast() {
    while (listeners.length > 0) {
        let list = listeners;
        listeners = [];
        for (let callback of list) {
            try {
                await callback();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

process.on('SIGTERM', initiate);
process.on('SIGUSR2', initiate);
process.on('uncaughtException', function(err) {
    console.error(err);
});

export {
    on,
    off,
    initiate,
    close,
};
