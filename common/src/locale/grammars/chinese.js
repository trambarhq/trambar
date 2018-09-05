var chineseNumbers = [ '〇', '一', '二', '三', '四', '五', '六', '七', '八', '九' ];

function cardinalT(num, noun) {
    return cardinal(num, true);
}

function cardinalS(num, noun) {
    return cardinal(num, false);
}

function cardinal(num, noun, traditional) {
    var n;
    if (num === 2) {
        n = (traditional) ? '兩' : '两';
    } else if (num < 10) {
        n = chineseNumbers[num];
    } else {
        n = String(num);
    }
    return n + noun;
}

export {
    cardinalT,
    cardinalS,
};
