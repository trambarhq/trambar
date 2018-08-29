require('moment/locale/cs');

module.exports = function(localeCode) {
    return {
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
            return (count === 1) ? `1 nová záložka` : `${count} nové záložky`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 nové oznámení` : `${count} nová oznámení`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 nový příběh` : `${count} nové příběhy`;
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
            if (singular(count)) {
                return `1 další uživatel`;
            } else if (plural(count)) {
                return `${count} další uživatelé`;
            } else {
                return `${count} dalších uživatelů`;
            }
        },
        'bookmark-$count-users': (count) => {
            if (singular(count)) {
                return `1 uživatel`;
            } else if (plural(count)) {
                return `${count} uživatelé`;
            } else {
                return `${count} uživatelů`;
            }
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
            var objects = [];
            if (photos > 0) {
                objects.push(photos === 1 ? 'obrázek' : 'obrázky');
            }
            if (videos > 0) {
                objects.push(videos === 1 ? 'videoklip' : 'videoklipy');
            }
            if (audios > 0) {
                objects.push(audios === 1 ? 'audioklip' : 'audioklipy');
            }
            var e = pastTenseEnding(names, names.length > 1);
            return `${list(names)} posíla${e} následující ${list(objects)}:`;
        },
        'issue-export-$names-wrote': (names) => {
            var e = pastTenseEnding(names, names.length > 1);
            return `${list(names)} napsa${e}:`;
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
            var e = pastTenseEnding(name);
            return `${name} komentova${e} ${story}`;
        },
        'notification-$name-completed-task': (name) => {
            var e = pastTenseEnding(name);
            return `${name} dokonči${e} úkol na vašem seznamu`;
        },
        'notification-$name-is-assigned-to-your-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} je přidělen${e} do vašeho problému`;
        },
        'notification-$name-likes-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'vaše ankety'; break;
                case 'task-list': story = 'vašeho seznamu úkolů'; break;
                case 'post': story = 'vašeho příspěvku'; break;
                default: story = 'vašeho příběhu';
            }
            var e = pastTenseEnding(name);
            return `${name} má rád ${story}`;
        },
        'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
            reaction = 'komentáři';
            var e = pastTenseEnding(name);
            return `${name} zmíni${e} se o vás v ${reaction}`;
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
            var e = pastTenseEnding(name);
            return `${name} zmíni${e} se o vás v ${story}`;
        },
        'notification-$name-merged-code-to-$branch': (name, branch) => {
            var e = pastTenseEnding(name);
            return `${name} slouči${e} změny do větve „${branch}”`;
        },
        'notification-$name-opened-an-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} otevře${e} problém`;
        },
        'notification-$name-posted-a-note-about-your-$story': (name, story) => {
            switch (story) {
                case 'push': story = 'vaš commit'; break;
                case 'issue': story = 'vaš problém'; break;
                case 'merge-request': story = 'vaši žádost o sloučení'; break;
            }
            var e = pastTenseEnding(name);
            return `${name} komentova${e} ${story}`;
        },
        'notification-$name-posted-a-survey': (name) => {
            var e = pastTenseEnding(name);
            return `${name} zveřejni${e} anketu`;
        },
        'notification-$name-pushed-code-to-$branch': (name, branch) => {
            var e = pastTenseEnding(name);
            return `${name} posunova${e} změny do větve „${branch}”`;
        },
        'notification-$name-requested-to-join': (name) => {
            var e = pastTenseEnding(name);
            return `${name} požáda${e} o vstup do tohoto projektu`;
        },
        'notification-$name-sent-bookmark-to-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'anketě'; break;
                case 'task-list': story = 'seznamu úkolů'; break;
                case 'post': story = 'příspěvku'; break;
                default: story = 'příběhu';
            }
            var e = pastTenseEnding(name);
            return `${name} posla${e} vám záložku k ${story}`;
        },
        'notification-$name-voted-in-your-survey': (name) => {
            var e = pastTenseEnding(name);
            return `${name} odpovědě${e} na vaši anketu`;
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
            var users;
            if (singular(count)) {
                users = `1 uživateli`;
            } else if (plural(count)) {
                users = `${count} uživatelům`;
            } else {
                users = `${count} uživatelům`;
            }
            var bookmarks = (count === 1) ? `záložky` : `záložky`;
            return `Poslat ${bookmarks} ${users}`;
        },
        'option-show-media-preview': 'Zobrazit připojené média',
        'option-show-text-preview': 'Zobrazit náhled textu',
        'option-statistics-biweekly': 'Zobrazit aktivity za posledních 14 dní',
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
        'qr-scanner-invalid-qr-code': 'Neplatný kód QR',
        'qr-scanner-qr-code-found': 'QR kód nalezený',

        'reaction-$name-added-story-to-issue-tracker': (name) => {
            var e = pastTenseEnding(name);
            return `${name} přida${e} tento příspěvek na bugtracker`;
        },
        'reaction-$name-cast-a-vote': (name) => {
            var e = pastTenseEnding(name);
            return `${name} hlasova${e}`;
        },
        'reaction-$name-commented-on-branch': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} tuto větev`;
        },
        'reaction-$name-commented-on-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} tento problém`;
        },
        'reaction-$name-commented-on-merge': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} toto sloučení kódu`;
        },
        'reaction-$name-commented-on-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} tuto žádost o sloučení`;
        },
        'reaction-$name-commented-on-push': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} tento přesun`;
        },
        'reaction-$name-commented-on-tag': (name) => {
            var e = pastTenseEnding(name);
            return `${name} komentova${e} tento tag`;
        },
        'reaction-$name-completed-a-task': (name) => {
            var ve = pastTenseEnding(name);
            var ae = ve.substr(1);
            return `${name} by${ve} dokončen${ae} úkol`;
        },
        'reaction-$name-is-assigned-to-issue': (name) => {
            var ve = pastTenseEnding(name);
            var ae = ve.substr(1);
            return `${name} byl${ve} přidělen${ae} tomuto problému`;
        },
        'reaction-$name-is-assigned-to-merge-request': (name) => {
            var ve = pastTenseEnding(name);
            var ae = ve.substr(1);
            return `${name} byl${ve} přidělen${ae} této žádosti o sloučení`;
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
            return (count === 1) ? `1 reaction` : `${count} reactions`;
            if (singular(count)) {
                return `1 reakce`;
            } else if (plural(count)) {
                return `${count} reakcí`;
            } else {
                return `${count} reakcí`;
            }
        },
        'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            return `Stvoři${e} větve „${branch}” v projektu „${repo}”`;
        },
        'story-$name-created-$milestone': (name, milestone) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} milník „${milestone}”`;
        },
        'story-$name-created-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} wiki stránku „${page}”`;
        },
        'story-$name-created-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Vytvoři${e} projekt`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
            var e = pastTenseEnding(name);
            return `Stvoři${e} tag „${tag}” v projektu „${repo}”`;
        },
        'story-$name-deleted-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Smaza${e} stránku wiki „${page}”`;
        },
        'story-$name-deleted-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Smaza${e} projekt`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-$name-imported-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Importova${e} projekt`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-$name-joined-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Vstoupi${e} Do projektu`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-$name-left-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Opusti${e} projekt`;
            if (repo) {
                text += ` „${repo}”`;
            }
            return text;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Slouči${e} změny`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `„${branch}”`;
                });
                if (singular(sources.length)) {
                    text += ` z větve`;
                } else {
                    text += ` z větví`;
                }
                text += sources.join(', ');
            }
            text += ` do větve „${branch}”`;
            if (repo) {
                text += ` projektu „${repo}”`;
            }
            return text;
        },
        'story-$name-opened-issue-$number-$title': (name, number, title) => {
            var e = pastTenseEnding(name);
            var text = `Otevře${e} problém ${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Posunova${e} změny do větve „${branch}”`;
            if (repo) {
                text += ` projektu „${repo}”`;
            }
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
            var e = pastTenseEnding(name);
            return `Požádal sloučit větve „${branch1}” do větve „${branch2}”.`;
        },
        'story-$name-updated-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Aktualizova${e} stránku wiki „${page}”`;
        },
        'story-add-coauthor': 'Přidat spoluautora',
        'story-add-remove-coauthor': 'Přidat/Odebrat spoluautora',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) => {
            if (singular(count)) {
                return `1 další`;
            } else if (plural(count)) {
                return `${count} další`;
            } else {
                return `${count} dalších`;
            }
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
            var files;
            if (singular(count)) {
                files = `1 soubor`
            } else if (plural(count)) {
                files = `${count} soubory`;
            } else {
                files = `${count} souborů`;
            }
            return `${files} přidáno`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines;
            if (singular(count)) {
                lines = `1 řádek`
            } else if (plural(count)) {
                lines = `${count} řádky`;
            } else {
                lines = `${count} řádků`;
            }
            return `${lines} přidáno`;
        },
        'story-push-components-changed': 'Byly změněny následující části:',
        'story-push-deleted-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 soubor`
            } else if (plural(count)) {
                files = `${count} soubory`;
            } else {
                files = `${count} souborů`;
            }
            return `${files} smazáno`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines;
            if (singular(count)) {
                lines = `1 řádek`
            } else if (plural(count)) {
                lines = `${count} řádky`;
            } else {
                lines = `${count} řádků`;
            }
            return `${lines} smazáno`;
        },
        'story-push-modified-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 soubor`
            } else if (plural(count)) {
                files = `${count} soubory`;
            } else {
                files = `${count} souborů`;
            }
            return `${files} modifikovano`;
        },
        'story-push-modified-$count-lines': (count) => {
            var lines;
            if (singular(count)) {
                lines = `1 řádek`
            } else if (plural(count)) {
                lines = `${count} řádky`;
            } else {
                lines = `${count} řádků`;
            }
            return `${lines} modifikovano`;
        },
        'story-push-renamed-$count-files': (count) => {
            var files;
            if (singular(count)) {
                files = `1 soubor`
            } else if (plural(count)) {
                files = `${count} soubory`;
            } else {
                files = `${count} souborů`;
            }
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

        'time-$hours-ago': (hours) => {
            if (singular(hours)) {
                return `Před hodinou`;
            } else {
                return `Před ${hours} hodinami`;
            }
        },
        'time-$hr-ago': (hr) => {
            return `Před ${hr} hod`;
        },
        'time-$min-ago': (min) => {
            return `Před ${min} min`;
        },
        'time-$minutes-ago': (minutes) => {
            if (singular(minutes)) {
                return `Před minutou`;
            } else {
                return `Před ${minutes} minutami`;
            }
        },
        'time-just-now': 'Právě teď',
        'time-yesterday': 'Včera',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 souboru` : `${count} souborů`;
            return `Nahrávání ${files}, zbývá ${size}`;
        },

        'user-actions': 'Akce',

        'user-activity-$name-created-branch': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} větev`;
        },
        'user-activity-$name-created-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} žádost o sloučení`;
        },
        'user-activity-$name-created-milestone': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} milník.`;
        },
        'user-activity-$name-created-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} projekt git.`;
        },
        'user-activity-$name-created-tag': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} tag`;
        },
        'user-activity-$name-deleted-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Smaza${e} projekt git`;
        },
        'user-activity-$name-edited-wiki-page': (name) => {
            var e = pastTenseEnding(name);
            return `Upravi${e} stránku wiki`;
        },
        'user-activity-$name-imported-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Importova${e} projekt git`;
        },
        'user-activity-$name-joined-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Připoji${e} se k projektu git`;
        },
        'user-activity-$name-left-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Opusti${e} projekt git`;
        },
        'user-activity-$name-merged-code': (name) => {
            var e = pastTenseEnding(name);
            return `Proved${e} sloučení kódu.`;
        },
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios;
            if (singular(count)) {
                audios = 'audioklip';
            } else if (plural(count)) {
                audios = `${count} audioklipy`;
            } else {
                audios = `${count} audioklipů`;
            }
            var e = pastTenseEnding(name);
            return `Zveřejni${e} ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `odkaz` : `odkazy`;
            var website = `webové stránky`;
            var e = pastTenseEnding(name);
            return `Posla${e} ${links} na ${website}`
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures;
            if (singular(count)) {
                pictures = 'obrázek';
            } else if (plural(count)) {
                pictures = `${count} obrázky`;
            } else {
                pictures = `${count} obrázků`;
            }
            var e = pastTenseEnding(name);
            return `Zveřejni${e} ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos;
            if (singular(count)) {
                videos = 'videoklip';
            } else if (plural(count)) {
                videos = `${count} videoklipy`;
            } else {
                videos = `${count} videoklipů`;
            }
            var e = pastTenseEnding(name);
            return `Zveřejni${e} ${videos}`;
        },
        'user-activity-$name-pushed-code': (name) => {
            var e = pastTenseEnding(name);
            return `Posunova${e} změny do repozitáře`;
        },
        'user-activity-$name-reported-issue': (name) => {
            var e = pastTenseEnding(name);
            return `Ohlási${e} problém`;
        },
        'user-activity-$name-started-survey': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} anketu`;
        },
        'user-activity-$name-started-task-list': (name) => {
            var e = pastTenseEnding(name);
            return `Vytvoři${e} seznam úkolů`;
        },
        'user-activity-$name-wrote-post': (name) => {
            var e = pastTenseEnding(name);
            return `Napsa${e} příspěvek`;
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
            if (singular(count)) {
                return `1 větev`;
            } else if (plural(count)) {
                return `${count} větve`;
            } else {
                return `${count} větví`;
            }
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            if (singular(count)) {
                return `1 problém`;
            } else if (plural(count)) {
                return `${count} problémy`;
            } else {
                return `${count} problémů`;
            }
        },
        'user-statistics-tooltip-$count-member': (count) => {
            if (singular(count)) {
                return `1 změna členství`;
            } else if (plural(count)) {
                return `${count} změny členství`;
            } else {
                return `${count} změn členství`;
            }
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            if (singular(count)) {
                return `1 sloučení`;
            } else if (plural(count)) {
                return `${count} sloučení`;
            } else {
                return `${count} sloučeních`;
            }
        },
        'user-statistics-tooltip-$count-merge-request': (count) => {
            if (singular(count)) {
                return `1 žádost o sloučení`;
            } else if (plural(count)) {
                return `${count} žádosti o sloučení`;
            } else {
                return `${count} žádostí o sloučení`;
            }
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            if (singular(count)) {
                return `1 milník`;
            } else if (plural(count)) {
                return `${count} milníky`;
            } else {
                return `${count} milníků`;
            }
        },
        'user-statistics-tooltip-$count-post': (count) => {
            if (singular(count)) {
                return `1 příspěvek`;
            } else if (plural(count)) {
                return `${count} příspěvky`;
            } else {
                return `${count} příspěvků`;
            }
        },
        'user-statistics-tooltip-$count-push': (count) => {
            if (singular(count)) {
                return `1 přesun`;
            } else if (plural(count)) {
                return `${count} přesune`;
            } else {
                return `${count} přesunů`;
            }
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            if (singular(count)) {
                return `1 změna repozitáře`;
            } else if (plural(count)) {
                return `${count} změny repozitářů`;
            } else {
                return `${count} změn repozitářů`;
            }
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            if (singular(count)) {
                return `1 anketa`;
            } else if (plural(count)) {
                return `${count} ankety`;
            } else {
                return `${count} anket`;
            }
        },
        'user-statistics-tooltip-$count-tag': (count) => {
            if (singular(count)) {
                return `1 tag`;
            } else if (plural(count)) {
                return `${count} tagy`;
            } else {
                return `${count} tagů`;
            }
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            if (singular(count)) {
                return `1 seznam úkolů`;
            } else if (plural(count)) {
                return `${count} seznamy úkolů`;
            } else {
                return `${count} seznamů úkolů`;
            }
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            if (singular(count)) {
                return `1 úprava stránky wiki`;
            } else if (plural(count)) {
                return `${count} úpravy stránek wiki`;
            } else {
                return `${count} úprav stránek wiki`;
            }
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
};

function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n === 2 || n === 3 || n === 4) {
        return true;
    }
    return false;
}

function gender(name) {
    if (name) {
        if (name instanceof Array) {
            for (var i = 0; i < name.length; i++) {
                if (gender(name[i]) === 'male') {
                    return 'male';
                }
            }
            return 'female';
        }
        if (name.gender) {
            return name.gender;
        }
        var parts = name.split(/\s+/);
        var fname = parts[0].toLocaleLowerCase();
        if (/a$/.test(fname)) {
            if (!isMasculine[fname]) {
                return 'female';
            }
        } else {
            if (isFeminine[fname]) {
                return 'female';
            }
        }
    }
    return 'male';
}

var isFeminine = {};
[
    'Abigail',
    'Adél',
    'Adele',
    'Agnes',
    'Alice',
    'Amalie',
    'Amálie',
    'Amelie',
    'Amélie',
    'Amy',
    'Anabel',
    'Anastazie',
    'Anastázie',
    'Anette',
    'Annabel',
    'Annabell',
    'Annabelle',
    'Annemarie',
    'Annie',
    'Antonie',
    'Ashley',
    'Aylin',
    'Beatrice',
    'Beatris',
    'Björn',
    'Carmen',
    'Caroline',
    'Cecílie',
    'Charlotte',
    'Christine',
    'Claudie',
    'Dagmar',
    'Dani',
    'Edvin',
    'Eleanor',
    'Elen',
    'Eleni',
    'Elin',
    'Elisabet',
    'Elisabeth',
    'Elizabet',
    'Elizabeth',
    'Ellen',
    'Elli',
    'Ellie',
    'Emili',
    'Emilie',
    'Emílie',
    'Emilly',
    'Emily',
    'Ester',
    'Evelin',
    'Eveline',
    'Evelyn',
    'Felipe',
    'Grace',
    'Helen',
    'Ines',
    'Inés',
    'Ingrid',
    'Isabel',
    'Isabell',
    'Isabelle',
    'Izabel',
    'Jasmin',
    'Jasmine',
    'Jenifer',
    'Jennifer',
    'Julie',
    'Karin',
    'Kate',
    'Katie',
    'Katrin',
    'Ketrin',
    'Kim',
    'Klaudie',
    'Kristin',
    'Leticie',
    'Libuše',
    'Lili',
    'Lilian',
    'Lilien',
    'Lillian',
    'Lilly',
    'Lily',
    'Livie',
    'Lucie',
    'Lýdie',
    'Madeleine',
    'Madlen',
    'Mariam',
    'Marie',
    'Marlen',
    'Megan',
    'Melanie',
    'Melánie',
    'Michelle',
    'Miluše',
    'Miriam',
    'Molly',
    'Nancy',
    'Naomi',
    'Natali',
    'Natalie',
    'Natálie',
    'Nataly',
    'Nathalie',
    'Nathaly',
    'Nelli',
    'Nelly',
    'Nicol',
    'Nicole',
    'Nicolette',
    'Nicoll',
    'Niki',
    'Noemi',
    'Olivie',
    'Olívie',
    'Patricie',
    'Rachel',
    'Ráchel',
    'Rosalie',
    'Rozálie',
    'Rozárie',
    'Rút',
    'Sami',
    'Sarah',
    'Scarlett',
    'Silvie',
    'Skarlet',
    'Sofie',
    'Sophie',
    'Stefani',
    'Stefanie',
    'Sylvie',
    'Terezie',
    'Tiffany',
    'Valerie',
    'Valérie',
    'Valery',
    'Victorie',
    'Viktorie',
    'Violet',
    'Vivien',
    'Vivienne',
    'Yasmin',
    'Yasmine',
    'Zoe',
    'Žofie',
].forEach((name) => {
    isFeminine[name.toLocaleLowerCase()] = true;
});

var isMasculine = {};
[
    'Honza',
    'Jožka',
    'Jura',
    'Nikola',
    'Nikolka',
    'Peťulka',
    'Sáva',
].forEach((name) => {
    isMasculine[name.toLocaleLowerCase()] = true;
});

function pastTenseEnding(name, plural) {
    if (plural) {
        return 'li';
    } else {
        if (gender(name) === 'female') {
            return 'la';
        } else {
            return 'l';
        }
    }
}

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ` a ${lastItem}`;
    }
    return items.join(', ');
}
