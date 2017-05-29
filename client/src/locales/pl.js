module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'zakładki',
        'bottom-nav-news': 'wiadomości',
        'bottom-nav-notifications': 'notyfikacje',
        'bottom-nav-people': 'ludzie',
        'bottom-nav-settings': 'ustawienia',
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
