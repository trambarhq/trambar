exports.detectShallowChanges = function(before, after, keys) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var b = before[key];
        var a = after[key];
        if (b !== a) {
            return true;
        }
    }
    return false;
}

exports.detectArrayChanges = function(before, after, keys) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var b = before[key];
        var a = after[key];
        if (b !== a) {
            if (!b || !a) {
                return true;
            } else if (b.length !== a.length) {
                return true;
            } else {
                for (var j = 0; j < b.length; j++) {
                    if (a[j] !== b[j]) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
