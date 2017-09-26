var Promise = require('bluebird');
var Phantom = require('phantom');
var Moment = require('moment');

exports.createScreenshot = createScreenshot;

/**
 * Make screencap of website, returning the document title
 *
 * @param  {String} url
 * @param  {String} dstPath
 *
 * @return {Promise<String>}
 */
function createWebsiteScreenshot(url, dstPath) {
    return startPhantom().then((instance) => {
        return B(instance.createPage()).then((page) => {
            return B(page.setting('userAgent')).then((ua) => {
                // indicate in the UA string that this is a bot
                var settings = {
                    userAgent: ua + ' (compatible; trambarbot/1.0; +http://www.trambar.io/bot.html)',
                };
                return Promise.each(_.keys(settings), (key) => {
                    return page.setting(key, settings[key]);
                });
            }).then(() => {
                var width = 1024, height = 1024;
                var properties = {
                    viewportSize: { width,  height },
                    clipRect: { left: 0, top: 0, width, height },
                };
                return Promise.each(_.keys(properties), (key) => {
                    return page.property(key, properties[key]);
                })
            }).then(() => {
                return page.open(url);
            }).then(() => {
                var start = new Date;
                var last = start;
                page.on("onResourceRequested", (requestData) => {
                    // mark the time when a file request occurs
                    last = new Date;
                });
                return new Promise((resolve, reject) => {
                    var interval = setInterval(() => {
                        // we're done when there's a half a second pause in
                        // loading or after five seconds
                        var now = new Date;
                        var progress1 = (now - last) / 500;
                        var progress2 = (now - start) / 5000;
                        if (progress1 > 1 || progress2 > 1) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
            }).then(() => {
                return page.render(dstPath);
            }).then(() => {
                return page.invokeMethod('evaluate', function() {
                    return document.title;
                });
            });
        });
    });
}

var phantomPromise;

function startPhantom() {
    if (!phantomPromise) {
        phantomPromise = B(Phantom.create(['--ignore-ssl-errors=yes']));
    }
    return phantomPromise;
}

function shutdownPhantom() {
    if (phantomPromise) {
        phantomPromise.then((instance) => {
            instance.exit();
        });
        phantomPromise = null;
    }
}

/**
 * Convert promise to a Bluebird promise
 *
 * @param {Promise} promise
 */
function B(promise) {
    return Promise.resolve(promise);
}

process.on('beforeExit', () => {
    shutdownPhantom();
});
