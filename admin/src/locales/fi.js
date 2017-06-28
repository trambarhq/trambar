module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'app-title': 'Trambar - Hallintakonsoli',
    };
    var languageName = 'Suomi';
    var scriptDirection = 'ltr';
    var countries = {
        fi: 'Suomi',
        se: 'Ruotsi',
    };
    var countryCode = 'fi';
    return {
        languageName,
        scriptDirection,
        countryCode,
        countries,
        phrases,
    };
};
