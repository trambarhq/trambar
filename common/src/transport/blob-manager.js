var _ = require('lodash');
var Promise = require('bluebird');
var HTTPRequest = require('transport/http-request');
var CordovaFile = (process.env.PLATFORM === 'cordova') ? require('utils/cordova-file') : null;

module.exports = {
    manage,
    find,
    get,
    associate,
    fetch,
    remove,
};

var list = [];

/**
 * Add a blob to the list and return its URL, which can be used to find the
 * blob again
 *
 * @param  {Blob} blob
 *
 * @return {String}
 */
function manage(blob) {
    var atime = new Date;
    var localURL;
    var remoteURL;
    if (process.env.PLATFORM === 'cordova') {
        if (blob instanceof CordovaFile) {
            localURL = blob.fullPath;
            list.push({ blob, localURL, remoteURL, atime });
            return localURL;
        }
    }
    localURL = URL.createObjectURL(blob);
    list.push({ blob, localURL, remoteURL, atime });
    return localURL;
}

/**
 * Find a blob by URL, either local or remote
 *
 * @param  {String} url
 *
 * @return {String|null}
 */
function find(url) {
    var entry = _.find(list, { localURL: url });
    if (!entry) {
        entry = _.find(list, { remoteURL: url });
    }
    if (!entry) {
        return null;
    }
    entry.atime = new Date;
    return entry.localURL;
}

/**
 * Return the actual blob from its local URL
 *
 * @param  {String} localURL
 *
 * @return {Blob}
 */
function get(localURL) {
    var entry = _.find(list, { localURL });
    if (!entry) {
        return null;
    }
    return entry.blob;
}

/**
 * Associate a blob, possibly referenced by its local URL, with a remote URL
 *
 * @param  {String|Blob} target
 * @param  {String} remoteURL
 *
 * @return {Boolean}
 */
function associate(target, remoteURL) {
    var entry;
    if (typeof(target) === 'string') {
        entry = _.find(list, { localURL: target });
    } else {
        entry = _.find(list, { blob: target });
    }
    if (!entry) {
        return false;
    }
    entry.remoteURL = remoteURL;
    return true;
}

/**
 * Load a blob from remote location
 *
 * @param  {String} remoteURL
 *
 * @return {Promise<String>}
 */
function fetch(remoteURL) {
    if (get(remoteURL)) {
        // we were actually given a local URL
        return Promise.resolve(remoteURL);
    }
    var localURL = find(remoteURL);
    if (localURL) {
        // we downloaded the file before
        return Promise.resolve(localURL);
    }

    var options = { responseType: 'blob' };
    return HTTPRequest.fetch('GET', remoteURL, null, options).then((blob) => {
        var localURL = manage(blob);
        associate(localURL, remoteURL);
        return localURL;
    });
}

/**
 * Release a blob
 *
 * @param  {String} localURL
 */
function remove(localURL) {
    var index = _.findIndex(list, { localURL });
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
        if (entry.remoteURL) {
            var elapsed = now - entry.atime;
            if (elapsed > 5 * 60 * 1000) {
                // after five minutes, the blob probably won't be used again
                return true;
            }
        }
    });
}

setInterval(clearBlobs, 60 * 1000);
