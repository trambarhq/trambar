module.exports = function(languageCode) {
    return {
        'action-contact-by-email': 'Skontaktuj się przez e-mail',
        'action-contact-by-ichat': 'Skontaktuj się przez iChat',
        'action-contact-by-phone': 'Skontaktuj się telefonicznie',
        'action-contact-by-skype': 'Skontaktuj się przez Skype',
        'action-contact-by-slack': 'Skontaktuj się przez Slack',
        'action-contact-by-twitter': 'Skontaktuj się przez Twitter',
        'action-view-github-page': 'Wyświetl profil na Githubie',
        'action-view-gitlab-page': 'Wyświetl profil na GitLabie',
        'action-view-linkedin-page': 'Wyświetl profil na LinkedInie',
        'action-view-stackoverflow-page': 'Wyświetl profil na StackOverflowie',

        'app-name': 'Trambar',

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
        'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
            return [ `${name} i `, users, ` polecają to` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} poleca to`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return `${name1} i ${name2} polecają to`;
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

        'comment-$user-cast-a-vote': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} głosował${e}`;
        },
        'comment-$user-commented-on-issue': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} to zgłoszenie`;
        },
        'comment-$user-commented-on-merge': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} zmiany w tym scalaniu`;
        },
        'comment-$user-commented-on-merge-request': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} tę prośbę o scalanie`;
        },
        'comment-$user-commented-on-push': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} zmiany w tym wgrywaniu`;
        },
        'comment-$user-completed-a-task': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} wykonał${a} zadanie`;
        },
        'comment-$user-is-assigned-to-issue': (user) => {
            var ve = verbPastTenseEnding(user);
            var ae = (ve === 'a') ? 'a' : 'y';
            return `${user} został${ve} przydzielon${ae} do tego problemu`;
        },
        'comment-$user-is-editing': (user) => {
            return `${user} edytuje komentarz...`;
        },
        'comment-$user-is-writing': (user) => {
            return `${user} pisze komentarz...`;
        },
        'comment-$user-likes-this': (user) => {
            return `${user} lubi to`;
        },

        'list-$count-more': (count) => {
            return `${count} więcej...`;
        },

        'media-close': 'Zamknij',
        'media-download-original': 'Pobierz plik oryginalny',
        'media-next': 'Następne',
        'media-previous': 'Poprzednie',

        'membership-request-cancel': 'Anuluj',
        'membership-request-join': 'Przyłąć',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Przystąp',
        'membership-request-you-are-now-member': 'Jesteś członkiem tego projektu',
        'membership-request-you-have-requested-membership': 'Zgłosiłeś się o członkostwo w tym projekcie',

        'notification-$user-commented-on-your-merge': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} Twoje scalanie`;
        },
        'notification-$user-commented-on-your-story': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} Twój post`;
        },
        'notification-$user-commented-on-your-survey': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} Twój sondaż`;
        },
        'notification-$user-commented-on-your-task-list': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} skomentował${e} Twoją listę zadań`;
        },
        'notification-$user-completed-task': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} wykonał${e} zadanie z Twojej listy`;
        },
        'notification-$user-likes-your-push': (user) => {
            return `${user} lubi Twoje wgrywanie zmian`;
        },
        'notification-$user-likes-your-merge': (user) => {
            return `${user} lubi Twoje scalanie`;
        },
        'notification-$user-likes-your-story': (user) => {
            return `${user} lubi Twój post`;
        },
        'notification-$user-likes-your-survey': (user) => {
            return `${user} lubi Twój sondaż`;
        },
        'notification-$user-likes-your-task-list': (user) => {
            return `${user} lubi Twoja listę zadań`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            var e = verbPastTenseEnding(user);
            return `${user} odpowiedział${e} na Twoją ankietę`;
        },

        'option-add-bookmark': 'Dodaj zakładkę',
        'option-add-issue': 'Dodaj problem do issue-trackera',
        'option-bookmark-story': 'Dodaj zakładkę',
        'option-bump-post': 'Bump post',
        'option-edit-comment': 'Edytuj komentarz',
        'option-edit-post': 'Edytuj post',
        'option-hide-comment': 'Ukryj komentarz przed gośćmi',
        'option-hide-post': 'Ukryj post przed gośćmi',
        'option-remove-comment': 'Usuń komentarz',
        'option-remove-post': 'Usuń post',
        'option-send-bookmarks': 'Wyślij zakładki do innych',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} osoby` : `${count} osób`;
            return `Wyślij zakładki do ${users}`;
        },
        'option-show-media': 'Pokaź dołączone pliki medialne',
        'option-show-preview': 'Pokaź podgląd tekstu',

        'photo-capture-accept': 'Przyjmij',
        'photo-capture-cancel': 'Anuluj',
        'photo-capture-retake': 'Przerób',
        'photo-capture-snap': 'Zrób',

        'role-filter-no-roles': 'Nie ma żadnych ról',

        'search-bar-keywords': 'Słowa kluczowe',

        'selection-cancel': 'Anuluj',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',

        'settings-language': 'Język',
        'settings-notification': 'Powiadomienie',
        'settings-projects': 'Projekty',
        'settings-user-profile': 'Profil użytkownika',

        'start-projects': 'Projekty',
        'start-social-login': 'Social login',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Witamy!',

        'statistics-bar': 'Słupkowy',
        'statistics-line': 'Liniowy',
        'statistics-pie': 'Kołowy',

        'story-$count-user-reacted-to-story': (count) => {
            if (singular(count)) {
                return `1 osoba zareagowała na post`;
            } else if (plural(count)) {
                return `${count} osoby zareagowały na post`;
            } else {
                return `${count} osób zareagowało na post`;
            }
        },
        'story-add-coauthor': 'Dodaj współautora',
        'story-add-remove-coauthor': 'Dodaj/Usuń współautora',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) =>{
            if (singular(count)) {
                return `inna osoba`;
            } else if (plural(count)) {
                return `${count} inne osoby`;
            } else {
                return `${count} innych osób`;
            }
        },
        'story-author-$name-and-$users': (name, users, count) => {
            return [ name, ' i ', users ];
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return `${name1} i ${name2}`;
        },
        'story-cancel': 'Anuluj',
        'story-coauthors': 'Współautorzy',
        'story-comment': 'Komentuj',
        'story-drop-files-here': 'Przeciągnij i upuść pliki medialne tutaj',
        'story-file': 'Plik',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            var e = verbPastTenseEnding(user);
            return `Napisał${e} zgłoszenie błędu #${number}: ${title}`;
        },
        'story-issue-status-closed': 'Zamknięty',
        'story-issue-status-opened': 'Otwarty',
        'story-issue-status-reopened': 'Ponownie otwarty',
        'story-issue-current-status': 'Aktualny stan:',
        'story-like': 'Polub',
        'story-markdown': 'Markdown',
        'story-options': 'Opcje',
        'story-pending': 'Operacja w toku...',
        'story-photo': 'Zdjęcie',
        'story-post': 'Wysłaj',
        'story-push-added-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files `${count} płików`
            }
            return `${files} dodano`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines;
            if (singular(count)) {
                lines = `1 linia`;
            } else if (plural(count)) {
                lines = `${count} linie`;
            } else {
                lines `${count} liń`
            }
            return `${lines} dodano`;
        },
        'story-push-deleted-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files `${count} płików`
            }
            return `${files} usunięto`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines;
            if (singular(count)) {
                lines = `1 linia`;
            } else if (plural(count)) {
                lines = `${count} linie`;
            } else {
                lines `${count} liń`
            }
            return `${lines} usunięto`;
        },
        'story-push-modified-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files `${count} płików`
            }
            return `${files} zmodyfikowano`;
        },
        'story-push-renamed-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files `${count} płików`
            }
            return `${files} przemianowano`;
        },
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

        'telephone-dialog-close': 'Zamknij',

        'user-actions': 'Działanie',

        'user-statistics-legend-issue': 'Zgłoszenia błędu',
        'user-statistics-legend-milestone': 'Kamienia milowe',
        'user-statistics-legend-push': 'Wgrywa kodu',
        'user-statistics-legend-merge': 'Code merges',
        'user-statistics-legend-story': 'Wpisy',
        'user-statistics-legend-survey': 'Ankiety',
        'user-statistics-legend-task-list': 'Listy zadań',
        'user-statistics-legend-wiki': 'Wiki edits',

        'user-summary-more': 'Więcej...',

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

function gender(name) {
    if (name.gender) {
        return name.gender;
    }
    var parts = name.split(/\s+/);
    var fname = parts[0].toLocaleLowerCase();
    if (/a$/.test(fname)) {
        if (isMasculine[fname]) {
            return 'male';
        } else {
            return 'female';
        }
    } else {
        if (isFeminine[fname]) {
            return 'female';
        } else {
            return 'male';
        }
    }
}

// żeńskie imiona nie kończące się na a
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

// męskie imiona kończące się na a
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

function verbPastTenseEnding(name) {
    return gender(name) === 'female' ? 'a' : '';
}
