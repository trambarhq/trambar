import Promise from 'bluebird';
import * as BlobManager from 'transport/blob-manager';
import CordovaFile from 'transport/cordova-file';

/**
 * Load a file as Uint8Array
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<Uint8Array>}
 */
function loadUint8Array(blob) {
    return loadArrayBuffer(blob).then((buffer) => {
        return new Uint8Array(buffer);
    });
}

/**
 * Load a file as ArrayBuffer
 *
 * @param  {Blob|CordovaFile} blob
 *
 * @return {Promise<ArrayBuffer>}
 */
function loadArrayBuffer(blob) {
    if (typeof(blob) === 'string') {
        var url = blob;
        return BlobManager.fetch(url).then((blob) => {
            return loadArrayBuffer(blob);
        });
    }
    if (process.env.PLATFORM === 'cordova') {
        if (blob instanceof CordovaFile) {
            return blob.getArrayBuffer();
        }
    }
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function(evt) {
            resolve(reader.result);
        };
        reader.onerror = function(evt) {
            reject(new Error(`Unable to load blob`));
        };
        reader.readAsArrayBuffer(blob);
    });
}

/**
 * Load a file as string
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<String>}
 */
function loadText(blob) {
    if (typeof(blob) === 'string') {
        var url = blob;
        return BlobManager.fetch(url).then((blob) => {
            return loadText(blob);
        });
    }
    if (process.env.PLATFORM === 'cordova') {
        if (blob instanceof CordovaFile) {
            return blob.getFileEntry((fileEntry) => {
                return loadText(fileEntry);
            });
        }
    }
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = (evt) => {
            resolve(reader.result);
        };
        reader.onerror = (evt) => {
            reject(new Error(`Unable to load text`));
        };
        reader.readAsText(blob);
    });
}

export {
    loadUint8Array,
    loadArrayBuffer,
    loadText,
};
