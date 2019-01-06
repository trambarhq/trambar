import 'moment/locale/lt';
import {
    cardinal,
} from 'locale/grammars/lithuanian';

const phrases = {
    'action-contact-by-email': 'Susisiekti e-paštu',
    'action-contact-by-ichat': 'Susisiekti su iChat',
    'action-contact-by-phone': 'Susisiekti telefonu',
    'action-contact-by-skype': 'Susisiekti su Skype',
    'action-contact-by-slack': 'Susisiekti su Slack',
    'action-contact-by-twitter': 'Susisiekti su Twitter',
    'action-view-github-page': 'Peržiūrėti profilį GitHub',
    'action-view-gitlab-page': 'Peržiūrėti profilį GitLab',
    'action-view-linkedin-page': 'Peržiūrėti profilį LinkedIn',
    'action-view-stackoverflow-page': 'Peržiūrėti profilį Stack Overflow',

    'activation-address': 'Serverio adresas',
    'activation-cancel': 'Atšaukti',
    'activation-code': 'Aktyvacijos kodas',
    'activation-ok': 'OK',
    'activation-schema': 'Projektas',

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, '1 nauja žyma', '2 naujos žymos', '10 naujų žymių');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 naujas pranešimas', '2 nauji pranešimai', '10 naujų pranešimų');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 nauja istorija', '2 naujos istorijos', '10 naujų istorijų');
    },

    'app-component-close': 'Uždaryti',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Priimti',
    'audio-capture-cancel': 'Atšaukti',
    'audio-capture-pause': 'Pauzė',
    'audio-capture-rerecord': 'Įrašyti iš naujo',
    'audio-capture-resume': 'Tęsti',
    'audio-capture-start': 'Pradėti',
    'audio-capture-stop': 'Sustabdyti',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, '1 kitas vartotojas', '2 kiti vartotojai', '10 kitų vartotojų');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 vartotojas', '2 vartotojai', '10 vartotojų');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} rekomenduoja tai`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` i `, name2, ` rekomenduoja tai` ];
    },
    'bookmark-$you-bookmarked-it': 'Jūs įtraukėte žymę prie jos',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Jūs įtraukėte žymę prie jos (ir ${name} rekomenduoja)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, users, count) => {
        return [ `Jūs įtraukėte žymę prie jos (ir `, users, ` rekomenduoja)` ];
    },
    'bookmark-recommendations': 'Rekomendacijos',

    'bookmarks-no-bookmarks': 'Nėra žymių',

    'bottom-nav-bookmarks': 'Žymes',
    'bottom-nav-news': 'Naujienos',
    'bottom-nav-notifications': 'Pranešimai',
    'bottom-nav-people': 'Žmonės',
    'bottom-nav-settings': 'Nustatymai',

    'confirmation-cancel': 'Atšaukti',
    'confirmation-confirm': 'Patvirtinti',

    'development-code-push-$deployment': (deployment) => {
        return `Atsisiųsti atnaujinimus iš „${deployment}”`;
    },
    'development-show-diagnostics': 'Rodyti diagnostiką',
    'development-show-panel': 'Rodyti šį skydelį',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Galinis',
    'device-selector-camera-front': 'Priekinė',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'Jūs esate atjungtas nuo tinklo',

    'image-editor-page-rendering-in-progress': 'Atvaizdavimas tinklalapio peržiūrą...',
    'image-editor-poster-extraction-in-progress': 'Ištraukimas video peržiūrą...',
    'image-editor-upload-in-progress': 'Siuntimas vykdomas...',

    'issue-cancel': 'Atšaukite',
    'issue-delete': 'Ištrinti',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos === 1) {
            objects.push(photos === 1 ? 'nuotrauką' : 'nuotraukas');
            ae = (photos === 1) ? 'ią' : 'iąs';
        }
        if (videos > 0) {
            objects.push(videos === 1 ? 'klip klipą' : 'klip klipus');
            if (!ae) {
                ae = (videos === 1) ? 'į' : 'iuos';
            }
        }
        if (audios > 0) {
            objects.push(audios === 1 ? 'audio klipą' : 'audio klipus');
            if (!ae) {
                ae = (audios === 1) ? 'į' : 'iuos';
            }
        }
        return `${list(names)} pasiuntė š${ae} ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        return `${list(names)} parašė:`;
    },
    'issue-ok': 'OK',
    'issue-repo': 'Saugykla',
    'issue-title': 'Pavadinimas',

    'list-$count-more': (count) => {
        return `Dar ${count}...`;
    },

    'media-close': 'Uždaryti',
    'media-download-original': 'Atsisiųskite pradinį failą',
    'media-editor-embed': 'Įterpti',
    'media-editor-remove': 'Ištrinti',
    'media-editor-shift': 'Perkelti',
    'media-next': 'Sekantis',
    'media-previous': 'Ankstesnis',

    'membership-request-$you-are-member': (you) => {
        return `Jūs esate šio projekto narys`;
    },
    'membership-request-$you-are-now-member': (you) => {
        return `Jūs tapo šio projekto nariu`;
    },
    'membership-request-$you-have-requested-membership': (you) => {
        return `Jūs kreipėtės dėl narystės šiame projekte`;
    },
    'membership-request-browse': 'Naršyti',
    'membership-request-cancel': 'Atšaukti',
    'membership-request-join': 'Prisijungti',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Tęsti',
    'membership-request-withdraw': 'Atsiimti',

    'mobile-device-revoke': 'atšaukti',
    'mobile-device-revoke-are-you-sure': 'Ar tikrai norite atšaukti leidimą šiam prietaisui?',

    'mobile-setup-address': 'Serverio adresas',
    'mobile-setup-close': 'Uždaryti',
    'mobile-setup-code': 'Leidimo kodas',
    'mobile-setup-project': 'Projektas',

    'news-no-stories-by-role': 'Nėra jokio istorijos iš šio vaidmens',
    'news-no-stories-found': 'Nerasta jokių atitinkančių istorijų',
    'news-no-stories-on-date': 'Šios dienos istorijų nėra',
    'news-no-stories-yet': 'Nėra istorijų',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} pakvietė tave bendrai redaguoti įrašą`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} pridėjo tavo įrašą į klaidų sekimo sistemą`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketą'; break;
            case 'task-list': story = 'užduočių sąrašą'; break;
            case 'post': story = 'įrašą'; break;
            default: story = 'istoriją';
        }
        return `${name} pakomentavo tavo ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} baigė užduotį iš tavo sąrašo`;
    },
    'notification-$name-is-assigned-to-your-issue': (name) => {
        return `${name} yra priskirtas tavo klaidos ataskaitai`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketą'; break;
            case 'task-list': story = 'užduočių sąrašą'; break;
            case 'post': story = 'įrašą'; break;
            default: story = 'istoriją';
        }
        return `${name} mėgsta tavo ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'komentare';
        return `${name} tave paminėjo ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketoje'; break;
            case 'task-list': story = 'užduočių sąraše'; break;
            case 'post': story = 'įraše'; break;
            case 'issue': story = 'klaidos ataskaitoje'; break;
            case 'merge-request': story = 'prašyme sujungti'; break;
            default: story = 'istorijoje';
        }
        return `${name} tave paminėjo ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} sujungė pakeitimus į šaką „${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} parašė klaidos ataskaitą`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'reviziją'; break;
            case 'issue': story = 'klaidos ataskaitą'; break;
            case 'merge-request': story = 'prašymą sujungti'; break;
        }
        return `${name} pakomentavo tavo ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} paskelbė anketą`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} atsiuntė pakeitimus sakai „${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} paprašė prisijungti prie šio projekto`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketos'; break;
            case 'task-list': story = 'užduočių sąrašo'; break;
            case 'post': story = 'įrašo'; break;
            default: story = 'istorijos';
        }
        return `${name} atsiuntė tau ${story} žymę`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} atsakė į tavo anketą`;
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

    'notifications-no-notifications-on-date': 'Nėra pranešimų apie šią datą',
    'notifications-no-notifications-yet': 'Nėra pranešimų',

    'option-add-bookmark': 'Pridėti žymą',
    'option-add-issue': 'Pridėti įrašą į klaidų sekimo sistemą',
    'option-bump-story': 'Skatinti istoriją',
    'option-edit-comment': 'Redaguoti komentarą',
    'option-edit-post': 'Redaguoti įrašą',
    'option-hide-comment': 'Paslėpti komentarą nuo svečių',
    'option-hide-story': 'Paslėpti istorija nuo svečių',
    'option-keep-bookmark': 'Laikyti žymę',
    'option-remove-comment': 'Ištrinti komentarą',
    'option-remove-story': 'Ištrinti istoriją',
    'option-send-bookmarks': 'Siųsti žymes kitiems',
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

    'photo-capture-accept': 'Priimti',
    'photo-capture-cancel': 'Atšaukti',
    'photo-capture-retake': 'Pakartokti',
    'photo-capture-snap': 'Užfiksuoti',

    'project-description-close': 'Uždaryti',

    'project-management-add': 'Pridėti',
    'project-management-cancel': 'Atšaukti',
    'project-management-description': 'projekto aprašymas',
    'project-management-join-project': 'prisijungti prie projekto',
    'project-management-manage': 'Tvarkyti sąrašą',
    'project-management-mobile-set-up': 'mobili konfigūracija',
    'project-management-remove': 'Ištrinti',
    'project-management-sign-out': 'atsijungti',
    'project-management-sign-out-are-you-sure': 'Ar tikrai norite išsiregistruoti iš serverio?',
    'project-management-withdraw-request': 'atšaukti savo narystės prašymą',

    'qr-scanner-cancel': 'Atšaukti',
    'qr-scanner-code-found': 'Rasta QR kodas',
    'qr-scanner-code-invalid': 'Klaidinga QR kodas',
    'qr-scanner-code-used': 'Pasenęs QR kodas',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} dodał tego posta do issue-trackera`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} głosował`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował tę gałąź`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował to zgłoszenie`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował to połączenie`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował tę prośbę o połączenie`;
    },
    'reaction-$name-commented-on-push': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował zmiany w tym wgrywaniu`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} skomentował ten tag`;
    },
    'reaction-$name-completed-a-task': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} wykonał zadanie`;
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
    'reaction-status-storage-pending': 'Laukiamas',
    'reaction-status-transcoding': 'Perkodavimas',
    'reaction-status-uploading': 'Przesyłanie',

    'role-filter-no-roles': 'Nėra vaidmenų',

    'search-bar-keywords': 'Raktiniai žodžiai arba #hashtags',

    'selection-cancel': 'Atšaukti',
    'selection-ok': 'OK',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-development': 'Programuotojo parinktys',
    'settings-device': 'Mobilusis prietaisas',
    'settings-devices': 'Mobilieji prietaisai',
    'settings-language': 'Kalba',
    'settings-mobile-alert': 'Mobiliojo prietaiso įspėjimas',
    'settings-notification': 'Pranešimas',
    'settings-profile-image': 'Profilio nuotrauka',
    'settings-projects': 'Projektai',
    'settings-social-networks': 'Socialiniai tinklai',
    'settings-user-information': 'Asmeninė informacija',
    'settings-web-alert': 'Naršyklės įspėjimas',

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
    'start-welcome': 'Sveiki!',
    'start-welcome-again': 'Sveiki vėl',

    'statistics-bar': 'Juostos',
    'statistics-line': 'Linijos',
    'statistics-pie': 'Pjovimo',

    'story-$count-reactions': (count) => {
        return cardinal(count, '1 atsakymas', '2 atsakymai', '10 atsakymų');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzył gałąź „${branch}” w projektcie „${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzył kamień milowy „${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzył stronę wiki „${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Stworzył projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        let e = pastTenseEnding(name, 3);
        return `Stworzył tag „${tag}” w projektcie „${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        return `Usunął stronę wiki „${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        let text = `Usunął projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Zaimportował projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Dołączył do projektu`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Opuścił projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        let text = `Scalił zmiany`;
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
        let text = `Napisał zgłoszenie błędu #${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name, 3);
        let a = (e === 'ła') ? 'ę' : 'ą';
        let text = `Wypchnął zmiany gałęzi „${branch}”`;
        if (repo) {
            text += ` projektu „${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        let e = pastTenseEnding(name, 3);
        return `Poprosił o scalanie zmian z gałęzi „${branch1}” do gałęzi „${branch2}”`;
    },
    'story-$name-updated-$page': (name, page) => {
        let e = pastTenseEnding(name, 3);
        return `Redagował wiki page „${page}”`;
    },
    'story-add-coauthor': 'Dodaj współautora',
    'story-add-remove-coauthor': 'Dodaj/Usuń współautora',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return cardinal(count, 'inna osoba', 'inne osoby', 'innych osób');
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` ir `, name2 ];
    },
    'story-cancel': 'Atšaukti',
    'story-cancel-are-you-sure': 'Ar tikrai norite mesti šį postą?',
    'story-cancel-edit-are-you-sure': 'Ar tikrai norite atsisakyti savo pakeitimų?',
    'story-coauthors': 'Bendraautoriai',
    'story-comment': 'Komentuoti',
    'story-drop-files-here': 'Vilkite ir upuść medijos failus čia',
    'story-file': 'Failas',
    'story-issue-current-status': 'Dabartinis statusas:',
    'story-issue-status-closed': 'Uždaras',
    'story-issue-status-opened': 'Atviras',
    'story-issue-status-reopened': 'Atviras vėl',
    'story-like': 'Patinka',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Terminas:',
    'story-milestone-start-date': 'Pradžios data:',
    'story-options': 'Galimybės',
    'story-paste-image-here': 'Vaizdas įklijamas į teksto redaktorių taip pat bus čia',
    'story-pending': 'Laukiamas...',
    'story-photo': 'Nuotrauka',
    'story-post': 'Paskelbti',
    'story-push-added-$count-files': (count) => {
        return cardinal(count, '1 pridėtas failas', '2 pridėtus failus', '10 pridėtų failų');
    },
    'story-push-added-$count-lines': (count) => {
        return cardinal(count, '1 pridėtas eilutė', '2 pridėtos eilutės', '10 pridėtų eilučių');
    },
    'story-push-components-changed': 'Šios dalys buvo pakeistos:',
    'story-push-deleted-$count-files': (count) => {
        return cardinal(count, '1 ištrintas failas', '2 ištrintus failus', '10 ištrintų failų');
    },
    'story-push-deleted-$count-lines': (count) => {
        return cardinal(count, '1 ištrintas eilutė', '2 ištrintos eilutės', '10 ištrintų eilučių');
    },
    'story-push-modified-$count-files': (count) => {
        return cardinal(count, '1 modifikuotas failas', '2 modifikuotus failus', '10 modifikuotų failų');
    },
    'story-push-modified-$count-lines': (count) => {
        return cardinal(count, '1 modifikuotas eilutė', '2 modifikuotos eilutės', '10 modifikuotų eilučių');
    },
    'story-push-renamed-$count-files': (count) => {
        return cardinal(count, '1 pervadintas failas', '2 pervadintus failus', '10 pervadinttų failų');
    },
    'story-remove-yourself': 'Pašalinti save',
    'story-remove-yourself-are-you-sure': 'Ar tikrai norite pašalinti save kaip bendraautorį?',
    'story-status-storage-pending': 'Laukiamas',
    'story-status-transcoding-$progress': (progress) => {
        return `Perkodavimas (${progress}%)`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `Siuntimas (${progress}%)`;
    },
    'story-survey': 'Anketa',
    'story-task-list': 'Užduočių sąrašas',
    'story-video': 'Video',
    'story-vote-submit': 'Pateikti',

    'telephone-dialog-close': 'Uždaryti',

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'dieną', '2 dienas', '10 dienų');
        return `Prieš ${time}`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'valandą', '2 valandas', '10 valandų');
        return `Prieš ${time}`;
    },
    'time-$hr-ago': (hr) => {
        return `Prieš ${hr} val`;
    },
    'time-$min-ago': (min) => {
        return `Prieš ${min} min`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'minutę', '2 minutes', '10 minučių');
        return `Prieš ${time}`;
    },
    'time-just-now': 'Dabar',
    'time-yesterday': 'Vakar',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 failą', '2 failus', '10 failų');
        return `Siuntimas ${files}, likę ${size}`;
    },

    'user-actions': 'Veiksmai',

    'user-activity-$name-created-branch': 'Sukūrė naują šaką',
    'user-activity-$name-created-merge-request': 'Sukūrė prašymą sujungti pakeitimus',
    'user-activity-$name-created-milestone': 'Sukūrė etapą',
    'user-activity-$name-created-repo': 'Sukūrė git projektą',
    'user-activity-$name-created-tag': 'Sukūrė naują žymą',
    'user-activity-$name-deleted-repo': 'Pašalino git projektą',
    'user-activity-$name-edited-wiki-page': 'Redagavo wiki puslapį',
    'user-activity-$name-imported-repo': 'Importavo git projektą',
    'user-activity-$name-joined-repo': 'Prisijungė prie git projekto',
    'user-activity-$name-left-repo': 'Paliko git projektą',
    'user-activity-$name-merged-code': 'Padarė pakeitimų sujungimą',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'audio klipą', '2 audio klipus', '10 audio klipų');
        return `Pasiuntė ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = (count === 1) ? `nuorodą` : `nuorodas`;
        let website = cardinal(count, 'svetainę', '2 svetaines', '10 svetainių');
        return `Jis atsiuntė ${links} į ${website}`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'nuotrauką', '2 nuotraukas', '10 nuotraukų');
        return `Pasiuntė ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'video klipą', '2 video klipus', '10 video klipų');
        return `Pasiuntė ${videos}`;
    },
    'user-activity-$name-pushed-code': 'Atsiuntė kodą į saugyklą',
    'user-activity-$name-reported-issue': 'Pranešė klaidą',
    'user-activity-$name-started-survey': 'Sukūrė anketą',
    'user-activity-$name-started-task-list': 'Sukūrė užduočių sąrašą',
    'user-activity-$name-wrote-post': 'Parašė įrašą',
    'user-activity-back': 'Atgal',
    'user-activity-more': 'Daugiau',

    'user-image-adjust': 'Dostosuj',
    'user-image-cancel': 'Atšaukti',
    'user-image-replace': 'Pakeisti',
    'user-image-save': 'Išsaugoti',
    'user-image-select': 'Pasirinkti',
    'user-image-snap': 'Fotografuoti',

    'user-info-email': 'E-pašto adresas',
    'user-info-gender': 'Seksas',
    'user-info-gender-female': 'Moteris',
    'user-info-gender-male': 'Vyras',
    'user-info-gender-unspecified': 'Nepatikslintas',
    'user-info-name': 'Vardas ir pavardė',
    'user-info-phone': 'Telefono numeris',

    'user-statistics-legend-branch': 'Naujos šakos',
    'user-statistics-legend-issue': 'Klaidos ataskaitos',
    'user-statistics-legend-member': 'Narystės pakeitimai',
    'user-statistics-legend-merge': 'Pakeitimų sujungimai',
    'user-statistics-legend-merge-request': 'Prašymai sujungti',
    'user-statistics-legend-milestone': 'Etapai',
    'user-statistics-legend-post': 'Įrašai',
    'user-statistics-legend-push': 'Pakeitimų siuntimai',
    'user-statistics-legend-repo': 'Saugyklos pakeitimai',
    'user-statistics-legend-survey': 'Anketos',
    'user-statistics-legend-tag': 'Naujos žymos',
    'user-statistics-legend-task-list': 'Užduočių sąrašai',
    'user-statistics-legend-wiki': 'Wiki redagavimai',
    'user-statistics-today': 'Šiandien',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 šaka', '2 šakos', '10 šakų');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 klaidos ataskaita', '2 klaidos ataskaitos', '10 klaidos ataskaitų');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 narystės pakeitimas', '2 narystės pakeitimai', '10 narystės pakeitimų');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 pakeitimų sujungimas', '2 pakeitimų sujungimai', '10 pakeitimų sujungimų');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 prašymas sujungti', '2 prašymai sujungti', '10 prašymų sujungti');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 etapas', '2 etapai', '10 etapų');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 įrašas', '2 įrašai', '10 įrašų');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 pakeitimų siuntimas', '2 pakeitimų siuntimai', '10 pakeitimų siuntimų');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 saugyklos pakeitimas', '2 saugyklos pakeitimai', '10 saugyklos pakeitimų');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 anketos', '10 anketų');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 žyma', '2 žymos', '10 žymų');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 užduočių sąrašas', '2 užduočių sąrašai', '10 užduočių sąrašų');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki redagavimas', '2 wiki redagavimai', '10 wiki redagavimų');
    },

    'video-capture-accept': 'Priimti',
    'video-capture-cancel': 'Atšaukti',
    'video-capture-pause': 'Pauzė',
    'video-capture-resume': 'Tęsti',
    'video-capture-retake': 'Įrašyti iš naujo',
    'video-capture-start': 'Pradėti',
    'video-capture-stop': 'Sustabdyti',

    'warning-no-connection': 'Nėra greito atnaujinimo',
};

export {
    phrases,
};
