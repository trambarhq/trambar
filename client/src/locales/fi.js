module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'Kirjanmerkit',
        'bottom-nav-news': 'Uutiset',
        'bottom-nav-notifications': 'Ilmoitukset',
        'bottom-nav-people': 'Ihmiset',
        'bottom-nav-settings': 'Asetukset',
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
