module.exports = function(languageCode) {
    return {
        phrases: {
            'hello': 'привет',
            '$1 beers': function($1) {
                if ($1 === 1) {
                    return `1 пиво`;
                } else if ($1 === 2 || $1 === 3 || $1 === 4) {
                    return `${$1} пива`;
                } else {
                    return `${$1} пив`;
                }
            }
        }
    };
};
