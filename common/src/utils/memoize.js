var MemoizeWeak = require('memoizee/weak');

module.exports = Memoize;

function Memoize(f, def) {
    if (def === undefined) {
        def = null;
    }
    var m = MemoizeWeak(f);
    return function() {
        if (arguments[0] != null) {
            return m.apply(null, arguments);
        } else {
            return def;
        }
    };
}
