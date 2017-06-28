module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'app-title': 'Trambar - Konsola administracyjna',
    };
    var languageName = 'Polski';
    var scriptDirection = 'ltr';
    var countries = {
        lt: 'Litwa',
        pl: 'Polska',
        ua: 'Ukraina',
    };
    var countryCode = 'pl';
    return {
        languageName,
        scriptDirection,
        countryCode,
        countries,
        phrases,
    };
};

function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n < 10 || (n > 20 && n < 100)) {
        var ld = n % 10;
        if (ld === 2 || ld === 3 || ld === 4) {
            return true;
        }
    }
    return false;
}
