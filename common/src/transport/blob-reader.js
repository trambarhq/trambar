import * as BlobManager from 'transport/blob-manager';
import CordovaFile from 'transport/cordova-file';

/**
 * Load a file as Uint8Array
 *
 * @param  {Blob|CordovaFile|String} blob
 *
 * @return {Promise<Uint8Array>}
 */
async function loadUint8Array(blob) {
    let buffer = await loadArrayBuffer(blob);
    let array = new Uint8Array(buffer);
    return array;
}

/**
 * Load a file as ArrayBuffer
 *
 * @param  {Blob|CordovaFile} blob
 *
 * @return {Promise<ArrayBuffer>}
 */
async function loadArrayBuffer(blob) {
    if (blob instanceof CordovaFile) {
        return blob.getArrayBuffer();
    } else if (typeof(blob) === 'string') {
        blob = await BlobManager.fetch(blob);
    }
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
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
async function loadText(blob) {
    if (blob instanceof CordovaFile) {
        blob = await blob.getFileEntry();
    } else if (typeof(blob) === 'string') {
        blob = await BlobManager.fetch(blob);
    }
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
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
