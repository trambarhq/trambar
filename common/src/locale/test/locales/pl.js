module.exports = function(languageCode) {
    return {
        phrases: {
            'hello': 'cześć',
            '$1 beers': function($1) {
                var ld = $1 % 10;
                if ($1 === 1) {
                    return `1 piwo`;
                } else if ($1 < 100 && (ld === 2 || ld === 3 || ld === 4)) {
                    return `${$1} piwa`;
                } else {
                    return `${$1} piw`;
                }
            }
        }
    };
};
