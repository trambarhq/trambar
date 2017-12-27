var _ = require('lodash');
var Promise = require('bluebird');
var HTTPRequest = require('transport/http-request');

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
    var localURL = URL.createObjectURL(blob);
    var remoteURL;
    var atime = new Date;
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
    if (target instanceof Blob) {
        entry = _.find(list, { blob: target });
    } else {
        entry = _.find(list, { localURL: target });
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
