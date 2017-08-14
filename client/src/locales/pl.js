module.exports = function(languageCode) {
    return {
        'app-name': 'Trambar',

        'action-contact-by-phone': 'Skontaktuj się telefonicznie',
        'action-contact-by-email': 'Skontaktuj się przez e-mail',
        'action-contact-by-skype': 'Skontaktuj się przez Skype',
        'action-contact-by-slack': 'Skontaktuj się przez Slack',
        'action-contact-by-ichat': 'Skontaktuj się przez iChat',
        'action-view-gitlab-page': 'Wyświetl profil na Gitlabie',
        'action-view-github-page': 'Wyświetl profil na Githubie',
        'action-view-stackoverflow-page': 'Wyświetl profil na StackOverflowie',

        'audio-capture-accept': 'Przyjmij',
        'audio-capture-cancel': 'Anuluj',
        'audio-capture-pause': 'Wstrzymaj',
        'audio-capture-rerecord': 'Nagraj ponownie',
        'audio-capture-start': 'Rozpocznij',
        'audio-capture-stop': 'Zatrzymaj',

        'bookmark-$count-other-users': (count) => {
            if (singular(count)) {
                return `inna osoba`;
            } else if (plural(count)) {
                return `${count} inne osoby`;
            } else {
                return `${count} innych osób`
            }
        },
        'bookmark-$count-users': (count) => {
            if (singular(count)) {
                return `osoba`;
            } else if (plural(count)) {
                return `${count} osoby`;
            } else {
                return `${count} osób`
            }
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} poleca to`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return `${name1} i ${name2} polecają to`;
        },
        'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
            return [ `${name} i `, users, ` polecają to` ];
        },
        'bookmark-recommendations': 'Polecenia',
        'bookmark-you-bookmarked-it': 'Założyłeś zakładkę do tego',
        'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
            return `Założyłeś zakładkę do tego (i ${name} poleca go)`;
        },
        'bookmark-you-bookmarked-it-and-$users-recommends-it': (name, users, count) => {
            var verb = plural(count) ? 'polecają' : 'poleca';
            return [ `Założyłeś zakładkę do tego (i `, users, ` ${verb} it)` ];
        },

        'bottom-nav-bookmarks': 'Zakładki',
        'bottom-nav-news': 'Wiadomości',
        'bottom-nav-notifications': 'Notyfikacje',
        'bottom-nav-people': 'Ludzie',
        'bottom-nav-settings': 'Ustawienia',

        'media-close': 'Zamknij',
        'media-download-original': 'Pobierz plik oryginalny',
        'media-next': 'Następne',
        'media-previous': 'Poprzednie',

        'photo-capture-accept': 'Przyjmij',
        'photo-capture-cancel': 'Anuluj',
        'photo-capture-retake': 'Przerób',
        'photo-capture-snap': 'Zrób',

        'selection-cancel': 'Anuluj',
        'selection-ok': 'OK',

        'settings-language': 'Język',
        'settings-notification': 'Powiadomienie',
        'settings-projects': 'Projekty',
        'settings-user-profile': 'Profil użytkownika',

        'statistics-bar': 'Słupkowy',
        'statistics-line': 'Liniowy',
        'statistics-pie': 'Kołowy',

        'story-$count-user-reacted-to-story': (count) => {
            if (singular(count)) {
                return `1 osoba zareagowała na wiadomość`;
            } else if (plural(count)) {
                return `${count} osoby zareagowały na wiadomość`;
            } else {
                return `${count} osób zareagowało na wiadomość`;
            }
        },
        'story-add-coauthor': 'Dodaj współautora',
        'story-add-remove-coauthor': 'Dodaj/Usuń współautora',
        'story-audio': 'Audio',
        'story-author-$name1-and-$name2': (name1, name2) => {
            return `${name1} i ${name2}`;
        },
        'story-author-$name-and-$users': (name, users, count) => {
            return [ name, ' i ', users ];
        },
        'story-author-$count-others': (count) =>{
            if (singular(count)) {
                return `inna osoba`;
            } else if (plural(count)) {
                return `${count} inne osoby`;
            } else {
                return `${count} innych osób`;
            }
        },
        'story-cancel': 'Anuluj',
        'story-comment': 'Komentuj',
        'story-file': 'Plik',
        'story-like': 'Polub',
        'story-markdown': 'Markdown',
        'story-options': 'Opcje',
        'story-pending': 'Operacja w toku...',
        'story-photo': 'Zdjęcie',
        'story-post': 'Wysłaj',
        'story-survey': 'Ankieta',
        'story-task-list': 'Lista zadań',
        'story-video': 'Wideo',
        'story-vote-submit': 'Zatwierdź',

        'survey-item-$number': (number) => {
            return `wybór #${number}`;
        },
        'task-list-item-$number': (number) => {
            return `zadanie #${number}`;
        },

        'user-actions': 'Działanie',

        'user-statistics-legend-commit': 'Commity',
        'user-statistics-legend-story': 'Wpisy',
        'user-statistics-legend-survey': 'Ankiety',
        'user-statistics-legend-task-list': 'Listy zadań',

        'video-capture-accept': 'Przyjmij',
        'video-capture-cancel': 'Anuluj',
        'video-capture-pause': 'Wstrzymaj',
        'video-capture-retake': 'Przerób',
        'video-capture-start': 'Rozpocznij',
        'video-capture-stop': 'Zatrzymaj',
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

function feminine(name) {
    var parts = name.split(/\s+/);
    var fname = parts[0].toLocaleLowerCase();
    if (/a$/.test(fname)) {
        return !isMasculine[fname];
    } else {
        return isFeminine[fname];
    }
}

var isFeminine = {};
[
    'Abigail',
    'Beatrycze',
    'Bogudać',
    'Bogudarz',
    'Dobrowieść',
    'Dobrożyźń',
    'Miriam',
    'Noemi',
    'Przybycześć',
    'Świętożyźń',
].forEach((name) => {
    isFeminine[name.toLocaleLowerCase()] = true;
});
var isMasculine = {};
[
    'Barnaba',
    'Bodzęta',
    'Bogdała',
    'Bogwidza',
    'Bonawentura',
    'Brzezdoma',
    'Dyzma',
    'Jarema',
    'Kuba',
    'Lasota',
    'Niegodoma',
    'Niemsta',
    'Niepełka',
    'Niewsza',
    'Strachota',
    'Zawisza',
    'Żegota',
].forEach((name) => {
    isMasculine[name.toLocaleLowerCase()] = true;
});
