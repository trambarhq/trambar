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

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ` e ${lastItem}`;
    }
    return items.join(', ');
}

module.exports = {
    cardinal,
};
