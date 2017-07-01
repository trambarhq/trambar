module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'Bokmerker',
        'bottom-nav-news': 'Nyheter',
        'bottom-nav-notifications': 'Varslinger',
        'bottom-nav-people': 'Mennesker',
        'bottom-nav-settings': 'Innstillinger',
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
