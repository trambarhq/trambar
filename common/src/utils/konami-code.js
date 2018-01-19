var _ = require('lodash');

module.exports = {
    addListener,
    removeListener,
};

var listeners = [];

function addListener(listener) {
    listeners.push(listener);
    if (listeners.length === 1) {
        window.addEventListener('keydown', handleKeydown);
    }
}

function removeListener(listener) {
    _.pull(listeners, listener);
    if (listeners.length === 0) {
        window.removeEventListener('keydown', handleKeydown);
    }
}

var correctSequence = [ 38, 38, 40, 40, 37, 39, 37, 39, 66, 65 ];
var currentSequence = [];

function handleKeydown(evt) {
    currentSequence.push(evt.keyCode);
    if (currentSequence.length > correctSequence.length) {
        currentSequence.splice(0, currentSequence.length - correctSequence.length);
    }
    if (_.isEqual(currentSequence, correctSequence)) {
        _.each(listeners, (f) => {
            f({
                type: 'cheat',
                target: module.exports,
            });
        });
    }
}
