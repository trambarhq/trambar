var Promise = require('bluebird');
var CordovaFile = (process.env.PLATFORM === 'cordova') ? require('utils/cordova-file') : null;

module.exports = {
    loadUint8Array,
    loadArrayBuffer,
    loadText,
};

function loadUint8Array(blob) {
    return loadArrayBuffer(blob).then((buffer) => {
        return new Uint8Array(buffer);
    });
}

function loadArrayBuffer(blob) {
    if (process.env.PLATFORM === 'cordova') {
        if (blob instanceof CordovaFile) {
            return blob.getFileEntry((fileEntry) => {
                return loadArrayBuffer(fileEntry);
            });
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

function loadText(blob) {
    if (process.env.PLATFORM === 'cordova') {
        if (blob instanceof CordovaFile) {
            return blob.getFileEntry((fileEntry) => {
                return loadText(fileEntry);
            });
        }
    }
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function(evt) {
            resolve(reader.result);
        };
        reader.onerror = function(evt) {
            reject(new Error(`Unable to load text`));
        };
        reader.readAsText(blob);
    });
}
