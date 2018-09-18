import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import HTTPRequest from 'transport/http-request';
import CordovaFile from 'transport/cordova-file';

let list = [];

/**
 * Add a blob to the list
 *
 * @param  {Blob} blob
 */
function manage(blob) {
    let atime = new Date;
    let entry = _.find(list, { blob });
    if (entry) {
        entry.atime = atime;
        return entry.localURL;
    }
    let localURL;
    if (blob instanceof Blob) {
        localURL = URL.createObjectURL(blob);
    } else {
        if (process.env.PLATFORM === 'cordova') {
            if (blob instanceof CordovaFile) {
                localURL = blob.fullPath;
            }
        }
    }
    let urls = [ localURL ];
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
    let entry = _.find(list, (entry) => {
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
    let entry = _.find(list, { blob: target });
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
    let blob = find(remoteURL);
    if (blob) {
        // we downloaded the file before (or we had uploaded it earlier)
        return Promise.resolve(blob);
    }
    let options = { responseType: 'blob' };
    return HTTPRequest.fetch('GET', remoteURL, null, options).then((blob) => {
        let localURL = manage(blob);
        associate(blob, remoteURL);
        return blob;
    });
}

/**
 * Release a blob
 *
 * @param  {Blob|CordovaFile} blob
 */
function release(blob) {
    let index = _.findIndex(list, { blob });
    if (index !== -1) {
        let entry = list[index];
        list.splice(index, 1);
        releaseEntry(entry);
    }
}

function releaseEntry(entry) {
    if (entry.blob instanceof Blob) {
        URL.revokeObjectURL(entry.localURL);
    }
    if (process.env.PLATFORM === 'cordova') {
        if (entry.blob instanceof CordovaFile) {
            entry.blob.remove();
        }
    }
};

/**
 * Clearing blob that have not been touched for some time
 */
function clearBlobs() {
    let now = new Date;
    let removed = _.remove(list, (entry) => {
        // see if we can retrieve the file from the server if need arises
        let hasRemote = _.some(entry.urls, (url) => {
            return /https?:/.test(url);
        });
        if (hasRemote) {
            let elapsed = now - entry.atime;
            if (elapsed > 3 * 60 * 1000) {
                // after five minutes, the blob probably won't be used again
                return true;
            }
        }
    });
    _.each(removed, (entry) => {
        releaseEntry(entry);
    });
}

setInterval(clearBlobs, 60 * 1000);

export {
    manage,
    manage as url,
    find,
    associate,
    fetch,
    release,
};
