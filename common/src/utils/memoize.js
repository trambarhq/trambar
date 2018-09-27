import Memoizee from 'memoizee';
import MemoizeeWeak from 'memoizee/weak';

function memoizeWeak(defaultValue, f) {
    return memoize(defaultValue, f, true);
}

function memoizeStrong(defaultValue, f) {
    return memoize(defaultValue, f, false);
}

const emptyArray = [];
const emptyObject = {};

function memoize(defaultValue, f, weak) {
    let m = (weak) ? MemoizeeWeak(f) : Memoizee(f);
    return function() {
        let value;
        if (arguments[0] == null) {
            value = defaultValue;
        } else {
            value = m.apply(null, arguments);
            if (value === undefined) {
                value = defaultValue;
            }
        }
        if (value instanceof Array) {
            if (value.length === 0) {
                return emptyArray;
            }
        } else if (value instanceof Object && value.constructor == Object) {
            if (Object.keys(value).length === 0) {
                return emptyObject;
            }
        }
        return value;
    };
}

export {
    memoizeWeak,
    memoizeStrong,
};
