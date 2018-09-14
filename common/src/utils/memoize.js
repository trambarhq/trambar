import Memoizee from 'memoizee';
import MemoizeeWeak from 'memoizee/weak';

function Memoize(f, def, weak) {
    if (def === undefined) {
        def = null;
    }
    let m = (weak !== false) ? MemoizeeWeak(f) : Memoizee(f);
    return function() {
        if (arguments[0] != null) {
            return m.apply(null, arguments);
        } else {
            return def;
        }
    };
}

export {
    Memoize as default,
    Memoize,
};
