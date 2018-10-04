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

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ` ja ${lastItem}`;
    }
    return items.join(', ');
}

module.exports = {
    cardinal,
    list,
};
