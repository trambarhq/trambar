var _ = require('lodash');
var Moment = require('moment');

var now = Moment();

exports.addEventListener = addEventListener;
exports.removeEventListener = removeEventListener;
exports.today = format(now);

var listeners = [];

function addEventListener(type, f) {
    if (type === 'change' && f) {
        listeners.push(f);
    }
}

function removeEventListener(type, f) {
    if (type === 'change' && f) {
        _.pull(listeners, f);
    }
}

function format(m) {
    return m.format('YYYY-MM-DD');
}

setInterval(() => {
    var now = Moment();
    var today = format(now);
    if (today !== exports.today) {
        exports.today = today;
        var evt = {
            type: 'change',
            target: exports,
        };
        _.each(listeners, (f) => {
            f(evt);
        });
    }
}, 1000);
