module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'kirjanmerkit',
        'bottom-nav-news': 'uutiset',
        'bottom-nav-notifications': 'ilmoitukset',
        'bottom-nav-people': 'ihmiset',
        'bottom-nav-settings': 'asetukset',
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
