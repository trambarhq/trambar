var Memoizee = require('memoizee');
var MemoizeeWeak = require('memoizee/weak');

module.exports = Memoize;

function Memoize(f, def, weak) {
    if (def === undefined) {
        def = null;
    }
    var m = (weak !== false) ? MemoizeeWeak(f) : Memoizee(f);
    return function() {
        if (arguments[0] != null) {
            return m.apply(null, arguments);
        } else {
            return def;
        }
    };
}
