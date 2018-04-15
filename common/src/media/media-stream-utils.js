var Promise = require('bluebird');

module.exports = {
    hasSupport,
    getAudioStream,
    getVideoStream,
    getSilentVideoStream,
    getVideoDimensions,
    getActualVideoDimensions,
    stopAllTracks,
}

/**
 * Return true if Media Stream API is available
 *
 * @return {Boolean}
 */
function hasSupport() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return true;
    }
    return false;
}

/**
 * Obtain an audio stream
 *
 * @return {Promise<MediaStream>}
 */
function getAudioStream() {
    return Promise.try(() => {
        var constraints = {
            audio: true
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    });
}

/**
 * Obtain an video stream, with audio
 *
 * @param  {Number|undefined} deviceId
 *
 * @return {Promise<MediaStream>}
 */
function getVideoStream(deviceId) {
    return Promise.try(() => {
        var constraints = {
            video: (deviceId) ? { deviceId } : true,
            audio: true
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    });
}

/**
 * Obtain an audio stream
 *
 * @param  {Number|undefined} deviceId
 *
 * @return {Promise<MediaStream>}
 */
function getSilentVideoStream(deviceId) {
    return Promise.try(() => {
        var constraints = {
            video: (deviceId) ? { deviceId } : true
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    });
}

/**
 * Return the dimension of the stream, making intelligent guess about its
 * orientation
 *
 * @param  {MediaStream} stream
 *
 * @return {Object}
 */
function getVideoDimensions(stream) {
    var videoTrack = stream.getVideoTracks()[0];
    var trackSettings = videoTrack.getSettings();
    var width = trackSettings.width;
    var height = trackSettings.height;
    if (width > height) {
        if (screen.width < screen.height) {
            // the camera is probably rotated
            width = trackSettings.height;
            height = trackSettings.width;
        }
    }
    return { width, height };
}

/**
 * Wait for video element to initialize and obtain the actual width and height
 *
 * @param  {HTMLVideoElement} node
 * @param  {Function} cb
 */
function getActualVideoDimensions(node, cb) {
    var handle = (evt) => {
        var width = node.videoWidth;
        var height = node.videoHeight;
        cb({ width, height });
        node.removeEventListener('loadedmetadata', handle);
    };
    node.addEventListener('loadedmetadata', handle);
}

/**
 * Stop all tracks of a media stream
 *
 * @param  {MediaStream} stream
 */
function stopAllTracks(stream) {
    if (!stream) {
    }
    var tracks = stream.getTracks();
    _.each(tracks, (track) => {
        track.stop();
    });
}
