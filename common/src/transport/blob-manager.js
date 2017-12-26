var _ = require('lodash');
var Promise = require('bluebird');
var HttpRequest = require('transport/http-request');

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
    var localUrl = URL.createObjectURL(blob);
    var remoteUrl;
    var atime = new Date;
    list.push({ blob, localUrl, remoteUrl, atime });
    return localUrl;
}

/**
 * Find a blob by URL, either local or remote
 *
 * @param  {String} url
 *
 * @return {String|null}
 */
function find(url) {
    var entry = _.find(list, { localUrl: url });
    if (!entry) {
        entry = _.find(list, { remoteUrl: url });
    }
    if (!entry) {
        return null;
    }
    entry.atime = new Date;
    return entry.localUrl;
}

/**
 * Return the actual blob from its local URL
 *
 * @param  {String} localUrl
 *
 * @return {Blob}
 */
function get(localUrl) {
    var entry = _.find(list, { localUrl });
    if (!entry) {
        return null;
    }
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
 * Load a blob from remote location
 *
 * @param  {String} remoteUrl
 *
 * @return {Promise<String>}
 */
function fetch(remoteUrl) {
    var options = { responseType: 'blob' };
    return HttpRequest.fetch('GET', remoteUrl, null, options).then((blob) => {
        var localUrl = manage(blob);
        associate(localUrl, remoteUrl);
        return localUrl;
    });
}

/**
 * Release a blob
 *
 * @param  {String} localUrl
 */
function remove(localUrl) {
    var index = _.findIndex(list, { localUrl });
    if (index !== -1) {
        var entry = list[index];
        list.splice(index, 1);
        URL.revokeObjectURL(entry.localUrl);
    }
}
