module.exports = function(languageCode) {
    return {
        'hello': 'cześć',
        '$num beers': function(num) {
            var ld = num % 10;
            if (num === 1) {
                return `1 piwo`;
            } else if ((num < 10 || (num > 20 && num < 100)) && (ld === 2 || ld === 3 || ld === 4)) {
                return `${num} piwa`;
            } else {
                return `${num} piw`;
            }
        }
    };
};
