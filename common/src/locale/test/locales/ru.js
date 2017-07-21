module.exports = function(languageCode) {
    return {
        'hello': 'привет',
        '$num beers': function(num) {
            if (num === 1) {
                return `1 пиво`;
            } else if (num === 2 || num === 3 || num === 4) {
                return `${num} пива`;
            } else {
                return `${num} пив`;
            }
        }
    };
};
