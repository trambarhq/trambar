var _ = require('lodash');
var Promise = require('bluebird');
var HTTPRequest = require('transport/http-request');
if (process.env.PLATFORM === 'cordova') {
    var CordovaFile = require('transport/cordova-file');
}

module.exports = {
    manage,
    find,
    associate,
    fetch,
    release,
    url: manage,
};

var list = [];

/**
 * Add a blob to the list
 *
 * @param  {Blob} blob
 */
function manage(blob) {
    var atime = new Date;
    var entry = _.find(list, { blob });
    if (entry) {
        entry.atime = atime;
        return entry.localURL;
    }
    var localURL;
    if (blob instanceof Blob) {
        localURL = URL.createObjectURL(blob);
    } else {
        if (process.env.PLATFORM === 'cordova') {
            if (blob instanceof CordovaFile) {
                localURL = blob.fullPath;
            }
        }
    }
    var urls = [ localURL ];
    list.push({ blob, localURL, urls, atime });
    return localURL;
}

/**
 * Find a blob that's associated with the given URL
 *
 * @param  {String} url
 *
 * @return {Blob|CordovaFile|null}
 */
function find(url) {
    if (!url) {
        return null;
    }
    var entry = _.find(list, (entry) => {
        return _.includes(entry.urls, url);
    });
    if (!entry) {
        return null;
    }
    entry.atime = new Date;
    return entry.blob;
}

/**
 * Associate a blob with a URL
 *
 * @param  {Blob|CordovaFile} target
 * @param  {String} url
 */
function associate(target, url) {
    if (!target || !url) {
        return;
    }
    var entry = _.find(list, { blob: target });
    if (!entry) {
        manage(target);
        entry = _.find(list, { blob: target });
    }
    entry.urls.push(url);
}

/**
 * Load a blob from remote location
 *
 * @param  {String} remoteURL
 *
 * @return {Promise<Blob>}
 */
function fetch(remoteURL) {
    if (!remoteURL) {
        throw Promise.reject(new Error('Invalid argument'));
    }
    var blob = find(remoteURL);
    if (blob) {
        // we downloaded the file before (or we had uploaded it earlier)
        return Promise.resolve(blob);
    }
    var options = { responseType: 'blob' };
    return HTTPRequest.fetch('GET', remoteURL, null, options).then((blob) => {
        var localURL = manage(blob);
        associate(blob, remoteURL);
        return blob;
    });
}

/**
 * Release a blob
 *
 * @param  {Blob} blob
 */
function release(blob) {
    var index = _.findIndex(list, { blob });
    if (index !== -1) {
        var entry = list[index];
        list.splice(index, 1);
        URL.revokeObjectURL(entry.localURL);
    }
}

/**
 * Clearing blob that have not been touched for some time
 */
function clearBlobs() {
    var now = new Date;
    _.remove(list, (entry) => {
        // see if we can retrieve the file from the server if need arises
        var hasRemote = _.some(entry.urls, (url) => {
            return /https?:/.test(url);
        });
        if (hasRemote) {
            var elapsed = now - entry.atime;
            if (elapsed > 5 * 60 * 1000) {
                // after five minutes, the blob probably won't be used again
                return true;
            }
        }
    });
}

setInterval(clearBlobs, 60 * 1000);
