require('moment/locale/pl');

module.exports = function(localeCode) {
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

        'activation-address': 'Adres serwera',
        'activation-cancel': 'Anuluj',
        'activation-code': 'Kod aktywacyjny',
        'activation-ok': 'OK',
        'activation-schema': 'Projekt',

        'alert-$count-new-bookmarks': (count) => {
            if (singular(count)) {
                return `1 nowa zakładka`;
            } else if (plural(count)) {
                return `${count} nowe zakładki`;
            } else {
                return `${count} nowych zakładek`
            }
        },
        'alert-$count-new-notifications': (count) => {
            if (singular(count)) {
                return `1 nowe powiadomienie`;
            } else if (plural(count)) {
                return `${count} nowe powiadomienia`;
            } else {
                return `${count} nowych powiadomień`
            }
        },
        'alert-$count-new-stories': (count) => {
            if (singular(count)) {
                return `1 nowa wiadomość`;
            } else if (plural(count)) {
                return `${count} nowe wiadomości`;
            } else {
                return `${count} nowych wiadomości`
            }
        },

        'app-name': 'Trambar',

        'audio-capture-accept': 'Przyjmij',
        'audio-capture-cancel': 'Anuluj',
        'audio-capture-pause': 'Wstrzymaj',
        'audio-capture-rerecord': 'Nagraj ponownie',
        'audio-capture-resume': 'Kontynuuj',
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
        'bookmark-$name-and-$users-recommend-this': (name, users) => {
            return [ `${name} i `, users, ` polecają to` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} poleca to`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return [ name1, ' i ', name2, ' polecają to' ];
        },
        'bookmark-recommendations': 'Polecenia',
        // TODO: need to handle gender of [you]
        'bookmark-you-bookmarked-it': 'Założyłeś zakładkę do tego',
        'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
            return `Założyłeś zakładkę do tego (i ${name} poleca go)`;
        },
        // TODO: need count
        'bookmark-you-bookmarked-it-and-$users-recommends-it': (users, count) => {
            var verb = plural(count) ? 'polecają' : 'poleca';
            return [ `Założyłeś zakładkę do tego (i `, users, ` ${verb} it)` ];
        },

        'bottom-nav-bookmarks': 'Zakładki',
        'bottom-nav-news': 'Wiadomości',
        'bottom-nav-notifications': 'Powiadomienia',
        'bottom-nav-people': 'Ludzie',
        'bottom-nav-settings': 'Ustawienia',

        'confirmation-cancel': 'Anuluj',
        'confirmation-confirm': 'Potwierdź',

        'diagnostics-show': 'Pokaż diagnostykę',
        'diagnostics-show-panel': 'Wyświetl ten panel',

        'image-editor-upload-in-progress': 'Przesyłanie w toku...',

        'issue-cancel': 'Anuluj',
        'issue-clear': 'Wyczyść',
        'issue-ok': 'OK',
        'issue-repo': 'Repozytorium',
        'issue-title': 'Tytul',

        'list-$count-more': (count) => {
            return `${count} więcej...`;
        },

        'media-close': 'Zamknij',
        'media-download-original': 'Pobierz plik oryginalny',
        'media-editor-embed': 'Osadź',
        'media-editor-remove': 'Usuń',
        'media-editor-shift': 'Podnieś',
        'media-next': 'Następne',
        'media-previous': 'Poprzednie',

        'membership-request-cancel': 'Anuluj',
        'membership-request-join': 'Dołącz',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Przystąp',
        // TODO: handle gender of [you]
        'membership-request-you-are-now-member': 'Jesteś członkiem tego projektu',
        'membership-request-you-have-requested-membership': 'Zgłosiłeś się o członkostwo w tym projekcie',

        'mobile-device-revoke': 'wyłącz',
        'mobile-device-revoke-are-you-sure': 'Czy na pewno chcesz cofnąć autoryzację tego urządzenia?',

        'mobile-setup-address': 'Adres serwera',
        'mobile-setup-close': 'Zamknij',
        'mobile-setup-code': 'Kod autoryzacyjny',

        'notification-$user-added-you-as-coauthor': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} zaprosił${e} Cię do wspólnej edycji posta`;
        },
        'notification-$user-commented-on-your-$story': (user, story) => {
            var e = verbPastTenseEnding(user, 3);
            switch (story) {
                case 'push': story = 'Twoje wgrywanie zmian'; break;
                case 'merge': story = 'Twoje scalanie'; break;
                case 'branch': story = 'Twoją gałąź'; break;
                case 'survey': story = 'Twoją ankietę'; break;
                case 'task-list': story = 'Twoją listę zadań'; break;
                case 'story': story = 'Twoj post'; break;
                default: story = 'Twoją wiadomość';
            }
            return `${user} skomentował${e} ${story}`;
        },
        'notification-$user-completed-task': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} wykonał${e} zadanie z Twojej listy`;
        },
        'notification-$user-likes-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'Twoje wgrywanie zmian'; break;
                case 'merge': story = 'Twoje scalanie'; break;
                case 'branch': story = 'Twoją gałąź'; break;
                case 'survey': story = 'Twoją ankietę'; break;
                case 'task-list': story = 'Twoją listę zadań'; break;
                case 'story': story = 'Twoj post'; break;
                default: story = 'Twoją wiadomość';
            }
            return `${user} lubi ${story}`;
        },
        'notification-$user-requested-to-join': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} poprosił${e} o dołączenie do tego projektu`;
        },
        'notification-$user-sent-bookmark-to-$story': (user, story) => {
            switch (story) {
                case 'survey': story = 'ankiety'; break;
                case 'task-list': story = 'listy zadań'; break;
                case 'story': story = ' posta'; break;
                default: story = 'wiadomości';
            }
            return `${user} przysłał${e} Ci zakładkę do ${story}`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} odpowiedział${e} na Twoją ankietę`;
        },
        'notification-option-assignment': 'Po przypisaniu do zgłoszenia błędu',
        'notification-option-bookmark': 'Po otrzymaniu zakładki',
        'notification-option-coauthor': 'Po zaproszeniu do wspólnej edycji posta',
        'notification-option-comment': 'Po komentowaniu Twojego wiadomości',
        'notification-option-issue': 'Po zgłoszeniu błędu',
        'notification-option-join-request': 'Po prośbie o dołączenie do projektu',
        'notification-option-like': 'Po upodobaniu Twojej wiadomości',
        'notification-option-merge': 'Po scalaniu kodu w gałąź master',
        'notification-option-note': 'Po komentowaniu zmian kodu ablo złoszenia błedu',
        'notification-option-push': 'Po wgrywaniu zmian do repozytorium Gita',
        'notification-option-survey': 'Po opublikowaniu ankiety',
        'notification-option-task-completion': 'Po wykonaniu zadania na Twojej liście przez innego',
        'notification-option-vote': 'Po odpowiadaniu Twojej ankiety przez innego',
        'notification-option-web-session': 'Gdy jest aktywna sesja przeglądarki',

        'option-add-bookmark': 'Dodaj zakładkę',
        'option-add-issue': 'Dodaj zgłoszenie do issue-trackera',
        'option-bookmark-story': 'Dodaj zakładkę',
        'option-bump-post': 'Podnieś pozycję wiadomości',
        'option-edit-comment': 'Edytuj komentarz',
        'option-edit-post': 'Edytuj wiadomość',
        'option-hide-comment': 'Ukryj komentarz przed gośćmi',
        'option-hide-post': 'Ukryj wiadomość przed gośćmi',
        'option-remove-comment': 'Usuń komentarz',
        'option-remove-post': 'Usuń wiadomość',
        'option-send-bookmarks': 'Wyślij zakładki do innych',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} osoby` : `${count} osób`;
            var bookmarks = (count === 1) ? `zakładkę` : `zakładki`;
            return `Wyślij ${bookmarks} do ${users}`;
        },
        'option-show-media-preview': 'Pokaź dołączone pliki medialne',
        'option-show-text-preview': 'Pokaź podgląd tekstu',

        'photo-capture-accept': 'Przyjmij',
        'photo-capture-cancel': 'Anuluj',
        'photo-capture-retake': 'Przerób',
        'photo-capture-snap': 'Zrób',

        'project-description-close': 'Zamknij',

        'project-management-add': 'Dodaj',
        'project-management-cancel': 'Anuluj',
        'project-management-description': 'Opis projektu',
        'project-management-manage': 'Zarządzaj listą',
        'project-management-mobile-set-up': 'konfiguracja mobilna',
        'project-management-remove': 'Usuń',
        'project-management-sign-out': 'wyloguj się',
        'project-management-sign-out-are-you-sure': 'Czy na pewno chcesz się wylogować z tego serwera?',

        'qr-scanner-cancel': 'Anuluj',
        'qr-scanner-invalid-qr-code': 'Nieprawidłowy kod QR',

        'reaction-$user-added-story-to-issue-tracker': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} dodał${e} tego posta do issue-trackera`;
        },
        'reaction-$user-cast-a-vote': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} głosował${e}`;
        },
        'reaction-$user-commented-on-branch': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} skomentował${e} tę gałąź`;
        },
        'reaction-$user-commented-on-issue': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} skomentował${e} to zgłoszenie`;
        },
        'reaction-$user-commented-on-merge': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} skomentował${e} to połączenie`;
        },
        'reaction-$user-commented-on-merge-request': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} skomentował${e} tę prośbę o połączenie`;
        },
        'reaction-$user-commented-on-push': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} skomentował${e} zmiany w tym wgrywaniu`;
        },
        'reaction-$user-completed-a-task': (user) => {
            var e = verbPastTenseEnding(user, 3);
            return `${user} wykonał${e} zadanie`;
        },
        'reaction-$user-is-assigned-to-issue': (user) => {
            var ve = verbPastTenseEnding(user, 3);
            var ae = (ve === 'a') ? 'a' : 'y';
            return `${user} został${ve} przydzielon${ae} do tego problemu`;

        },
        'reaction-$user-is-assigned-to-merge-request': (user) => {
            var ve = verbPastTenseEnding(user, 3);
            var ae = (ve === 'a') ? 'a' : 'y';
            return `${user} został${ve} przydzielon${ae} do tej prośby o połączenie`;
        },
        'reaction-$user-is-editing': (user) => {
            return `${user} edytuje komentarz...`;
        },
        'reaction-$user-is-writing': (user) => {
            return `${user} pisze komentarz...`;
        },
        'reaction-$user-likes-this': (user) => {
            return `${user} lubi to`;
        },

        'role-filter-no-roles': 'Nie ma żadnych ról',

        'search-bar-keywords': 'Słowa kluczowe albo #hashtagi',

        'selection-cancel': 'Anuluj',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-device': 'Urządzenie mobilne',
        'settings-devices': 'Urządzenis mobilne',
        'settings-diagnostics': 'Diagnostyka',
        'settings-language': 'Język',
        'settings-mobile-alert': 'Alert mobilny',
        'settings-notification': 'Powiadomienie',
        'settings-profile-image': 'Zdjęcie profilowe',
        'settings-projects': 'Projekty',
        'settings-social-networks': 'Portale społecznościowe',
        'settings-user-information': 'Informacje osobiste',
        'settings-web-alert': 'Alert przeglądarki',

        'social-network-github': 'URL profilu na GitHubie',
        'social-network-gitlab': 'URL profilu na GitLabie',
        'social-network-ichat': 'Nazwa użytkownika iChat',
        'social-network-linkedin': 'URL profilu na LinkedInie',
        'social-network-skype': 'Nazwa użytkownika Skype',
        'social-network-slack': 'Identyfikator użytkownika na Slacku',
        'social-network-slack-team': 'Identyfikator zespołu na Slacku',
        'social-network-stackoverflow': 'URL profilu na StackOverflowie',
        'social-network-twitter': 'Nazwa użytkownika na Twitterze',

        'start-activation-add-server': 'Add project from another server',
        'start-activation-instructions': 'Lorem ipsum dolor sit amet, sint explicari nec id, nisl civibus deleniti ea qui. Sit in debitis veritus consequat. Nullam delenit menandri his at, audiam fabulas te vel. Sit veri oratio suscipiantur in, mea ut duis facer patrioque. Ut partem accumsan molestiae sit.',
        'start-activation-manual': 'Ręczne wprowadzanie',
        'start-activation-scan-code': 'Zeskanuj kod QR',
        'start-error-access-denied': 'Wniosek o dostęp odrzucono',
        'start-error-account-disabled': 'Konto jest obecnie wyłączone',
        'start-error-existing-users-only': 'Tylko upoważniony personel może uzyskać dostęp do tego systemu',
        'start-error-undefined': 'Niespodziewany błąd',
        'start-projects': 'Projekty',
        'start-social-login': 'Logowanie społecznościowe',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Witamy!',
        'start-welcome-again': 'Witamy ponownie',

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
        'story-author-$count-others': (count) => {
            if (singular(count)) {
                return `inna osoba`;
            } else if (plural(count)) {
                return `${count} inne osoby`;
            } else {
                return `${count} innych osób`;
            }
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' i ', name2 ];
        },
        'story-cancel': 'Anuluj',
        'story-cancel-are-you-sure': 'Czy na pewno chcesz zrezygnować z tego posta?',
        'story-cancel-edit-are-you-sure': 'Czy na pewno chcesz porzucić wprowadzone zmiany?',
        'story-coauthors': 'Współautorzy',
        'story-comment': 'Komentuj',
        'story-drop-files-here': 'Przeciągnij i upuść pliki medialne tutaj',
        'story-file': 'Plik',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            var e = verbPastTenseEnding(user, 3);
            var text = `Napisał${e} zgłoszenie błędu #${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-issue-current-status': 'Aktualny stan:',
        'story-issue-status-closed': 'Zamknięty',
        'story-issue-status-opened': 'Otwarty',
        'story-issue-status-reopened': 'Ponownie otwarty',
        'story-like': 'Polub',
        'story-markdown': 'Markdown',
        // TODO: gender handling
        'story-member-joined-$repo': (repo) => {
            var text = `Dołączył do projektu`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-member-left-$repo': (repo) => {
            var text = `Opuścił projekt`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-merge-request-$branch1-into-$branch2': (branch1, branch2) => {
            return `Poprosił o scalanie zmian z gałęzi „${branch1}” do gałęzi „${branch2}”`;
        },
        'story-milestone-created-$name': (name) => {
            return `Stworzył kamień milowy „${name}”`;
        },
        'story-milestone-due-date': 'Termin:',
        'story-milestone-start-date': 'Data rozpoczęcia:',
        'story-options': 'Opcje',
        'story-paste-image-here': 'Zostanie umieszczony tu też obraz wklejony do edytora tekstu ',
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
                files = `${count} płików`
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
                lines = `${count} liń`
            }
            return `${lines} dodano`;
        },
        'story-push-components-changed': 'Następujące części zostały zmienione:',
        'story-push-created-$branch-in-$repo': (branch, repo) => {
            return `Stworzył gałąź „${branch}” w projektcie „${repo}”`;
        },
        'story-push-deleted-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files = `${count} płików`
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
                lines = `${count} liń`
            }
            return `${lines} usunięto`;
        },
        'story-push-merged-$branches-into-$branch-of-$repo': (branches, branch, repo) => {
            var text = `Scalił zmiany`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `„${branch}”`;
                });
                text += ` z gałęzi ${sources.join(', ')}`;
            }
            text += ` do gałęzi „${branch}”`;
            if (repo) {
                text += ` projekta „${repo}”`;
            }
            return text;
        },
        'story-push-modified-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files = `${count} płików`
            }
            return `${files} zmodyfikowano`;
        },
        'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
            var text = `Pushed changes to branch „${branch}”`;
            if (repo) {
                text += ` of project „${repo}”`;
            }
            return text;
        },
        'story-push-renamed-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 płik`;
            } else if (plural(count)) {
                files = `${count} płiki`;
            } else {
                files = `${count} płików`
            }
            return `${files} przemianowano`;
        },
        'story-remove-yourself': 'Usuń siebie',
        'story-remove-yourself-are-you-sure': 'Czy na pewno chcesz usunąć siebie jako współautora?',
        'story-repo-created-$name': (name) => {
            var text = `Stworzył projekt`;
            if (name) {
                text += ` „${name}”`;
            }
            return text;
        },
        'story-status-transcoding-$progress': (progress) => {
            return `Transkodowanie (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Przesyłanie (${progress}%)`;
        },
        'story-survey': 'Ankieta',
        'story-task-list': 'Lista zadań',
        'story-video': 'Wideo',
        'story-vote-submit': 'Zatwierdź',
        'story-wiki-created-page-with-$title': (title) => {
            return `Stworzył stronę wiki „${title}”`;
        },
        'story-wiki-deleted-page-with-$title': (title) => {
            return `Usunał stronę wiki „${title}”`;
        },
        'story-wiki-updated-page-with-$title': (title) => {
            return `Redagował wiki page „${title}”`;
        },

        'telephone-dialog-close': 'Zamknij',

        'time-yesterday': 'Wczoraj',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 płiku` : `${count} płików`;
            return `Przesyłanie ${files}, pozostało ${size}`;
        },

        'user-actions': 'Operacje',

        // TODO: handle gender
        'user-activity-$name-created-branch': 'Stworzył nową gałąź',
        'user-activity-$name-created-merge-request': 'Stworzył prośbę o połączenie zmain',
        'user-activity-$name-created-milestone': 'Stworzył kamień milowy',
        'user-activity-$name-created-repo': 'Stworzył projekt gita',
        'user-activity-$name-edited-wiki-page': 'Redagował stronę wiki',
        'user-activity-$name-joined-repo': 'Dołączył do projektu gita',
        'user-activity-$name-left-repo': 'Opuścił projekt gita',
        'user-activity-$name-merged-code': 'Wykonał scalenie zmian',
        'user-activity-$name-opened-issue': 'Napisał zgłoszenie błędu',
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios;
            if (singular(count)) {
                audios = 'klip audio';
            } else if (plural(count)) {
                audios = `${count} klipy audio`;
            } else {
                audios = `${count} klipów audio`;
            }
            return `Wysłał ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `link` : `linki`;
            var website = (count === 1) ? `strony internetowej` : `${count} stron internetowych`;
            return `Wysłał ${links} do ${website}`
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            if (singular(count)) {
                pictures = 'zdjęcie';
            } else if (plural(count)) {
                pictures = `${count} zdjęcia`;
            } else {
                pictures = `${count} zdjęć`;
            }
            return `Wysłał ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var wideos;
            if (singular(count)) {
                wideos = 'klip wideo';
            } else if (plural(count)) {
                wideos = `${count} klipy wideo`;
            } else {
                wideos = `${count} klipów wideo`;
            }
            return `Wysłał ${wideos}`;
        },
        'user-activity-$name-pushed-code': 'Przesłał kod do repozytorium',
        'user-activity-$name-started-survey': 'Stworzył ankietę',
        'user-activity-$name-started-task-list': 'Stworzył listę zadań',
        'user-activity-$name-wrote-post': 'Napisał post',
        'user-activity-more': 'Więcej...',

        'user-image-remove': 'Usuń',
        'user-image-select': 'Wybierz',
        'user-image-snap': 'Zrób',

        'user-info-email': 'Adres e-mail',
        'user-info-gender': 'Płeć',
        'user-info-gender-female': 'Żeńska',
        'user-info-gender-male': 'Męska',
        'user-info-gender-unspecified': 'Nieokreślona',
        'user-info-name': 'Imię i nazwisko',
        'user-info-phone': 'Numer telefonu',

        'user-statistics-legend-branch': 'Nowe gałęzie',
        'user-statistics-legend-issue': 'Zgłoszenia błędu',
        'user-statistics-legend-merge': 'Wgrywania zmian',
        'user-statistics-legend-merge-request': 'Prośby o połączenie',
        'user-statistics-legend-milestone': 'Kamienia milowe',
        'user-statistics-legend-push': 'Wgrywa kodu',
        'user-statistics-legend-repo': 'Zmiany repozytorium',
        'user-statistics-legend-story': 'Posty',
        'user-statistics-legend-survey': 'Ankiety',
        'user-statistics-legend-task-list': 'Listy zadań',
        'user-statistics-legend-wiki': 'Edycje Wiki',
        'user-statistics-today': 'Dziś',
        'user-statistics-tooltip-$count-branch': (count) => {
            if (singular(count)) {
                return `1 gałąź`;
            } else if (plural(count)) {
                return `${count} gałęzi`;
            } else {
                return `${count} gałęzi`;
            }
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            if (singular(count)) {
                return `1 zgłoszenie błędu`;
            } else if (plural(count)) {
                return `${count} zgłoszenia błędu`;
            } else {
                return `${count} zgłoszeń błędu`;
            }
        },
        'user-statistics-tooltip-$count-member': (count) => {
            if (singular(count)) {
                return `1 zmiana członkostwa`;
            } else if (plural(count)) {
                return `${count} zmiany członkostwa`;
            } else {
                return `${count} zmian członkostwa`;
            }
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            if (singular(count)) {
                return `1 scalnie zmian`;
            } else if (plural(count)) {
                return `${count} scalenia zmian`;
            } else {
                return `${count} scaleń zmian`;
            }
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            if (singular(count)) {
                return `1 kamień milowy`;
            } else if (plural(count)) {
                return `${count} kamienie milowe`;
            } else {
                return `${count} kamieni milowych`;
            }
        },
        'user-statistics-tooltip-$count-push': (count) => {
            if (singular(count)) {
                return `1 wgrywanie zmian`;
            } else if (plural(count)) {
                return `${count} wgrywania zmian`;
            } else {
                return `${count} wgrywań zmian`;
            }
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            if (singular(count)) {
                return `1 zmiana repozytorium`;
            } else if (plural(count)) {
                return `${count} zmiany repozytorium`;
            } else {
                return `${count} zmian repozytorium`;
            }
        },
        'user-statistics-tooltip-$count-story': (count) => {
            if (singular(count)) {
                return `1 post`;
            } else if (plural(count)) {
                return `${count} posty`;
            } else {
                return `${count} postów`;
            }
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            if (singular(count)) {
                return `1 ankieta`;
            } else if (plural(count)) {
                return `${count} ankiety`;
            } else {
                return `${count} ankiet`;
            }
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            if (singular(count)) {
                return `1 lista zadań`;
            } else if (plural(count)) {
                return `${count} listy zadań`;
            } else {
                return `${count} list zadań`;
            }
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            if (singular(count)) {
                return `1 edycja strony wiki`;
            } else if (plural(count)) {
                return `${count} edycje strony wiki`;
            } else {
                return `${count} edycjy strony wiki`;
            }
        },

        'video-capture-accept': 'Przyjmij',
        'video-capture-cancel': 'Anuluj',
        'video-capture-pause': 'Wstrzymaj',
        'video-capture-resume': 'Kontynuuj',
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

function verbPastTenseEnding(name, person) {
    if (gender(name) === 'female') {
        if (person === 3) {
            return 'a';
        } else if (person === 2) {
            return 'aś';
        }
    } else {
        if (person === 3) {
            return '';
        } else if (person === 2) {
            return 'eś';
        }
    }
}
