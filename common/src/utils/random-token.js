function generate() {
    let arr = new Uint32Array(4)
    window.crypto.getRandomValues(arr)
    let hexes = [];
    arr.forEach((number) => {
        let text = number.toString(16);
        while (text.length < 8) {
            text = '0' + text;
        }
        hexes.push(text);
    });
    return hexes.join('');
}

export {
    generate,
};
