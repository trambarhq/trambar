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
 * Add a blob to the list
 *
 * @param  {Blob} blob
 */
function manage(blob) {
    var atime = new Date;
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
 * @return {String|null}
 */
function find(url) {
    var entry = _.find(list, (entry) => {
        return _.includes(entry.urls, url);
    });
    if (!entry) {
        return null;
    }
    entry.atime = new Date;
    return entry.localURL;
}

/**
 * Get the actual blob by its local URL
 *
 * @param  {String} localURL
 *
 * @return {Blob|CordovaFile|null}
 */
function get(localURL) {
    var entry = _.find(list, { localURL });
    if (!entry) {
        return null;
    }
    return entry.blob;
}

/**
 * Associate a blob with a URL
 *
 * @param  {String|Blob} target
 * @param  {String} url
 */
function associate(target, url) {
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
 * @return {Promise<String>}
 */
function fetch(remoteURL) {
    var entry = _.find(list, (entry) => {
        return _.includes(entry.urls, remoteURL);
    });
    if (entry) {
        // we downloaded the file before
        return Promise.resolve(entry.localURL);
    }
    var options = { responseType: 'blob' };
    return HTTPRequest.fetch('GET', remoteURL, null, options).then((blob) => {
        var localURL = manage(blob);
        associate(blob, remoteURL);
        return localURL;
    });
}

/**
 * Release a blob
 *
 * @param  {String} url
 */
function remove(url) {
    var index = _.findIndex(list, (entry) => {
        return _.includes(entry.urls, url);
    });
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
