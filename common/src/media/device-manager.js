var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    getDevices,
    hasDevice,
    addEventListener,
    removeEventListener,
};

var availableDevices = [];

/**
 * Return a list of video or audio capture devices
 *
 * @param  {String} kind
 *
 * @return {Array<Object>}
 */
function getDevices(kind) {
    if (kind) {
        return _.filter(availableDevices, { kind })
    } else {
        return availableDevices;
    }
}

/**
 * Return true if a video or audio capture is available
 *
 * @param  {String}  kind
 *
 * @return {Boolean}
 */
function hasDevice(kind) {
    if (!navigator.mediaDevices) {
        // just assume a camera and microphone are avilable
        // since this should only happen on the an iPhone or a Mac
        return true;
    }
    var devices = getDevices(kind);
    return devices.length > 0;
}

var eventListeners = [];

/**
 * Add event listener
 *
 * @param {String} eventType
 * @param {Function} f
 */
function addEventListener(eventType, f) {
    if (eventType === 'change') {
        eventListeners.push(f);
    }
}

/**
 * Remove event listener
 *
 * @param {String} eventType
 * @param {Function} f
 */
function removeEventListener(eventType, f) {
    if (eventType === 'change') {
        eventListeners = _.pull(eventListeners, f);
    }
}

/**
 * Scan system for media devices then trigger change event
 */
function scan() {
    return Promise.try(() => {
        if (!navigator.mediaDevices) {
            return [];
        }
        return navigator.mediaDevices.enumerateDevices();
    }).then((devices) => {
        availableDevices = devices;
        _.each(eventListeners, (f) => {
            f.call(module, {
                type: 'change',
                target: module,
            });
        });
    }).catch((err) => {
    });
}

scan().then(() => {
    // Safari doesn't support events
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', scan);
    }
});
