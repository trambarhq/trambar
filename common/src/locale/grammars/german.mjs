function cardinal(num, sg, pl) {
    if (num === 1) {
        return replaceNumber(sg, num);
    } else {
        return replaceNumber(pl || sg, num);
    }
}

let numberRegExp = /\d+/;

function replaceNumber(s, n) {
    return s.replace(numberRegExp, n);
}

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        let lastItem = items.pop();
        items[items.length - 1] += ` und ${lastItem}`;
    }
    return items.join(', ');
}

module.exports = {
    cardinal,
    list,
};
