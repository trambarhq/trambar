module.exports = function(languageCode) {
    return {
        'app-name': 'Trambar',

        'action-contact-by-phone': 'Skontaktuj się telefonicznie',
        'action-contact-by-email': 'Skontaktuj się przez e-mail',
        'action-contact-by-skype': 'Skontaktuj się przez Skype',
        'action-contact-by-slack': 'Skontaktuj się przez Slack',
        'action-contact-by-ichat': 'Skontaktuj się przez iChat',
        'action-view-gitlab-page': 'Wyświetl profil Gitlab',
        'action-view-github-page': 'Wyświetl profil Github',
        'action-view-stackoverflow-page': 'Wyświetl profil Stack Overflow',

        'audio-capture-accept': 'Przyjmij',
        'audio-capture-cancel': 'Anuluj',
        'audio-capture-pause': 'Wstrzymaj',
        'audio-capture-rerecord': 'Nagraj ponownie',
        'audio-capture-start': 'Rozpocznij',
        'audio-capture-stop': 'Zatrzymaj',

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
