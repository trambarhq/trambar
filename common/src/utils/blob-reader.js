var Promise = require('bluebird');

exports.loadUint8Array = loadUint8Array;
exports.loadArrayBuffer = loadArrayBuffer;
exports.loadImage = loadImage;
exports.loadVideo = loadVideo;
exports.loadText = loadText;

function loadUint8Array(blob) {
    return loadArrayBuffer(blob).then((buffer) => {
        return new Uint8Array(buffer);
    });
}

function loadArrayBuffer(blob) {
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

function loadImage(blob) {
    return new Promise((resolve, reject) => {
        var url = URL.createObjectURL(blob);
        var image = document.createElement('IMG');
        image.src = url;
        image.onload = function(evt) {
            resolve(image);
        };
        image.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

function loadVideo(blob) {
    return new Promise((resolve, reject) => {
        var url = URL.createObjectURL(blob);
        var video = document.createElement('VIDEO');
        video.src = url;
        video.preload = true;
        video.onloadeddata = function(evt) {
            resolve(video);
        };
        video.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

function loadText(blob) {
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onload = function(evt) {
            resolve(reader.result);
        };
        reader.onerror = function(evt) {
            reject(new Error(`Unable to load blob`));
        };
        reader.readAsText(blob);
    });
}
