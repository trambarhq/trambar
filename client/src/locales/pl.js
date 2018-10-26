import 'moment/locale/pl';
import {
    plural,
    cardinal,
    gender,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/polish';

const phrases = {
    'action-contact-by-email': 'Skontaktuj się przez e-mail',
    'action-contact-by-ichat': 'Skontaktuj się przez iChat',
    'action-contact-by-phone': 'Skontaktuj się telefonicznie',
    'action-contact-by-skype': 'Skontaktuj się przez Skype',
    'action-contact-by-slack': 'Skontaktuj się przez Slack',
    'action-contact-by-twitter': 'Skontaktuj się przez Twitter',
    'action-view-github-page': 'Wyświetl profil na GitHubie',
    'action-view-gitlab-page': 'Wyświetl profil na GitLabie',
    'action-view-linkedin-page': 'Wyświetl profil na LinkedInie',
    'action-view-stackoverflow-page': 'Wyświetl profil na StackOverflowie',

    'activation-address': 'Adres serwera',
    'activation-cancel': 'Anuluj',
    'activation-code': 'Kod aktywacyjny',
    'activation-ok': 'OK',
    'activation-schema': 'Projekt',

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, 'nowa zakładka', 'nowe zakładki', 'nowych zakładek');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, 'nowe powiadomienie', 'nowe powiadomienia', 'nowych powiadomień');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, 'nowa wiadomość', 'nowe wiadomości', 'nowych wiadomości');
    },

    'app-component-close': 'Zamknij',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Przyjmij',
    'audio-capture-cancel': 'Anuluj',
    'audio-capture-pause': 'Wstrzymaj',
    'audio-capture-rerecord': 'Nagraj ponownie',
    'audio-capture-resume': 'Kontynuuj',
    'audio-capture-start': 'Rozpocznij',
    'audio-capture-stop': 'Zatrzymaj',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, 'inna osoba', 'inne osoby', 'innych osób');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, 'osoba', 'osoby', 'osób');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} poleca to`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` i `, name2, ` polecają to` ];
    },
    'bookmark-$you-bookmarked-it': (you) => {
        let e = pastTenseEnding(you, 2);
        return `Założy${e} zakładkę do tego`;
    },
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        let e = pastTenseEnding(you, 2);
        return `Założy${e} zakładkę do tego (i ${name} poleca go)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, users, count) => {
        let e = pastTenseEnding(you, 2);
        let verb = plural(count) ? 'polecają' : 'poleca';
        return [ `Założy${e} zakładkę do tego (i `, users, ` ${verb} it)` ];
    },
    'bookmark-recommendations': 'Polecenia',

    'bookmarks-no-bookmarks': 'Żadnych zakładek',

    'bottom-nav-bookmarks': 'Zakładki',
    'bottom-nav-news': 'Wiadomości',
    'bottom-nav-notifications': 'Powiadomienia',
    'bottom-nav-people': 'Ludzie',
    'bottom-nav-settings': 'Ustawienia',

    'confirmation-cancel': 'Anuluj',
    'confirmation-confirm': 'Potwierdź',

    'development-code-push-$deployment': (deployment) => {
        return `Uzyskaj aktualizacje kodu z „${deployment}”`;
    },
    'development-show-diagnostics': 'Pokaż diagnostykę',
    'development-show-panel': 'Wyświetl ten panel',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Tylna',
    'device-selector-camera-front': 'Przednia',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'Jesteś odłączony od sieci',

    'image-editor-page-rendering-in-progress': 'Renderowanie podglądu strony internetowej...',
    'image-editor-poster-extraction-in-progress': 'Wyodrębnianie podglądu z wideo...',
    'image-editor-upload-in-progress': 'Przesyłanie w toku...',

    'issue-cancel': 'Anuluj',
    'issue-delete': 'Usuń',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos === 1) {
            objects.push(photos === 1 ? 'zdjęcie' : 'zdjęcia');
            ae = 'e';
        }
        if (videos > 0) {
            objects.push(videos === 1 ? 'klip wideo' : 'klipy wideo');
            if (!ae) {
                ae = (videos === 1) ? 'y' : 'e';
            }
        }
        if (audios > 0) {
            objects.push(audios === 1 ? 'klip audio' : 'klipy audio');
            if (!ae) {
                ae = (audios === 1) ? 'y' : 'e';
            }
        }
        let ve = pastTenseEnding(names, 3, names.length > 1);
        return `${list(names)} wysła${ve} następując${ae} ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        let e = pastTenseEnding(names, 3, names.length > 1);
        return `${list(names)} napisa${e}:`;
    },
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

    'membership-request-$you-are-member': (you) => {
        let member = (gender(you) === 'female') ? `członkinią` : `członkiem`;
        return `Jesteś ${member} tego projektu`;
    },
    'membership-request-$you-are-now-member': (you) => {
        let e = pastTenseEnding(you, 2);
        let member = (gender(you) === 'female') ? `członkinią` : `członkiem`;
        return `Zosta${e} ${member} tego projektu`;
    },
    'membership-request-$you-have-requested-membership': (you) => {
        let e = pastTenseEnding(you, 2);
        return `Zgłosi${e} się o członkostwo w tym projekcie`;
    },
    'membership-request-browse': 'Przeglądaj',
    'membership-request-cancel': 'Anuluj',
    'membership-request-join': 'Dołącz',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Przystąp',
    'membership-request-withdraw': 'Wycofaj',

    'mobile-device-revoke': 'wyłącz',
    'mobile-device-revoke-are-you-sure': 'Czy na pewno chcesz cofnąć autoryzację tego urządzenia?',

    'mobile-setup-address': 'Adres serwera',
    'mobile-setup-close': 'Zamknij',
    'mobile-setup-code': 'Kod autoryzacyjny',
    'mobile-setup-project': 'Projekt',

    'news-no-stories-by-role': 'Żadnych wiadomości od kogoś z tą rolą',
    'news-no-stories-found': 'Nie znaleziono pasujących wiadomości',
    'news-no-stories-on-date': 'Żadnych wiadomości w tym dniu',
    'news-no-stories-yet': 'Żadnych wiadomości',

    'notification-$name-added-you-as-coauthor': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} zaprosi${e} Cię do wspólnej edycji posta`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} doda${e} twojego posta do issue-trackera`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'Twoją ankietę'; break;
            case 'task-list': story = 'Twoją listę zadań'; break;
            case 'post': story = 'Twoj post'; break;
            default: story = 'Twoją wiadomość';
        }
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} wykona${e} zadanie z Twojej listy`;
    },
    'notification-$name-is-assigned-to-your-issue': (name) => {
        let ve = pastTenseEnding(name, 3);
        let ae = (ve === 'ła') ? 'a' : 'y';
        return `${name} został${ve} przydzielon${ae} do twojego problemu`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'Twoją ankietę'; break;
            case 'task-list': story = 'Twoją listę zadań'; break;
            case 'post': story = 'Twoj post'; break;
            default: story = 'Twoją wiadomość';
        }
        return `${name} lubi ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'w komentarzu';
        return `${name} wspomniał o Tobie ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'w ankiecie'; break;
            case 'task-list': story = 'na liście zadań'; break;
            case 'post': story = 'w poście'; break;
            case 'issue': story = 'w głoszeniu błędu'; break;
            case 'merge-request': story = 'w prośbie o połączenie'; break;
            default: story = 'w wiadomości';
        }
        return `${name} wspomniał o Tobie ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        let e = pastTenseEnding(name, 3);
        return `${name} scali${e} zmiany do gałęzi „${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} napisa${e} zgłoszenie błędu`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        let e = pastTenseEnding(name, 3);
        switch (story) {
            case 'push': story = 'twoją rewizję'; break;
            case 'issue': story = 'twoje zgłoszenie'; break;
            case 'merge-request': story = 'twoją prośbę o połączenie'; break;
        }
        return `${name} skomentowa${e} ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} opublikowa${e} ankietę`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ł') ? 'ą' : 'ę';
        return `Wypchn${a}${e} zmiany gałęzi „${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} poprosi${e} o dołączenie do tego projektu`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'ankiety'; break;
            case 'task-list': story = 'listy zadań'; break;
            case 'post': story = ' posta'; break;
            default: story = 'wiadomości';
        }
        let e = pastTenseEnding(name, 3);
        return `${name} przysła${e} Ci zakładkę do ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} odpowiedzia${e} na Twoją ankietę`;
    },
    'notification-option-assignment': 'Po przydzieleniu do Twojego zgłoszenia błędu',
    'notification-option-bookmark': 'Po otrzymaniu zakładki',
    'notification-option-coauthor': 'Po zaproszeniu do wspólnej edycji posta',
    'notification-option-comment': 'Po komentowaniu Twojego wiadomości',
    'notification-option-issue': 'Po zgłoszeniu błędu',
    'notification-option-join-request': 'Po prośbie o dołączenie do projektu',
    'notification-option-like': 'Po upodobaniu Twojej wiadomości',
    'notification-option-mention': 'Po wspomnieniach o Tobie w wiadomości lub komentarzu',
    'notification-option-merge': 'Po scalaniu kodu w gałąź master',
    'notification-option-note': 'Po komentowaniu zmian kodu ablo złoszenia błedu',
    'notification-option-push': 'Po wgrywaniu zmian do repozytorium Gita',
    'notification-option-survey': 'Po opublikowaniu ankiety',
    'notification-option-task-completion': 'Po wykonaniu zadania na Twojej liście przez innego',
    'notification-option-vote': 'Po odpowiadaniu Twojej ankiety przez innego',
    'notification-option-web-session': 'Gdy jest aktywna sesja przeglądarki',

    'notifications-no-notifications-on-date': 'Żadnych powiadomień w tym dniu',
    'notifications-no-notifications-yet': 'Żadnych powiadomień',

    'option-add-bookmark': 'Dodaj zakładkę',
    'option-add-issue': 'Dodaj posta do issue-trackera',
    'option-bump-story': 'Podnieś pozycję wiadomości',
    'option-edit-comment': 'Edytuj komentarz',
    'option-edit-post': 'Edytuj wiadomość',
    'option-hide-comment': 'Ukryj komentarz przed gośćmi',
    'option-hide-story': 'Ukryj wiadomość przed gośćmi',
    'option-keep-bookmark': 'Zachowuj zakładkę',
    'option-remove-comment': 'Usuń komentarz',
    'option-remove-story': 'Usuń wiadomość',
    'option-send-bookmarks': 'Wyślij zakładki do innych',
    'option-send-bookmarks-to-$count-users': (count) => {
        let users = (count === 1) ? `${count} osoby` : `${count} osób`;
        let bookmarks = (count === 1) ? `zakładkę` : `zakładki`;
        return `Wyślij ${bookmarks} do ${users}`;
    },
    'option-show-media-preview': 'Pokaź dołączone pliki medialne',
    'option-show-text-preview': 'Pokaź podgląd tekstu',
    'option-statistics-14-days': 'Pokaż działania z ostatnich 14 dni',
    'option-statistics-biweekly': 'Pokaż działania dwutygodniowe',
    'option-statistics-monthly': 'Pokaż działania miesięczne',
    'option-statistics-to-date': 'Pokaż działania do tej pory',

    'people-no-stories-found': 'Nie znaleziono pasujących wiadomości',
    'people-no-stories-on-date': 'Żadnych działań w tym dniu',
    'people-no-users-by-role': 'Żaden członek projektu nie ma takiej roli',
    'people-no-users-yet': 'Żadnych członków projektu',

    'person-no-stories-found': 'Nie znaleziono pasujących wiadomości',
    'person-no-stories-on-date': 'Żadnych wiadomości w tym dniu',
    'person-no-stories-yet': 'Żadnych wiadomości',

    'photo-capture-accept': 'Przyjmij',
    'photo-capture-cancel': 'Anuluj',
    'photo-capture-retake': 'Przerób',
    'photo-capture-snap': 'Zrób',

    'project-description-close': 'Zamknij',

    'project-management-add': 'Dodaj',
    'project-management-cancel': 'Anuluj',
    'project-management-description': 'opis projektu',
    'project-management-join-project': 'dołącz do projektu',
    'project-management-manage': 'Zarządzaj listą',
    'project-management-mobile-set-up': 'konfiguracja mobilna',
    'project-management-remove': 'Usuń',
    'project-management-sign-out': 'wyloguj się',
    'project-management-sign-out-are-you-sure': 'Czy na pewno chcesz się wylogować z tego serwera?',
    'project-management-withdraw-request': 'anulowaj prośbę o członkostwo',

    'qr-scanner-cancel': 'Anuluj',
    'qr-scanner-code-found': 'Znaleziono kod QR',
    'qr-scanner-code-invalid': 'Nieprawidłowy kod QR',
    'qr-scanner-code-used': 'Nieaktualny kod QR',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} doda${e} tego posta do issue-trackera`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} głosowa${e}`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} tę gałąź`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} to zgłoszenie`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} to połączenie`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} tę prośbę o połączenie`;
    },
    'reaction-$name-commented-on-push': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} zmiany w tym wgrywaniu`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentowa${e} ten tag`;
    },
    'reaction-$name-completed-a-task': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} wykona${e} zadanie`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        let ve = pastTenseEnding(name, 3);
        let ae = (ve === 'ła') ? 'a' : 'y';
        return `${name} został${ve} przydzielon${ae} do tego problemu`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        let ve = pastTenseEnding(name, 3);
        let ae = (ve === 'ła') ? 'a' : 'y';
        return `${name} został${ve} przydzielon${ae} do tej prośby o połączenie`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} edytuje komentarz...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} wysyła komentarz...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} pisze komentarz...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} lubi to`;
    },
    'reaction-status-storage-pending': 'W toku',
    'reaction-status-transcoding': 'Transkodowanie',
    'reaction-status-uploading': 'Przesyłanie',

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

    'settings-development': 'Opcje programistyczne',
    'settings-device': 'Urządzenie mobilne',
    'settings-devices': 'Urządzenis mobilne',
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
    'social-network-stackoverflow': 'URL profilu na StackOverflow',
    'social-network-twitter': 'Nazwa użytkownika na Twitterze',

    'start-activation-add-server': 'Add project from another server',
    'start-activation-instructions': (ui) => {
        return [
            'Aby uzyskać dostęp do serwera Trambar na tym urządzeniu, najpierw zaloguj się do serwera za pomocą przeglądarki internetowej. Wybierz projekt, a następnie przejdź do strony ',
            ui.settings,
            '. W panelu ',
            ui.projects,
            ' kliknij ',
            ui.mobileSetup,
            '. Kod QR pojawi się na ekranie. Następnie—na tym urządzeniu—naciśnij przycisk poniżej i zeskanuj kod. Alternatywnie możesz ręcznie wprowadzić kod aktywacyjny.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Zaloguj się za pomocą przeglądarki internetowej, a następnie zeskanuj wyświetlony kod QR na stronie ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Ręcznie',
    'start-activation-new-server': 'Nowy serwer',
    'start-activation-others-servers': 'Dostępne serwery',
    'start-activation-return': 'Powrót',
    'start-activation-scan-code': 'Zeskanuj kod QR',
    'start-error-access-denied': 'Wniosek o dostęp odrzucono',
    'start-error-account-disabled': 'Konto jest obecnie wyłączone',
    'start-error-existing-users-only': 'Tylko upoważniony personel może uzyskać dostęp do tego systemu',
    'start-error-undefined': 'Niespodziewany błąd',
    'start-no-projects': 'Żadnych projektów',
    'start-no-servers': 'Żadnych dostawców OAuth',
    'start-projects': 'Projekty',
    'start-social-login': 'Logowanie społecznościowe',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Witamy!',
    'start-welcome-again': 'Witamy ponownie',

    'statistics-bar': 'Słupkowy',
    'statistics-line': 'Liniowy',
    'statistics-pie': 'Kołowy',

    'story-$count-reactions': (count) => {
        return cardinal(count, 'reakcja', 'reakcje', 'reakcji');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} gałąź „${branch}” w projektcie „${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} kamień milowy „${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} stronę wiki „${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Stworzy${e} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} tag „${tag}” w projektcie „${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        return `Usun${a}${e} stronę wiki „${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        let text = `Usun${a}${e} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Zaimportowa${e} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Dołączy${e} do projektu`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Opuści${e} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Scali${e} zmiany`;
        if (branches && branches.length > 0) {
            let sources = branches.map((branch) => {
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
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        let e = pastTenseEnding(name, 3);
        let text = `Napisa${e} zgłoszenie błędu #${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        let text = `Wypchn${a}${e} zmiany gałęzi „${branch}”`;
        if (repo) {
            text += ` projektu „${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        let e = pastTenseEnding(name, 3);
        return `Poprosi${e} o scalanie zmian z gałęzi „${branch1}” do gałęzi „${branch2}”`;
    },
    'story-$name-updated-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        return `Redagowa${e} wiki page „${page}”`;
    },
    'story-add-coauthor': 'Dodaj współautora',
    'story-add-remove-coauthor': 'Dodaj/Usuń współautora',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return cardinal(count, 'inna osoba', 'inne osoby', 'innych osób');
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` i `, name2 ];
    },
    'story-cancel': 'Anuluj',
    'story-cancel-are-you-sure': 'Czy na pewno chcesz zrezygnować z tego posta?',
    'story-cancel-edit-are-you-sure': 'Czy na pewno chcesz porzucić wprowadzone zmiany?',
    'story-coauthors': 'Współautorzy',
    'story-comment': 'Komentuj',
    'story-drop-files-here': 'Przeciągnij i upuść pliki medialne tutaj',
    'story-file': 'Plik',
    'story-issue-current-status': 'Aktualny stan:',
    'story-issue-status-closed': 'Zamknięty',
    'story-issue-status-opened': 'Otwarty',
    'story-issue-status-reopened': 'Ponownie otwarty',
    'story-like': 'Polub',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Termin:',
    'story-milestone-start-date': 'Data rozpoczęcia:',
    'story-options': 'Opcje',
    'story-paste-image-here': 'Zostanie umieszczony tu też obraz wklejony do edytora tekstu ',
    'story-pending': 'Operacja w toku...',
    'story-photo': 'Zdjęcie',
    'story-post': 'Wysłaj',
    'story-push-added-$count-files': (count) => {
        let files = cardinal(count, 'płik', 'płiki', 'płików');
        return `${files} dodano`;
    },
    'story-push-added-$count-lines': (count) => {
        let lines = cardinal(count, 'linia', 'linie', 'liń');
        return `${lines} dodano`;
    },
    'story-push-components-changed': 'Następujące części zostały zmienione:',
    'story-push-deleted-$count-files': (count) => {
        let files = cardinal(count, 'płik', 'płiki', 'płików');
        return `${files} usunięto`;
    },
    'story-push-deleted-$count-lines': (count) => {
        let lines = cardinal(count, 'linia', 'linie', 'liń');
        return `${lines} usunięto`;
    },
    'story-push-modified-$count-files': (count) => {
        let files = cardinal(count, 'płik', 'płiki', 'płików');
        return `${files} zmodyfikowano`;
    },
    'story-push-modified-$count-lines': (count) => {
        let lines = cardinal(count, 'linia', 'linie', 'liń');
        return `${lines} zmodyfikowano`;
    },
    'story-push-renamed-$count-files': (count) => {
        let files = cardinal(count, 'płik', 'płiki', 'płików');
        return `${files} przemianowano`;
    },
    'story-remove-yourself': 'Usuń siebie',
    'story-remove-yourself-are-you-sure': 'Czy na pewno chcesz usunąć siebie jako współautora?',
    'story-status-storage-pending': 'W oczekiwaniu',
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

    'telephone-dialog-close': 'Zamknij',

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'Dzień', '2 dni', '5 dni');
        return `${time} temu`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'Godzina', '2 godziny', '5 godzin');
        return `${time} temu`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} godz temu`;
    },
    'time-$min-ago': (min) => {
        return `${min} min temu`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'Minuta', '2 minuty', '5 minut');
        return `${time} temnu`;
    },
    'time-just-now': 'Właśnie teraz',
    'time-yesterday': 'Wczoraj',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = (count === 1) ? `1 płiku` : `${count} płików`;
        return `Przesyłanie ${files}, pozostało ${size}`;
    },

    'user-actions': 'Operacje',

    'user-activity-$name-created-branch': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} nową gałąź`;
    },
    'user-activity-$name-created-merge-request': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} prośbę o połączenie zmain`;
    },
    'user-activity-$name-created-milestone': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} kamień milowy`;
    },
    'user-activity-$name-created-repo': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} projekt gita`;
    },
    'user-activity-$name-created-tag': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} nowy tag`;
    },
    'user-activity-$name-deleted-repo': (name) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        return `Usun${a}${e} projekt gita`;
    },
    'user-activity-$name-edited-wiki-page': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Redagowa${e} stronę wiki`;
    },
    'user-activity-$name-imported-repo': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Zaimportowa${e} projekt gita`;
    },
    'user-activity-$name-joined-repo': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Dołączy${e} do projektu gita`;
    },
    'user-activity-$name-left-repo': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Opuści${e} projekt gita`;
    },
    'user-activity-$name-merged-code': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Wykona${e} scalenie zmian`;
    },
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'klip audio', 'klipy audio', 'klipów audio');
        let e = pastTenseEnding(name, 3);
        return `Wysła${e} ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = (count === 1) ? `link` : `linki`;
        let website = (count === 1) ? `strony internetowej` : `${count} stron internetowych`;
        let e = pastTenseEnding(name, 3);
        return `Wysła${e} ${links} do ${website}`
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'zdjęcie', 'zdjęcia', 'zdjęć');
        let e = pastTenseEnding(name, 3);
        return `Wysła${e} ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'klip wideo', 'klipy wideo', 'klipów wideo');
        let e = pastTenseEnding(name, 3);
        return `Wysła${e} ${videos}`;
    },
    'user-activity-$name-pushed-code': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Przesła${e} kod do repozytorium`;
    },
    'user-activity-$name-reported-issue': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Zgłosi${e} problem`;
    },
    'user-activity-$name-started-survey': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} ankietę`;
    },
    'user-activity-$name-started-task-list': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzy${e} listę zadań`;
    },
    'user-activity-$name-wrote-post': (name) => {
        let e = pastTenseEnding(name, 3);
        return `Napisa${e} post`;
    },
    'user-activity-back': 'Powrót',
    'user-activity-more': 'Więcej',

    'user-image-adjust': 'Dostosuj',
    'user-image-cancel': 'Anuluj',
    'user-image-replace': 'Zmień',
    'user-image-save': 'Zapisz',
    'user-image-select': 'Wybierz',
    'user-image-snap': 'Zrób',

    'user-info-email': 'Adres e-mail',
    'user-info-gender': 'Płeć',
    'user-info-gender-female': 'Kobieta',
    'user-info-gender-male': 'Mężczyzna',
    'user-info-gender-unspecified': 'Nieokreślona',
    'user-info-name': 'Imię i nazwisko',
    'user-info-phone': 'Numer telefonu',

    'user-statistics-legend-branch': 'Nowe gałęzie',
    'user-statistics-legend-issue': 'Zgłoszenia błędu',
    'user-statistics-legend-member': 'Zmiany członkostwa',
    'user-statistics-legend-merge': 'Wgrywania zmian',
    'user-statistics-legend-merge-request': 'Prośby o połączenie',
    'user-statistics-legend-milestone': 'Kamienia milowe',
    'user-statistics-legend-post': 'Posty',
    'user-statistics-legend-push': 'Wgrywa kodu',
    'user-statistics-legend-repo': 'Zmiany repozytorium',
    'user-statistics-legend-survey': 'Ankiety',
    'user-statistics-legend-tag': 'Nowe tagi',
    'user-statistics-legend-task-list': 'Listy zadań',
    'user-statistics-legend-wiki': 'Edycje Wiki',
    'user-statistics-today': 'Dziś',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, 'gałąź', 'gałęzi', 'gałęzi');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, 'zgłoszenie błędu', 'zgłoszenia błędu', 'zgłoszeń błędu');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, 'zmiana członkostwa', 'zmiany członkostwa', 'zmian członkostwa');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, 'scalenie zmian', 'scalenia zmian', 'scaleń zmian');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, 'prośba o połączenie', 'prośby o połączenie', 'próśb o połączenie');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, 'kamień milowy', 'kamienie milowe', 'kamieni milowych');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, 'post', 'posty', 'postów');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, 'wgrywanie zmian', 'wgrywania zmian', 'wgrywań zmian');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, 'zmiana repozytorium', 'zmiany repozytorium', 'zmian repozytorium');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, 'ankieta', 'ankiety', 'ankiet');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, 'tag', 'tagi', 'tagów');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, 'lista zadań', 'listy zadań', 'list zadań');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, 'edycja strony wiki', 'edycje strony wiki', 'edycji strony wiki');
    },

    'video-capture-accept': 'Przyjmij',
    'video-capture-cancel': 'Anuluj',
    'video-capture-pause': 'Wstrzymaj',
    'video-capture-resume': 'Kontynuuj',
    'video-capture-retake': 'Przerób',
    'video-capture-start': 'Rozpocznij',
    'video-capture-stop': 'Zatrzymaj',

    'warning-no-connection': 'Brak natychmiastowej aktualizacji',
};

export {
    phrases,
    genderize,
};
