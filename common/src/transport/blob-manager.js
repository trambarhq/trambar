var _ = require('lodash');
var Promise = require('bluebird');
var HttpRequest = require('transport/http-request');

module.exports = {
    manage,
    find,
    associate,
    fetch,
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
    var localUrl = URL.createObjectUrl(blob);
    var remoteUrl;
    var atime = new Date;
    list.push({ blob, localUrl, remoteUrl, atime });
    return localURL;
}

/**
 * Find a blob by URL, either local or remote
 *
 * @param  {String} url
 *
 * @return {Blob|null}
 */
function find(url) {
    var entry = _.find(list, { localUrl: url });
    if (!entry) {
        entry = _.find(list, { remoteUrl: url });
        if (!entry) {
            var entry = _.find(list, { altLocalUrl: url });
        }
    }
    if (!entry) {
        return null;
    }
    entry.atime = new Date;
    return entry.blob;
}

/**
 * Associate a blob, possibly referenced by its local URL, with a remote URL
 *
 * @param  {String|Blob} target
 * @param  {String} remoteUrl
 *
 * @return {Boolean}
 */
function associate(target, remoteUrl) {
    var entry;
    if (target instanceof Blob) {
        entry = _.find(list, { blob: target });
    } else {
        entry = _.find(list, { localUrl: target });
    }
    if (!entry) {
        return false;
    }
    entry.remoteUrl = remoteUrl;
    return true;
}

/**
 * Load a blob from remote location if local copy doesn't exist
 *
 * @param  {String} localUrl
 * @param  {String} remoteUrl
 *
 * @return {Promise<String>}
 */
function fetch(localUrl, remoteUrl) {
    if (localUrl && find(localUrl)) {
        return Promise.resolve(localUrl);
    }
    var options = { responseType: 'blob' };
    return HttpRequest.fetch('GET', remoteUrl, null, options).then((blob) => {
        var newLocalUrl = manage(blob);
        var entry = _.find(list, { blob });
        entry.altLocalUrl = localUrl;
        return newLocalUrl;
    });
}
