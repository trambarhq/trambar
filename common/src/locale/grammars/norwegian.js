function cardinal(num, sg, pl) {
    if (num === 1) {
        return `1 ${sg}`;
    } else {
        return `${num} ${pl}`;
    }
}

export {
    cardinal,
};
