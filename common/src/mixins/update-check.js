module.exports = {
    shouldComponentUpdate: function(nextProps, nextState) {
        if (!compare(nextProps, this.props)) {
            return true;
        }
        if (!compare(nextState, this.state)) {
            return true;
        }
        return false;
    },
}

function compare(prevSet, nextSet) {
    if (prevSet === nextSet) {
        return true;
    }
    if (!prevSet || !nextSet) {
        return false;
    }
    for (var key in nextSet) {
        var prev = prevSet[key];
        var next = nextSet[key];
        if (next !== prev) {
            return false;
        }
    }
    return true;
}
