let phrases = {
    'hello': 'привет',
    '$num beers': function(num) {
        if (num === 1) {
            return `1 пиво`;
        } else if (num === 2 || num === 3 || num === 4) {
            return `${num} пива`;
        } else {
            return `${num} пив`;
        }
    },
};

function returnPhrases(countryCode) {
    return phrases;
}

export {
    returnPhrases as phrases,
};
