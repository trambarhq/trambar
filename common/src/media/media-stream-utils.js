import Promise from 'bluebird';

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
        let constraints = {
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
        let constraints = {
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
        let constraints = {
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
    let videoTrack = stream.getVideoTracks()[0];
    let trackSettings = videoTrack.getSettings();
    let width = trackSettings.width;
    let height = trackSettings.height;
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
    let handle = (evt) => {
        let width = node.videoWidth;
        let height = node.videoHeight;
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
    let tracks = stream.getTracks();
    _.each(tracks, (track) => {
        track.stop();
    });
}

export {
    hasSupport,
    getAudioStream,
    getVideoStream,
    getSilentVideoStream,
    getVideoDimensions,
    getActualVideoDimensions,
    stopAllTracks,
    exports as default,
};
