module.exports = {
    generate,
};

function generate() {
    var arr = new Uint32Array(4)
    window.crypto.getRandomValues(arr)
    var hexes = [];
    arr.forEach((number) => {
        var text = number.toString(16);
        while (text.length < 8) {
            text = '0' + text;
        }
        hexes.push(text);
    });
    return hexes.join('');
}
