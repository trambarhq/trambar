function cardinal(num, sg, sgPartitive) {
    if (num === 1) {
        return replaceNumber(sg, num);
    } else {
        return replaceNumber(sgPartitive || sg, num);
    }
}

var numberRegExp = /\d+/;

function replaceNumber(s, n) {
    return s.replace(numberRegExp, n);
}

module.exports = {
    cardinal,
};
