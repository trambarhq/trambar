import 'moment/locale/cs';
import {
    cardinal,
    list,
    genderize,
    pastTenseEnding
} from 'locale/grammars/czech';

let phrases = {
    'action-contact-by-email': 'Kontaktovat e-mailem',
    'action-contact-by-ichat': 'Kontaktovat přes iChat',
    'action-contact-by-phone': 'Kontaktovat telefonem',
    'action-contact-by-skype': 'Kontaktovat přes Skype',
    'action-contact-by-slack': 'Kontaktovat přes Slack',
    'action-contact-by-twitter': 'Kontaktovat přes Twitter',
    'action-view-github-page': 'Zobrazit stránku GitHub',
    'action-view-gitlab-page': 'Zobrazit stránku GitLab',
    'action-view-linkedin-page': 'Zobrazit stránku LinkedIn',
    'action-view-stackoverflow-page': 'Zobrazit stránku Stack Overflow',

    'activation-address': 'Adresa serveru',
    'activation-cancel': 'Zrušit',
    'activation-code': 'Aktivační kód',
    'activation-ok': 'OK',
    'activation-schema': 'Projekt',

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, '1 nová záložka', '2 nové záložky', '5 nových záložek');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 nové oznámení', '2 nová oznámení', '5 nových oznámení');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 nový příběh', '2 nové příběhy', '5 nových příběhů');
    },

    'app-component-close': 'Zavřít',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Akceptovat',
    'audio-capture-cancel': 'Zrušit',
    'audio-capture-pause': 'Prodlévat',
    'audio-capture-rerecord': 'Nahrát znovu',
    'audio-capture-resume': 'Pokračovat',
    'audio-capture-start': 'Začít',
    'audio-capture-stop': 'Zastavit',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, '1 další uživatel', '2 další uživatelé', '5 dalších uživatelů');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 uživatel', '2 uživatelé', '5 uživatelů');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} to doporučuje`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` a `, name2, ` to doporučují` ];
    },
    'bookmark-$you-bookmarked-it': 'Přidali jste záložku k tomuto',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Přidali jste záložku k tomuto (a ${name} to doporučuje)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
        return [ `Přidali jste záložku k tomuto (a `, others, ` to doporučují)` ];
    },
    'bookmark-recommendations': 'Doporučení',

    'bookmarks-no-bookmarks': 'Žádné záložky',

    'bottom-nav-bookmarks': 'Záložky',
    'bottom-nav-news': 'Zprávy',
    'bottom-nav-notifications': 'Oznámení',
    'bottom-nav-people': 'Lidé',
    'bottom-nav-settings': 'Nastavení',

    'confirmation-cancel': 'Zrušit',
    'confirmation-confirm': 'Potvrdit',

    'development-code-push-$deployment': (deployment) => {
        return `Stáhnout aktualizaci kódu od "${deployment}"`;
    },
    'development-show-diagnostics': 'Zobrazit diagnostiku',
    'development-show-panel': 'Zobrazit tento panel',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Zadní',
    'device-selector-camera-front': 'Přední',
    'device-selector-mic-$number': (number) => {
        return `Mikrofon ${number}`;
    },

    'empty-currently-offline': 'Momentálně jste offline',

    'image-editor-page-rendering-in-progress': 'Vykreslení náhledu webové stránky...',
    'image-editor-poster-extraction-in-progress': 'Extrahování náhledu z videa...',
    'image-editor-upload-in-progress': 'Nahrávání probíhá...',

    'issue-cancel': 'Zrušit',
    'issue-delete': 'Vymazat',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        if (photos > 0) {
            objects.push(cardinal(photos, 'obrázek', 'obrázky'));
        }
        if (videos > 0) {
            objects.push(cardinal(videos, 'videoklip', 'videoklipy'));
        }
        if (audios > 0) {
            objects.push(cardinal(audios, 'audioklip', 'audioklipy'));
        }
        let l = pastTenseEnding(names, names.length > 1);
        return `${list(names)} posíla${l} následující ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        let l = pastTenseEnding(names, names.length > 1);
        return `${list(names)} napsa${l}:`;
    },
    'issue-ok': 'OK',
    'issue-repo': 'Úložiště',
    'issue-title': 'Titul',

    'list-$count-more': (count) => {
        return `${count} více...`;
    },

    'media-close': 'Zavřít',
    'media-download-original': 'Stáhnout originál',
    'media-editor-embed': 'Vložit',
    'media-editor-remove': 'Odebrat',
    'media-editor-shift': 'Posunout',
    'media-next': 'Další',
    'media-previous': 'Předchozí',

    'membership-request-$you-are-member': 'Jste členem tohoto projektu',
    'membership-request-$you-are-now-member': 'Nyní jste členem tohoto projektu',
    'membership-request-$you-have-requested-membership': 'Požádali jste o členství v tomto projektu',
    'membership-request-browse': 'Prohlížet',
    'membership-request-cancel': 'Zrušit',
    'membership-request-join': 'Připojit se',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Pokračovat',
    'membership-request-withdraw': 'Odvolat',

    'mobile-device-revoke': 'Zrušit',
    'mobile-device-revoke-are-you-sure': 'Opravdu chcete zrušit autorizaci tohoto zařízení?',

    'mobile-setup-address': 'Adresa serveru',
    'mobile-setup-close': 'Zavřít',
    'mobile-setup-code': 'Autorizační kód',
    'mobile-setup-project': 'Projekt',

    'news-no-stories-by-role': 'Žádné příběhy od někoho s touto rolí',
    'news-no-stories-found': 'Nebyly nalezeny žádné odpovídající příběhy',
    'news-no-stories-on-date': 'Žádné příběhy k tomuto datu',
    'news-no-stories-yet': 'Zatím žádné příběhy',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} vás pozval, abyste společně upravili příspěvek`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} přidal váš příspěvek na bugtracker`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'vaší anketě'; break;
            case 'task-list': story = 'váš seznam úkolů.'; break;
            case 'post': story = 'váš příspěvek.'; break;
            default: story = 'váš příběh';
        }
        let l = pastTenseEnding(name);
        return `${name} komentova${l} ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        let l = pastTenseEnding(name);
        return `${name} dokonči${l} úkol na vašem seznamu`;
    },
    'notification-$name-is-assigned-to-your-issue': (name) => {
        let l = pastTenseEnding(name);
        return `${name} je přidělen${l} do vašeho problému`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'vaše ankety'; break;
            case 'task-list': story = 'vašeho seznamu úkolů'; break;
            case 'post': story = 'vašeho příspěvku'; break;
            default: story = 'vašeho příběhu';
        }
        let l = pastTenseEnding(name);
        return `${name} má rád ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'komentáři';
        let l = pastTenseEnding(name);
        return `${name} zmíni${l} se o vás v ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketě'; break;
            case 'task-list': story = 'seznamu úkolů'; break;
            case 'post': story = 'příspěvku'; break;
            case 'issue': story = 'problému'; break;
            case 'merge-request': story = 'žádosti o sloučení'; break;
            default: story = 'příběhu';
        }
        let l = pastTenseEnding(name);
        return `${name} zmíni${l} se o vás v ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        let l = pastTenseEnding(name);
        return `${name} slouči${l} změny do větve „${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        let l = pastTenseEnding(name);
        return `${name} otevře${l} problém`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'vaš commit'; break;
            case 'issue': story = 'vaš problém'; break;
            case 'merge-request': story = 'vaši žádost o sloučení'; break;
        }
        let l = pastTenseEnding(name);
        return `${name} komentova${l} ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        let l = pastTenseEnding(name);
        return `${name} zveřejni${l} anketu`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        let l = pastTenseEnding(name);
        return `${name} posunova${l} změny do větve „${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        let l = pastTenseEnding(name);
        return `${name} požáda${l} o vstup do tohoto projektu`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketě'; break;
            case 'task-list': story = 'seznamu úkolů'; break;
            case 'post': story = 'příspěvku'; break;
            default: story = 'příběhu';
        }
        let l = pastTenseEnding(name);
        return `${name} posla${l} vám záložku k ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        let l = pastTenseEnding(name);
        return `${name} odpovědě${l} na vaši anketu`;
    },
    'notification-option-assignment': 'Když je k vašemu problému přiřazen někdo',
    'notification-option-bookmark': 'Když vám někdo pošle záložku',
    'notification-option-coauthor': 'Když vás někdo zve ke společnému úpravě příspěvku',
    'notification-option-comment': 'Když někdo komentuje vaš příběh',
    'notification-option-issue': 'Když někdo otevře problém',
    'notification-option-join-request': 'Když se chce někdo připojit k tomuto projektu',
    'notification-option-like': 'Když se někomu váš příběh líbí',
    'notification-option-mention': 'Když vás někdo zmiňuje v příběhu nebo v komentářích',
    'notification-option-merge': 'Když někdo sloučí kód do větve „master”',
    'notification-option-note': 'Když někdo komentoval commit nebo problém',
    'notification-option-push': 'Když někdo posune kód do repozitáře',
    'notification-option-survey': 'Když někdo zveřejní anketu',
    'notification-option-task-completion': 'Když někdo dokončí úkol v vaší seznamu',
    'notification-option-vote': 'Když někdo odpoví vaše ankety',
    'notification-option-web-session': 'Když je aktivní webová relace',

    'notifications-no-notifications-on-date': 'V tento den nebyly žádné oznámení',
    'notifications-no-notifications-yet': 'Zatím žádné oznámení',

    'option-add-bookmark': 'Přidat záložku',
    'option-add-issue': 'Přidat příspěvek na bugtracker',
    'option-bump-story': 'Povýšit příběh',
    'option-edit-comment': 'Upravit komentář',
    'option-edit-post': 'Upravit příspěvek',
    'option-hide-comment': 'Skrýt komentář od hostů',
    'option-hide-story': 'Skrýt příběh od hostů',
    'option-keep-bookmark': 'Uložit záložku',
    'option-remove-comment': 'Odstranit komentář',
    'option-remove-story': 'Odstranit příběh',
    'option-send-bookmarks': 'Poslat záložky ostatním uživatelům',
    'option-send-bookmarks-to-$count-users': (count) => {
        let users = cardinal(count, '1 uživateli', '2 uživatelům');
        let bookmarks = cardinal(count, 'záložku', 'záložky');
        return `Poslat ${bookmarks} ${users}`;
    },
    'option-show-media-preview': 'Zobrazit připojené média',
    'option-show-text-preview': 'Zobrazit náhled textu',
    'option-statistics-14-days': 'Zobrazit aktivity za posledních 14 dní',
    'option-statistics-biweekly': 'Zobrazit dvoutýdenní aktivity',
    'option-statistics-monthly': 'Zobrazit měsíční aktivity',
    'option-statistics-to-date': 'Zobrazit aktivity k datu',

    'people-no-stories-found': 'Nebyly nalezeny žádné odpovídající příběhy',
    'people-no-stories-on-date': 'Žádné aktivity k tomuto datu',
    'people-no-users-by-role': 'Žádný člen projektu nemá tuto roli',
    'people-no-users-yet': 'Žádní členové projektu ještě nejsou',

    'person-no-stories-found': 'Nebyly nalezeny žádné odpovídající příběhy',
    'person-no-stories-on-date': 'Žádné příběhy k tomuto datu',
    'person-no-stories-yet': 'Zatím žádné příběhy',

    'photo-capture-accept': 'Akceptovat',
    'photo-capture-cancel': 'Zrušit',
    'photo-capture-retake': 'Vyfotit znovu',
    'photo-capture-snap': 'Vyfotit',

    'project-description-close': 'Zavřít',

    'project-management-add': 'Přidat',
    'project-management-cancel': 'Zrušit',
    'project-management-description': 'popis projektu',
    'project-management-join-project': 'připojit se k projektu',
    'project-management-manage': 'Spravovat seznam',
    'project-management-mobile-set-up': 'mobilní nastavení',
    'project-management-remove': 'Odstranit',
    'project-management-sign-out': 'odhlásit se',
    'project-management-sign-out-are-you-sure': 'Opravdu se chcete odhlásit z tohoto serveru?',
    'project-management-withdraw-request': 'odebrat žádost o členství',

    'qr-scanner-cancel': 'Zrušit',
    'qr-scanner-code-found': 'QR kód nalezený',
    'qr-scanner-code-invalid': 'Neplatný kód QR',
    'qr-scanner-code-used': 'Zastaralý QR kód',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        let l = pastTenseEnding(name);
        return `${name} přida${l} tento příspěvek na bugtracker`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        let l = pastTenseEnding(name);
        return `${name} hlasova${l}`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} tuto větev`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} tento problém`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} toto sloučení kódu`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} tuto žádost o sloučení`;
    },
    'reaction-$name-commented-on-push': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} tento přesun`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        let l = pastTenseEnding(name);
        return `${name} komentova${l} tento tag`;
    },
    'reaction-$name-completed-a-task': (name) => {
        let l = pastTenseEnding(name);
        let e = l.substr(1);
        return `${name} by${l} dokončen${e} úkol`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        let l = pastTenseEnding(name);
        let e = l.substr(1);
        return `${name} by${l} přidělen${e} tomuto problému`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        let l = pastTenseEnding(name);
        let e = l.substr(1);
        return `${name} by${l} přidělen${e} této žádosti o sloučení`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} upravuje komentář...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} posílá komentář...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} píše komentář...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} líbí to`;
    },
    'reaction-status-storage-pending': 'Čekající',
    'reaction-status-transcoding': 'Překódování',
    'reaction-status-uploading': 'Nahrávání',

    'role-filter-no-roles': 'Žádné role nejsou definovány',

    'search-bar-keywords': 'klíčová slova or #hashtagy',

    'selection-cancel': 'Zrušit',
    'selection-ok': 'OK',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-development': 'Vývojářské možnosti',
    'settings-device': 'Mobilní zařízení',
    'settings-devices': 'Mobilní zařízení',
    'settings-language': 'Jazyk',
    'settings-mobile-alert': 'Mobilní upozornění',
    'settings-notification': 'Oznámení',
    'settings-profile-image': 'Profilový obrázek',
    'settings-projects': 'Projekty',
    'settings-social-networks': 'Sociální sítě',
    'settings-user-information': 'Uživatelské informace',
    'settings-web-alert': 'Webové upozornění',

    'social-network-github': 'URL profilu GitHub',
    'social-network-gitlab': 'URL profilu GitLab',
    'social-network-ichat': 'Uživatelské jméno iChat',
    'social-network-linkedin': 'URL profilu Linkedin',
    'social-network-skype': 'Uživatelské jméno Skype',
    'social-network-slack': 'Uživatelské ID Slack',
    'social-network-slack-team': 'ID týmu Slack',
    'social-network-stackoverflow': 'URL profilu Stack Overflow',
    'social-network-twitter': 'Uživatelské jméno Twitter',

    'start-activation-add-server': 'Přidat projekt z jiného serveru',
    'start-activation-instructions': (ui) => {
        return [
            'Chcete-li získat přístup k serveru Trambar v tomto zařízení, nejprve se přihlaste k serveru pomocí webového prohlížeče. Vyberte projekt a přejděte na stránku',
            ui.settings,
            '. V panelu ',
            ui.projects,
            ' klepněte na tlačítko',
            ui.mobileSetup,
            '. Na obrazovce se zobrazí kód QR. Pak na tomto zařízení stiskněte tlačítko níže a skenujte kód. Alternativně můžete ručně zadat aktivační kód.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Přihlaste se pomocí webového prohlížeče a poté naskenujte QR kód zobrazený v stránce ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Ruční zadání',
    'start-activation-new-server': 'Nový server',
    'start-activation-others-servers': 'Dostupné servery',
    'start-activation-return': 'Vrátit se',
    'start-activation-scan-code': 'Naskenovat QR kód',
    'start-error-access-denied': 'Žádost o přístup byla zamítnuta',
    'start-error-account-disabled': 'Účet je momentálně vypnutý',
    'start-error-existing-users-only': 'Do tohoto systému mohou přistupovat pouze oprávnění pracovníci',
    'start-error-undefined': 'Neočekávaná chyba',
    'start-no-projects': 'Žádné projekty',
    'start-no-servers': 'Žádní poskytovatelé OAuth',
    'start-projects': 'Projekty',
    'start-social-login': 'Sociální přihlášení',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Vítejte!',
    'start-welcome-again': 'Vítejte znovu',

    'statistics-bar': 'Sloupcový',
    'statistics-line': 'Čárový',
    'statistics-pie': 'Koláčový',

    'story-$count-reactions': (count) => {
        return cardinal(count, '1 reakce', '2 reakcí', '5 reakcí');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        let l = pastTenseEnding(name);
        return `Stvoři${l} větve „${branch}” v projektu „${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} milník „${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} wiki stránku „${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let l = pastTenseEnding(name);
        let text = `Vytvoři${l} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        let l = pastTenseEnding(name);
        return `Stvoři${l} tag „${tag}” v projektu „${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        let l = pastTenseEnding(name);
        return `Smaza${l} stránku wiki „${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let l = pastTenseEnding(name);
        let text = `Smaza${l} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let l = pastTenseEnding(name);
        let text = `Importova${l} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let l = pastTenseEnding(name);
        let text = `Vstoupi${l} Do projektu`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let l = pastTenseEnding(name);
        let text = `Opusti${l} projekt`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let l = pastTenseEnding(name);
        let text = `Slouči${l} změny`;
        if (branches && branches.length > 0) {
            let sources = branches.map((branch) => {
                return `„${branch}”`;
            });
            text += cardinal(sources.length, ' z větve', ' z větví');
            text += sources.join(', ');
        }
        text += ` do větve „${branch}”`;
        if (repo) {
            text += ` projektu „${repo}”`;
        }
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        let l = pastTenseEnding(name);
        let text = `Otevře${l} problém ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let l = pastTenseEnding(name);
        let text = `Posunova${l} změny do větve „${branch}”`;
        if (repo) {
            text += ` projektu „${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        let l = pastTenseEnding(name);
        return `Požádal sloučit větve „${branch1}” do větve „${branch2}”.`;
    },
    'story-$name-updated-$page': (name, page) => {
        let l = pastTenseEnding(name);
        return `Aktualizova${l} stránku wiki „${page}”`;
    },
    'story-add-coauthor': 'Přidat spoluautora',
    'story-add-remove-coauthor': 'Přidat/Odebrat spoluautora',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return cardinal(count, '1 další', '2 další', '5 dalších');
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` a `, name2 ] ;
    },
    'story-cancel': 'Zrušit',
    'story-cancel-are-you-sure': 'Opravdu chcete tento příspěvek opustit?',
    'story-cancel-edit-are-you-sure': 'Opravdu chcete opustit změny, které jste provedli?',
    'story-coauthors': 'Spoluautoři',
    'story-comment': 'Komentář',
    'story-drop-files-here': 'Zde přetáhněte soubory médií',
    'story-file': 'Soubor',
    'story-issue-current-status': 'Aktuální stav:',
    'story-issue-status-closed': 'Uzavřený',
    'story-issue-status-merged': 'Sloučeny',
    'story-issue-status-opened': 'Otevřený',
    'story-issue-status-reopened': 'Otevřený znovu',
    'story-like': 'To se mi líbí',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Datum splatnosti:',
    'story-milestone-start-date': 'Datum zahájení:',
    'story-options': 'Možnosti',
    'story-paste-image-here': 'Vložený obrázek do textového editoru skončí také zde',
    'story-pending': 'Čekající...',
    'story-photo': 'Foto',
    'story-post': 'Přidat',
    'story-push-added-$count-files': (count) => {
        let files = cardinal(count, '1 soubor', '2 soubory', '5 souborů');
        return `${files} přidáno`;
    },
    'story-push-added-$count-lines': (count) => {
        let lines = cardinal(count, '1 řádek', '2 řádky', '5 řádků');
        return `${lines} přidáno`;
    },
    'story-push-components-changed': 'Byly změněny následující části:',
    'story-push-deleted-$count-files': (count) => {
        let files = cardinal(count, '1 soubor', '2 soubory', '5 souborů');
        return `${files} smazáno`;
    },
    'story-push-deleted-$count-lines': (count) => {
        let lines = cardinal(count, '1 řádek', '2 řádky', '5 řádků');
        return `${lines} smazáno`;
    },
    'story-push-modified-$count-files': (count) => {
        let files = cardinal(count, '1 soubor', '2 soubory', '5 souborů');
        return `${files} modifikovano`;
    },
    'story-push-modified-$count-lines': (count) => {
        let lines = cardinal(count, '1 řádek', '2 řádky', '5 řádků');
        return `${lines} modifikovano`;
    },
    'story-push-renamed-$count-files': (count) => {
        let files = cardinal(count, '1 soubor', '2 soubory', '5 souborů');
        return `${files} přejmenováno`;
    },
    'story-remove-yourself': 'Odebrat sami sebe',
    'story-remove-yourself-are-you-sure': 'Opravdu chcete odebrat sami sebe jako spoluautora?',
    'story-status-storage-pending': 'Čekající',
    'story-status-transcoding-$progress': (progress) => {
        return `Překódování (${progress}%)`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `Nahrávání (${progress}%)`;
    },
    'story-survey': 'Anketa',
    'story-task-list': 'Seznam úkolů',
    'story-video': 'Video',
    'story-vote-submit': 'Předložit',

    'telephone-dialog-close': 'Zavřít',

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'den', '2 dny');
        return `Před ${time}`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'hodinou', '2 hodinami');
        return `Před ${time}`;
    },
    'time-$hr-ago': (hr) => {
        return `Před ${hr} hod`;
    },
    'time-$min-ago': (min) => {
        return `Před ${min} min`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'minutou', '2 minutami');
        return `Před ${time}`;
    },
    'time-just-now': 'Právě teď',
    'time-yesterday': 'Včera',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 souboru', '2 souborů');
        return `Nahrávání ${files}, zbývá ${size}`;
    },

    'user-actions': 'Akce',

    'user-activity-$name-created-branch': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} větev`;
    },
    'user-activity-$name-created-merge-request': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} žádost o sloučení`;
    },
    'user-activity-$name-created-milestone': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} milník.`;
    },
    'user-activity-$name-created-repo': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} projekt git.`;
    },
    'user-activity-$name-created-tag': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} tag`;
    },
    'user-activity-$name-deleted-repo': (name) => {
        let l = pastTenseEnding(name);
        return `Smaza${l} projekt git`;
    },
    'user-activity-$name-edited-wiki-page': (name) => {
        let l = pastTenseEnding(name);
        return `Upravi${l} stránku wiki`;
    },
    'user-activity-$name-imported-repo': (name) => {
        let l = pastTenseEnding(name);
        return `Importova${l} projekt git`;
    },
    'user-activity-$name-joined-repo': (name) => {
        let l = pastTenseEnding(name);
        return `Připoji${l} se k projektu git`;
    },
    'user-activity-$name-left-repo': (name) => {
        let l = pastTenseEnding(name);
        return `Opusti${l} projekt git`;
    },
    'user-activity-$name-merged-code': (name) => {
        let l = pastTenseEnding(name);
        return `Proved${l} sloučení kódu.`;
    },
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'audioklip', '2 audioklipy', '5 audioklipů');
        let l = pastTenseEnding(name);
        return `Zveřejni${l} ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, 'odkaz', 'odkazy');
        let website = cardinal(count, 'webovou stránku', '2 webové stránky', '5 webových stránek');
        let l = pastTenseEnding(name);
        return `Posla${l} ${links} na ${website}`
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'obrázek', '2 obrázky', '5 obrázků');
        let l = pastTenseEnding(name);
        return `Zveřejni${l} ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'videoklip', '2 videoklipy', '5 videoklipů');
        let l = pastTenseEnding(name);
        return `Zveřejni${l} ${videos}`;
    },
    'user-activity-$name-pushed-code': (name) => {
        let l = pastTenseEnding(name);
        return `Posunova${l} změny do repozitáře`;
    },
    'user-activity-$name-reported-issue': (name) => {
        let l = pastTenseEnding(name);
        return `Ohlási${l} problém`;
    },
    'user-activity-$name-started-survey': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} anketu`;
    },
    'user-activity-$name-started-task-list': (name) => {
        let l = pastTenseEnding(name);
        return `Vytvoři${l} seznam úkolů`;
    },
    'user-activity-$name-wrote-post': (name) => {
        let l = pastTenseEnding(name);
        return `Napsa${l} příspěvek`;
    },
    'user-activity-back': 'Dozadu',
    'user-activity-more': 'Více',

    'user-image-adjust': 'Upravit',
    'user-image-cancel': 'Zrušit',
    'user-image-replace': 'Nahradit',
    'user-image-save': 'Uložit',
    'user-image-select': 'Vybrat',
    'user-image-snap': 'Vyfotit',

    'user-info-email': 'Emailová adresa',
    'user-info-gender': 'Pohlaví',
    'user-info-gender-female': 'Žena',
    'user-info-gender-male': 'Muž',
    'user-info-gender-unspecified': 'Nespecifikovaný',
    'user-info-name': 'Jméno',
    'user-info-phone': 'Telefonní číslo',

    'user-statistics-legend-branch': 'Nové větve',
    'user-statistics-legend-issue': 'Problémy',
    'user-statistics-legend-member': 'Změny členství',
    'user-statistics-legend-merge': 'Sloučení kódu',
    'user-statistics-legend-merge-request': 'Žádosti o sloučení',
    'user-statistics-legend-milestone': 'Milníky',
    'user-statistics-legend-post': 'Příspěvky',
    'user-statistics-legend-push': 'Přesuny',
    'user-statistics-legend-repo': 'Změny repozitářů',
    'user-statistics-legend-survey': 'Ankety',
    'user-statistics-legend-tag': 'Nové tagy',
    'user-statistics-legend-task-list': 'Seznamy úkolů',
    'user-statistics-legend-wiki': 'Úpravy wiki',
    'user-statistics-today': 'Dnes',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 větev', '2 větve', '5 větví');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 problém', '2 problémy', '5 problémů');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 změna členství', '2 změny členství', '5 změn členství');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 sloučení', '2 sloučení', '5 sloučeních');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 žádost o sloučení', '2 žádosti o sloučení', '5 žádostí o sloučení');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 milník', '2 milníky', '5 milníků');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 příspěvek', '2 příspěvky', '5 příspěvků');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 přesun', '2 přesune', '5 přesunů');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 změna repozitáře', '2 změny repozitářů', '5 změn repozitářů');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 ankety', '5 anket');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tag', '2 tagy', '5 tagů');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 seznam úkolů', '2 seznamy úkolů', '5 seznamů úkolů');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 úprava stránky wiki', '2 úpravy stránek wiki', '5 úprav stránek wiki');
    },

    'video-capture-accept': 'Akceptovat',
    'video-capture-cancel': 'Zrušit',
    'video-capture-pause': 'Prodlévat',
    'video-capture-resume': 'Pokračovat',
    'video-capture-retake': 'Nahrát znovu',
    'video-capture-start': 'Začít',
    'video-capture-stop': 'Zastavit',

    'warning-no-connection': 'Bez okamžité aktualizace',
};

export {
    phrases,
    genderize,
};
