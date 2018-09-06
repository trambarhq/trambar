function cardinal(num, sg, pl, omitDigitOne) {
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
        if (pl instanceof Array) {
            return pl[0] + ' ' + num + ' ' + pl[1];
        } else {
            return num + ' ' + pl;
        }
    }
}

export {
    cardinal,
};
