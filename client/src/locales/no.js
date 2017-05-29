module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'bokmerker',
        'bottom-nav-news': 'nyheter',
        'bottom-nav-notifications': 'varslinger',
        'bottom-nav-people': 'mennesker',
        'bottom-nav-settings': 'innstillinger',
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
