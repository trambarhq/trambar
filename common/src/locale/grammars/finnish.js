function cardinal(num, sg, sgPartitive, omitDigitOne) {
    if (num === 1) {
        if (omitDigitOne) {
            if (sg instanceof Array) {
                return sg[0] + ' ' + sg[1];
            } else {
                return sg;
            }
        } else {
            if (sg instanceof Array) {
                return sg[0] + ' 1 ' + sg[1];
            } else {
                return '1 ' + sg;
            }
        }
    } else {
        if (sgPartitive instanceof Array) {
            return sgPartitive[0] + ' ' + num + ' ' + sgPartitive[1];
        } else {
            return num + ' ' + sgPartitive;
        }
    }
}

export {
    cardinal,
};
