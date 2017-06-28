module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrativ konsoll',
    };
    var languageName = 'Norsk';
    var scriptDirection = 'ltr';
    var countries = {
        no: 'Norge',
    };
    var countryCode = 'no';
    return {
        languageName,
        scriptDirection,
        countryCode,
        countries,
        phrases,
    };
};
