module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'zakładki',
        'bottom-nav-news': 'wiadomości',
        'bottom-nav-notifications': 'notyfikacje',
        'bottom-nav-people': 'ludzie',
        'bottom-nav-settings': 'ustawienia',

        'photo-capture-accept': 'Przyjmij',
        'photo-capture-cancel': 'Anuluj',
        'photo-capture-retake': 'Przerób',
        'photo-capture-snap': 'Zrób',

        'selection-cancel': 'Anuluj',
        'selection-ok': 'OK',

        'story-$1-user-reacted-to-story': ($1) => {
            if (singular($1)) {
                return `1 osoba zareagowała na wiadomość`;
            } else if (plural($1)) {
                return `${$1} osoby zareagowały na wiadomość`;
            } else {
                return `${$1} osób zareagowało na wiadomość`;
            }
        },
        'story-add-coauthor': 'Dodaj współautora',
        'story-add-remove-coauthor': 'Dodaj/Usuń współautora',
        'story-cancel': 'Anuluj',
        'story-comment': 'Komentuj',
        'story-like': 'Polub',
        'story-photo': 'Zdjęcie',
        'story-post': 'Wysłaj',
        'story-video': 'Wideo',
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
