function cardinal(num, sg, pl) {
    if (num === 1) {
        return replaceNumber(sg, num);
    } else {
        return replaceNumber(pl || sg, num);
    }
}

var numberRegExp = /\d+/;

function replaceNumber(s, n) {
    return s.replace(numberRegExp, n);
}

module.exports = {
    cardinal,
};
