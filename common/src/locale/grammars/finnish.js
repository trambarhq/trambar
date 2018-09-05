function cardinal(num, sg, sgPartitive) {
    if (num === 1) {
        return `1 ${sg}`;
    } else {
        return `${num} ${sgPartitive}`;
    }
}

export {
    cardinal,
};
