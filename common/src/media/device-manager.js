var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    getDevices,
    hasDevice,
    addEventListener,
    removeEventListener,
};

var availableDevices = [];

function getDevices(kind) {
    if (kind) {
        return _.filter(availableDevices, { kind })
    } else {
        return availableDevices;
    }
}

function hasDevice(kind) {
    var devices = getDevices(kind);
    return devices.length > 0;
}

var eventListeners = [];

function addEventListener(eventType, f) {
    if (eventType === 'change') {
        eventListeners.push(f);
    }
}

function removeEventListener(eventType, f) {
    if (eventType === 'change') {
        eventListeners = _.pull(eventListeners, f);
    }
}

function scan() {
    return Promise.try(() => {
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
    if (navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', scan);
    }
});
