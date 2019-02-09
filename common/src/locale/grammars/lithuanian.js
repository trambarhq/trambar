function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n > 1 && (n % 10) !== 0) {
        return true;
    }
    return false;
}

function cardinal(num, sg, pl, plGenitive) {
    if (singular(num)) {
        return replaceNumber(sg, num);
    } else if (plural(num)) {
        return replaceNumber(pl || sg, num);
    } else {
        return replaceNumber(plGenitive || pl || sg, num);
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
        items[items.length - 1] += ` ir ${lastItem}`;
    }
    return items.join(', ');
}

module.exports = {
    singular,
    plural,
    cardinal,
    list,
};
