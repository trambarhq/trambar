var Promise = require('bluebird');

module.exports = {
    loadImage,
    loadVideo,
    loadAudio,
};

function loadImage(url) {
    return new Promise((resolve, reject) => {
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

function loadVideo(url) {
    return new Promise((resolve, reject) => {
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

function loadAudio(url) {
    return new Promise((resolve, reject) => {
        var audio = document.createElement('AUDIO');
        audio.src = url;
        audio.preload = true;
        audio.onloadeddata = function(evt) {
            resolve(audio);
        };
        audio.onerror = function(evt) {
            reject(new Error(`Unable to load ${url}`));
        };
    });
}

if (process.env.PLATFORM === 'cordova') {
    /**
     * Return information about a MediaFile
     *
     * @param  {MediaFile} mediaFile
     *
     * @return {Promise<MediaFileData>}
     */
    module.exports.getFormatData = function(mediaFile) {
        return new Promise((resolve, reject) => {
            mediaFile.getFormatData(resolve, reject);
        });
    };
}
