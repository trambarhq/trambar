require('moment/locale/de');
require('moment/locale/de-at');
require('moment/locale/de-ch');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': 'Per E-Mail kontaktieren',
        'action-contact-by-ichat': 'Über iChat kontaktieren',
        'action-contact-by-phone': 'Per Telefon kontaktieren',
        'action-contact-by-skype': 'Über Skype kontaktieren',
        'action-contact-by-slack': 'Über Skype kontaktieren',
        'action-contact-by-twitter': 'Über Twitter kontaktieren',
        'action-view-github-page': 'GitHub-Profilseite anzuzeigen',
        'action-view-gitlab-page': 'GitLab-Profilseite anzuzeigen',
        'action-view-linkedin-page': 'LinkedIn-Profilseite anzuzeigen',
        'action-view-stackoverflow-page': 'StackOverflow-Profilseite anzuzeigen',

        'activation-address': 'Server-Adresse',
        'activation-cancel': 'Abbrechen',
        'activation-code': 'Aktivierungscode',
        'activation-ok': 'OK',
        'activation-schema': 'Projekt',

        'alert-$count-new-bookmarks': (count) => {
            return (count === 1) ? `1 new bookmark` : `${count} new bookmarks`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 new notification` : `${count} new notifications`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 new story` : `${count} new stories`;
        },

        'app-component-close': 'Schließen',

        'app-name': 'Trambar',

        'audio-capture-accept': 'Akzeptieren',
        'audio-capture-cancel': 'Abbrechen',
        'audio-capture-pause': 'Pausieren',
        'audio-capture-rerecord': 'Neu aufzunehmen',
        'audio-capture-resume': 'Fortzusetzen',
        'audio-capture-start': 'Starten',
        'audio-capture-stop': 'Stoppen',

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 anderer Benutzer` : `${count} andere Benutzer`;
        },
        'bookmark-$count-users': (count) => {
            return `${count} Benutzer`;
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} empfiehlt dies`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
            return [ name1, ` und `, name2, ` empfehlen dies` ];
        },
        'bookmark-$you-bookmarked-it': 'Sie hinzugefügt haben ein Lesezeichen auf diese',
        'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
            return `Sie hinzugefügt haben ein Lesezeichen auf diese (und ${name} empfiehlt es)`;
        },
        'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
            return [ `Sie hinzugefügt haben ein Lesezeichen auf diese (und `, others, ` empfiehlten es)` ];
        },
        'bookmark-recommendations': 'Empfehlungen',

        'bookmarks-no-bookmarks': 'Keine Lesezeichen',

        'bottom-nav-bookmarks': 'Lesezeichen',
        'bottom-nav-news': 'Nachrichten',
        'bottom-nav-notifications': 'Benachrichtigungen',
        'bottom-nav-people': 'Personal',
        'bottom-nav-settings': 'Einstellungen',

        'confirmation-cancel': 'Abbrechen',
        'confirmation-confirm': 'Bestätigen',

        'development-code-push-$deployment': (deployment) => {
            return `Code-Updates für “${deployment}” herunterladen`;
        },
        'development-show-diagnostics': 'Diagnose anzeigen',
        'development-show-panel': 'Dieses Panel anzuzeigen',

        'device-selector-camera-$number': (number) => {
            return `Kamera ${number}`;
        },
        'device-selector-camera-back': 'Rückkamera',
        'device-selector-camera-front': 'Frontkamera',
        'device-selector-mic-$number': (number) => {
            return `Mikrofon ${number}`;
        },

        'empty-currently-offline': 'Sie sind derzeit offline',

        'image-editor-page-rendering-in-progress': 'Website-Vorschau wird gerendert...',
        'image-editor-poster-extraction-in-progress': 'Vorschau wird aus dem Video extrahiert...',
        'image-editor-upload-in-progress': 'Datei wird hochgeladen...',

        'issue-cancel': 'Abbrechen',
        'issue-delete': 'Löschen',
        'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
            var objects = [];
            var adjectives = [];
            if (photos > 0) {
                objects.push(photos === 1 ? 'das Bild' : 'die Bilder');
                adjectives.push(photos === 1 ? 'folgende' : 'folgenden');
            }
            if (videos > 0) {
                objects.push(videos === 1 ? 'den Videoclip' : 'die Videoclips');
                adjectives.push('folgenden');
            }
            if (audios > 0) {
                objects.push(audios === 1 ? 'den Audioclip' : 'die Audioclips');
                adjectives.push('folgenden');
            }
            for (var i = 0; i < objects.length; i++) {
                if (i === 0) {
                    // insert adjustive after article
                    objects[i] = objects[i].replace(/^(\S+)/, '$1 ' + adjectives[i]);
                } else {
                    // remove article
                    objects[i] = objects[i].replace(/^(\S+)\s+/, '');
                }
            }
            var verb = (names.length > 1) ? 'haben' : 'hat';
            return `${list(names)} ${verb} ${list(objects)} gepostet:`;
        },
        'issue-export-$names-wrote': (names) => {
            return `${list(names)} schrieb:`;
        },
        'issue-ok': 'OK',
        'issue-repo': 'Repository',
        'issue-title': 'Titel',

        'list-$count-more': (count) => {
            return `${count} mehr...`;
        },

        'media-close': 'Schließen',
        'media-download-original': 'Original herunterzuladen',
        'media-editor-embed': 'Einbetten',
        'media-editor-remove': 'Entfernen',
        'media-editor-shift': 'Verschieben',
        'media-next': 'Nächstes',
        'media-previous': 'Vorheriges',

        'membership-request-$you-are-member': 'Sie sind Mitglied dieses Projekts',
        'membership-request-$you-are-now-member': 'Sie sind jetzt ein Mitglied dieses Projekts',
        'membership-request-$you-have-requested-membership': 'Sie haben die Mitgliedschaft in diesem Projekt beantragt',
        'membership-request-browse': 'Durchsuchen',
        'membership-request-cancel': 'Abbrechen',
        'membership-request-join': 'Beitreten',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Vorgehen',
        'membership-request-withdraw': 'Zurückziehen',

        'mobile-device-revoke': 'widerrufen',
        'mobile-device-revoke-are-you-sure': 'Möchten Sie die Autorisierung für dieses Gerät wirklich widerrufen?',

        'mobile-setup-address': 'Server-Adresse',
        'mobile-setup-close': 'Schließen',
        'mobile-setup-code': 'Autorisierungscode',
        'mobile-setup-project': 'Projekt',

        'news-no-stories-by-role': 'Keine Geschichten von jemandem mit dieser Rolle',
        'news-no-stories-found': 'Keine passenden Geschichten gefunden',
        'news-no-stories-on-date': 'Keine Geschichten an diesem Tag',
        'news-no-stories-yet': 'Noch keine Geschichten',

        'notification-$name-added-you-as-coauthor': (name) => {
            return `${name} hat Sie eingeladen, um gemeinsam einen Beitrag zu editieren`;
        },
        'notification-$name-added-your-post-to-issue-tracker': (name) => {
            return `${name} hat deinen Beitrag zum Bugtracker hinzugefügt`;
        },
        'notification-$name-commented-on-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'Ihre Umfrage'; break;
                case 'task-list': story = 'Ihre Aufgabenliste'; break;
                case 'post': story = 'Ihren Beitrag'; break;
                default: story = 'Ihre Geschichte';
            }
            return `${name} hat ${story} kommentiert`;
        },
        'notification-$name-completed-task': (name) => {
            return `${name} hat eine Aufgabe auf Ihrer Aufgabenliste abgeschlossen`;
        },
        'notification-$name-is-assigned-to-your-issue': (name) => {
            return `${name} ist Ihrem Problem zugewiesen`;
        },
        'notification-$name-likes-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'Ihre Umfrage'; break;
                case 'task-list': story = 'Ihre Aufgabenliste'; break;
                case 'post': story = 'Ihren Beitrag'; break;
                default: story = 'Ihre Geschichte';
            }
            return `${name} mag ${story}`;
        },
        'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
            reaction = 'einem Kommentar';
            return `${name} hat Sie in ${reaction} erwähnt`;
        },
        'notification-$name-mentioned-you-in-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'einer Umfrage'; break;
                case 'task-list': story = 'einer Aufgabenliste'; break;
                case 'post': story = 'einem Beitrag'; break;
                case 'issue': story = 'einer Ausgabe'; break;
                case 'merge-request': story = 'einem Merge-Request'; break;
                default: story = 'einer Geschichte';
            }
            return `${name} hat Sie in ${reaction} erwähnt`;
        },
        'notification-$name-merged-code-to-$branch': (name, branch) => {
            return `${name} hat Änderungen in den Branch “${branch}” zusammengeführt`
        },
        'notification-$name-opened-an-issue': (name) => {
            return `${name} hat ein Problem geöffnet`;
        },
        'notification-$name-posted-a-note-about-your-$story': (name, story) => {
            switch (story) {
                case 'push': story = 'Ihren Commit'; break;
                case 'issue': story = 'Ihr Problem'; break;
                case 'merge-request': story = 'Ihren Merge-Request'; break;
            }
            return `${name} hat eine Notiz über ${story} geschrieben`;
        },
        'notification-$name-posted-a-survey': (name) => {
            return `${name} hat eine Umfrage gepostet`;
        },
        'notification-$name-pushed-code-to-$branch': (name, branch) => {
            return `${name} hat Änderungen in den Branch “${branch} gepusht”`;
        },
        'notification-$name-requested-to-join': (name) => {
            return `${name} hat darum gebeten, an diesem Projekt teilzunehmen`;
        },
        'notification-$name-sent-bookmark-to-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'einer Umfrage'; break;
                case 'task-list': story = 'einer Aufgabenliste'; break;
                case 'post': story = 'einem Beitrag'; break;
                default: story = 'einer Geschichte';
            }
            return `${name} hat Ihnen ein Lesezeichen auf ${story} gesendet`
        },
        'notification-$name-voted-in-your-survey': (name) => {
            return `${name} hat Ihre Umfrage beantwortet`;
        },
        'notification-option-assignment': 'Wenn jemand Ihrem Problem zugewiesen wurde',
        'notification-option-bookmark': 'Wenn Ihnen jemand ein Lesezeichen sendet',
        'notification-option-coauthor': 'Wenn jemand Sie einlädt, einen Beitrag gemeinsam zu bearbeiten',
        'notification-option-comment': 'Wenn jemand Ihre Geschichte kommentiert',
        'notification-option-issue': 'Wenn jemand ein Problem öffnet',
        'notification-option-join-request': 'Wenn jemand an diesem Projekt teilnehmen möchte',
        'notification-option-like': 'Wenn jemand Ihre Geschichte mag',
        'notification-option-mention': 'Wenn jemand Sie in einer Geschichte oder einem Kommentar erwähnt',
        'notification-option-merge': 'Wenn jemand Code in den Master-Branch zusammenführt',
        'notification-option-note': 'Wenn jemand eine Notiz über einen Commit oder einen Problem schreibt',
        'notification-option-push': 'Wenn jemand Änderungen in ein Repository pusht',
        'notification-option-survey': 'Wenn jemand eine Umfrage postet',
        'notification-option-task-completion': 'Wenn jemand eine Aufgabe auf Ihrer Aufgabenliste ausführt',
        'notification-option-vote': 'Wenn jemand Ihre Umfrage beantwortet',
        'notification-option-web-session': 'Wenn eine Websitzung aktiv ist',

        'notifications-no-notifications-on-date': 'Keine Benachrichtigungen an diesem Datum',
        'notifications-no-notifications-yet': 'Noch keine Benachrichtigungen',

        'option-add-bookmark': 'Lesezeichen hinzufügen',
        'option-add-issue': 'Beitrag in den Bugtracker hinzufügen',
        'option-bump-story': 'Geschichte fördern',
        'option-edit-comment': 'Kommentar bearbeiten',
        'option-edit-post': 'Beitrag bearbeiten',
        'option-hide-comment': 'Kommentare vor Gästen verbergen',
        'option-hide-story': 'Geschichte vor Gästen verbergen',
        'option-keep-bookmark': 'Lesezeichen behalten',
        'option-remove-comment': 'Kommentar entfernen',
        'option-remove-story': 'Geschichte entfernen',
        'option-send-bookmarks': 'Lesezeichen an andere Benutzer senden',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = `${count} users`;
            return `Lesezeichen an ${users} senden`;
        },
        'option-show-media-preview': 'Angehängte Medien anzeigen',
        'option-show-text-preview': 'Textvorschau anzeigen',
        'option-statistics-biweekly': 'Aktivitäten der letzten 14 Tage anzeigen',
        'option-statistics-monthly': 'Monatliche Aktivitäten anzeigen',
        'option-statistics-to-date': 'Aktivitäten bis heute anzeigen',

        'people-no-stories-found': 'Keine passenden Geschichten gefunden',
        'people-no-stories-on-date': 'Keine Aktivitäten an diesem Datum',
        'people-no-users-by-role': 'Kein Projektmitglied hat diese Rolle',
        'people-no-users-yet': 'Noch keine Projektmitglieder',

        'person-no-stories-found': 'Keine passenden Geschichten gefunden',
        'person-no-stories-on-date': 'Keine Geschichten an diesem Tag',
        'person-no-stories-yet': 'Noch keine Geschichten',

        'photo-capture-accept': 'Akzeptieren',
        'photo-capture-cancel': 'Abbrechen',
        'photo-capture-retake': 'Neu machen',
        'photo-capture-snap': 'Machen',

        'project-description-close': 'Schließen',

        'project-management-add': 'Hinzufügen',
        'project-management-cancel': 'Abbrechen',
        'project-management-description': 'Projektbeschreibung',
        'project-management-join-project': 'Projekt beitreten',
        'project-management-manage': 'Liste verwalten',
        'project-management-mobile-set-up': 'Mobilgerät einrichten',
        'project-management-remove': 'Löschen',
        'project-management-sign-out': 'Abmelden',
        'project-management-sign-out-are-you-sure': 'Möchten Sie sich wirklich von diesem Server abmelden?',
        'project-management-withdraw-request': 'Mitgliedschaft-Anfrage widerrufen',

        'qr-scanner-cancel': 'Abbrechen',
        'qr-scanner-invalid-qr-code': 'Ungültiger QR-Code',
        'qr-scanner-qr-code-found': 'QR-Code gefunden',

        'reaction-$name-added-story-to-issue-tracker': (name) => {
            return `${name} hat diesen Beitrag in den Bugtracker hinzugefügt`;
        },
        'reaction-$name-cast-a-vote': (name) => {
            return `${name} hat diese Umfrage beantwortet`;
        },
        'reaction-$name-commented-on-branch': (name) => {
            return `${name} hat diesen Branch kommentiert`;
        },
        'reaction-$name-commented-on-issue': (name) => {
            return `${name} hat dieses Problem kommentiert`;
        },
        'reaction-$name-commented-on-merge': (name) => {
            return `${name} hat diesen Commit kommentiert`;
        },
        'reaction-$name-commented-on-merge-request': (name) => {
            return `${name} hat diesen Merge-Request kommentiert`;
        },
        'reaction-$name-commented-on-push': (name) => {
            return `${name} hat diesen Push kommentiert`;
        },
        'reaction-$name-commented-on-tag': (name) => {
            return `${name} hat diesen Tag kommentiert`;
        },
        'reaction-$name-completed-a-task': (name) => {
            return `${name} hat eine Aufgabe abgeschlossen`;
        },
        'reaction-$name-is-assigned-to-issue': (name) => {
            return `${name} wurde diesem Problem zugewiesen`;
        },
        'reaction-$name-is-assigned-to-merge-request': (name) => {
            return `${name} wurde diesem Merge-Request zugewiesen`;
        },
        'reaction-$name-is-editing': (name) => {
            return `${name} bearbeitet einen Kommentar...`;
        },
        'reaction-$name-is-sending': (name) => {
            return `${name} sendet einen Kommentar...`;
        },
        'reaction-$name-is-writing': (name) => {
            return `${name} schreibt einen Kommentar...`;
        },
        'reaction-$name-likes-this': (name) => {
            return `${name} mag diese`;
        },
        'reaction-status-storage-pending': 'Anstehend',
        'reaction-status-transcoding': 'Transkodierung',
        'reaction-status-uploading': 'Hochladen',

        'role-filter-no-roles': 'Keine Rollen definiert',

        'search-bar-keywords': 'Schlüsselwörter oder #Hashtags',

        'selection-cancel': 'Abbrechen',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-development': 'Entwickleroptionen',
        'settings-device': 'Mobilgerät',
        'settings-devices': 'Mobilgeräte',
        'settings-language': 'Sprache',
        'settings-mobile-alert': 'Mobile Benachrichtigung',
        'settings-notification': 'Benachrichtigung',
        'settings-profile-image': 'Profilbild',
        'settings-projects': 'Projekte',
        'settings-social-networks': 'Soziale Netzwerke',
        'settings-user-information': 'Benutzerinformation',
        'settings-web-alert': 'Browserbenachrichtigung',

        'social-network-github': 'GitHub-Profil-URL',
        'social-network-gitlab': 'GitLab-Profil-URL',
        'social-network-ichat': 'iChat-Benutzername',
        'social-network-linkedin': 'Linkedin-Profil-URL',
        'social-network-skype': 'Skype-Benutzername',
        'social-network-slack': 'Slack-Benutzer-ID',
        'social-network-slack-team': 'Slack-Team-ID',
        'social-network-stackoverflow': 'StackOverflow-Profil-URL',
        'social-network-twitter': 'Twitter-Benutzername',

        'start-activation-add-server': 'Projekt von einem anderen Server hinzufügen',
        'start-activation-instructions': (ui) => {
            return [
                'Um auf einen Trambar-Server auf diesem Gerät zuzugreifen, Melden Sie sich zuerst mit einem Webbrowser beim Server an. Wählen Sie ein Projekt und gehen Sie dann zur Seite ',
                ui.settings,
                '. Klicken Sie im Panel ',
                ui.projects,
                ' auf ',
                ui.mobileSetup,
                '. Ein QR-Code erscheint auf dem Bildschirm. Drücken Sie auf diesem Gerät die Taste unten und scannen Sie den Code. Alternativ können Sie den Aktivierungscode manuell eingeben.'
            ];
        },
        'start-activation-instructions-short': (ui) => {
            return [
                'Melden Sie sich mit einem Webbrowser an und scannen Sie den QR-Code, der im Fenster ',
                ui.settings,
                ' > ',
                ui.mobileSetup,
                'angezeigt wird.'
            ];
        },
        'start-activation-manual': 'Manueller Eintrag',
        'start-activation-new-server': 'Neuer Server',
        'start-activation-others-servers': 'Verfügbare Server',
        'start-activation-return': 'Rückkehr',
        'start-activation-scan-code': 'QR-Code scannen',
        'start-error-access-denied': 'Antrag auf Zugang abgelehnt',
        'start-error-account-disabled': 'Konto ist derzeit deaktiviert',
        'start-error-existing-users-only': 'Nur autorisiertes Personal kann auf dieses System zugreifen',
        'start-error-undefined': 'Unerwarteter Fehler',
        'start-no-projects': 'Keine Projekte',
        'start-no-servers': 'Keine OAuth-Anbieter',
        'start-projects': 'Projekte',
        'start-social-login': 'Soziale Anmeldung',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Willkommen!',
        'start-welcome-again': 'Willkommen zurück',

        'statistics-bar': 'Balken-',
        'statistics-line': 'Linien-',
        'statistics-pie': 'Kuchen-',

        'story-$count-reactions': (count) => {
            return (count === 1) ? `1 Reaktion` : `${count} Reaktionen`;
        },
        'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
            return `Hat den Branch “${branch}” im Projekt “${repo}” erstellt`;
        },
        'story-$name-created-$milestone': (name, milestone) => {
            return `Hat den Meilenstein “${milestone}” geschaffen`;
        },
        'story-$name-created-$page': (name, page) => {
            return `Hat die Wiki-Seite “${page}” erstellt`;
        },
        'story-$name-created-$repo': (name, repo) => {
            var project = `das Projekt`;
            if (repo) {
                project += ` “${repo}”`;
            }
            return `Hat ${project} erstellt`;
        },
        'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
            return `Hat das Tag “${tag}” im Projekt “${repo}” erstellt`;
        },
        'story-$name-deleted-$page': (name, page) => {
            return `Hat die Wiki-Seite “${page}” gelöscht`;
        },
        'story-$name-deleted-$repo': (name, repo) => {
            var project = `das Projekt`;
            if (repo) {
                project += ` “${repo}”`;
            }
            return `Hat ${project} gelöscht`;
        },
        'story-$name-imported-$repo': (name, repo) => {
            var project = `das Projekt`;
            if (repo) {
                project += ` “${repo}”`;
            }
            return `Hat ${project} importiert`;
        },
        'story-$name-joined-$repo': (name, repo) => {
            var project = `das Projekt`;
            if (repo) {
                project += ` “${repo}”`;
            }
            return `Hat ${project} beigetreten`;
        },
        'story-$name-left-$repo': (name, repo) => {
            var project = `das Projekt`;
            if (repo) {
                project += ` “${repo}”`;
            }
            return `Hat ${project} verlassen`;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
            var text = `Hat Code`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `“${branch}”`;
                });
                text += ` aus `;
                if (sources.length === 1) {
                    text += ` dem Branch `;
                } else {
                    text += ` den Branchs `;
                }
                text += sources.join(', ');
            }
            text += ` in den Branch “${branch}”`;
            if (repo) {
                text += ` des Projekts “${repo}”`;
            }
            text += ` zusammengeführt`;
            return text;
        },
        'story-$name-opened-issue-$number-$title': (name, number, title) => {
            var text = `Hat das Problem ${number} eröffnet`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
            var text = `Hat Änderungen in den Branch “${branch}”`;
            if (repo) {
                text += ` des Projekt “${repo}”`;
            }
            text += ` gepusht`;
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
            return `Hat eine Anfrage, den Branch “${branch1}” in den Branch “${branch2}” zusammenzufassen`;
        },
        'story-$name-updated-$page': (name, page) => {
            return `Hat die Wiki-Seite “${page}” aktualisiert`;
        },
        'story-add-coauthor': 'Co-Autor hinzufügen',
        'story-add-remove-coauthor': 'Co-Autor hinzufügen/entfernen',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) => {
            return `${count} andere`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ` und `, name2 ];
        },
        'story-cancel': 'Abbrechen',
        'story-cancel-are-you-sure': 'Möchten Sie diesen Beitrag wirklich aufgeben?',
        'story-cancel-edit-are-you-sure': 'Möchten Sie Änderungen, die Sie vorgenommen haben, wirklich abbrechen?',
        'story-coauthors': 'Co-Autoren',
        'story-comment': 'Kommentieren',
        'story-drop-files-here': 'Ziehen und legen Sie Mediendateien hier ab',
        'story-file': 'Datei',
        'story-issue-current-status': 'Aktueller Status:',
        'story-issue-status-closed': 'Geschlossen',
        'story-issue-status-opened': 'Offen',
        'story-issue-status-reopened': 'Wiedereröffnet',
        'story-like': 'Gefällt mir',
        'story-markdown': 'Markdown',
        'story-milestone-due-date': 'Geburtstermin:',
        'story-milestone-start-date': 'Anfangsdatum:',
        'story-options': 'Optionen',
        'story-paste-image-here': 'Ein Bild, das in den Texteditor eingefügt wird, endet ebenfalls hier',
        'story-pending': 'Anstehend...',
        'story-photo': 'Foto',
        'story-post': 'Posten',
        'story-push-added-$count-files': (count) => {
            var files = (count === 1) ? `1 Datei` : `${count} Dateien`;
            return `${files} hinzugefügt`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines = (count === 1) ? `1 Zeile` : `${count} Zeilen`;
            return `${lines} hinzugefügt`;
        },
        'story-push-components-changed': 'Die folgenden Teile wurden geändert:',
        'story-push-deleted-$count-files': (count) => {
            var files = (count === 1) ? `1 Datei` : `${count} Dateien`;
            return `${files} entfernt`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines = (count === 1) ? `1 Zeile` : `${count} Zeilen`;
            return `${lines} entfernt`;
        },
        'story-push-modified-$count-files': (count) => {
            var files = (count === 1) ? `1 Datei` : `${count} Dateien`;
            return `${files} modifiziert`;
        },
        'story-push-modified-$count-lines': (count) => {
            var lines = (count === 1) ? `1 Zeile` : `${count} Zeilen`;
            return `${lines} modifiziert`;
        },
        'story-push-renamed-$count-files': (count) => {
            var files = (count === 1) ? `1 Datei` : `${count} Dateien`;
            return `${files} umbenannt`;
        },
        'story-remove-yourself': 'Sich selbst entfernen',
        'story-remove-yourself-are-you-sure': 'Möchten Sie Sich wirklich als Mitautor entfernen?',
        'story-status-storage-pending': 'Anstehend',
        'story-status-transcoding-$progress': (progress) => {
            return `Transkodierung (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Hochladen (${progress}%)`;
        },
        'story-survey': 'Umfrage',
        'story-task-list': 'Aufgabenliste',
        'story-video': 'Video',
        'story-vote-submit': 'Einreichen',

        'telephone-dialog-close': 'Schließen',

        'time-$hours-ago': (hours) => {
            return (hours === 1) ? `Vor einer Stunde` : `${hours} Stunden zuvor`;
        },
        'time-$hr-ago': (hr) => {
            return `Vor ${hr} Std.`;
        },
        'time-$min-ago': (min) => {
            return `Vor ${min} Min.`;
        },
        'time-$minutes-ago': (minutes) => {
            return (minutes === 1) ? `Vor einer Minute` : `Vor ${minutes} Minuten`;
        },
        'time-just-now': 'Soeben',
        'time-yesterday': 'Gestern',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 Datei` : `${count} Dateien`;
            var are = (count === 1) ? `wird` : `werden`;
            return `${files} ${are} hochgeladen, ${size} übrig`;
        },

        'user-actions': 'Aktionen',

        'user-activity-$name-created-branch': 'Hat einen neuen Branch erstellt',
        'user-activity-$name-created-merge-request': 'Hat einen Merge-Request gestellt',
        'user-activity-$name-created-milestone': 'Hat einen Meilenstein erstellt',
        'user-activity-$name-created-repo': 'Hat ein Git-Projekt erstellt',
        'user-activity-$name-created-tag': 'Hat einen neuen Tag erstellt',
        'user-activity-$name-deleted-repo': 'Hat ein Git-Projekt gelöscht',
        'user-activity-$name-edited-wiki-page': 'Hat eine Wiki-Seite bearbeitet',
        'user-activity-$name-imported-repo': 'Hat ein Git-Projekt importiert',
        'user-activity-$name-joined-repo': 'Hat ein Git-Projekt beigetreten',
        'user-activity-$name-left-repo': 'Hat ein Git-Projekt verlassen',
        'user-activity-$name-merged-code': 'Hat einen Merge durchgeführt',
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios = (count === 1) ? `einen Audioclip` : `${count} Audioclips`;
            return `Hat ${videos} gepostet`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `einen Link` : `${count} Links`;
            var website = (count === 1) ? `einer Webseite` : `${count} Webseiten`;
            return `Hat ${links} zu ${website} gepostet`;
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures = (count === 1) ? `ein Bild` : `${count} Bilder`;
            return `Hat ${pictures} gepostet`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos = (count === 1) ? `einen Videoclip` : `${count} Videoclips`;
            return `Hat ${videos} gepostet`;
        },
        'user-activity-$name-pushed-code': 'Hat Änderungen an einem Repository gepusht',
        'user-activity-$name-reported-issue': 'Hat ein Problem gemeldet',
        'user-activity-$name-started-survey': 'Hat eine Umfrage gestartet',
        'user-activity-$name-started-task-list': 'Hat eine Aufgabenliste erstellt',
        'user-activity-$name-wrote-post': 'Hat einen Post geschrieben',
        'user-activity-back': 'Zurück',
        'user-activity-more': 'Mehr',

        'user-image-adjust': 'Anzupassen',
        'user-image-cancel': 'Abbrechen',
        'user-image-replace': 'Ersetzen',
        'user-image-save': 'Speichern',
        'user-image-select': 'Auszuwählen',
        'user-image-snap': 'Fotografieren',

        'user-info-email': 'E-Mail-Addresse',
        'user-info-gender': 'Geschlecht',
        'user-info-gender-female': 'Weiblich',
        'user-info-gender-male': 'Männlich',
        'user-info-gender-unspecified': 'Nicht spezifiziert',
        'user-info-name': 'Name',
        'user-info-phone': 'Telefonnummer',

        'user-statistics-legend-branch': 'Neue Branches',
        'user-statistics-legend-issue': 'Probleme',
        'user-statistics-legend-member': 'Mitgliedschaft-Änderungen',
        'user-statistics-legend-merge': 'Merges',
        'user-statistics-legend-merge-request': 'Merge-Requests',
        'user-statistics-legend-milestone': 'Meilensteine',
        'user-statistics-legend-post': 'Beiträge',
        'user-statistics-legend-push': 'Pushs',
        'user-statistics-legend-repo': 'Repository-Änderungen',
        'user-statistics-legend-survey': 'Umfragen',
        'user-statistics-legend-tag': 'Neue Tags',
        'user-statistics-legend-task-list': 'Aufgabenlisten',
        'user-statistics-legend-wiki': 'Wiki-Bearbeitungen',
        'user-statistics-today': 'Heute',
        'user-statistics-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 Branch` : `${count} Branchs`;
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 Problem` : `${count} Probleme`;
        },
        'user-statistics-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 Mitgliedschaft-Änderung` : `${count} Mitgliedschaft-Änderungen`;
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 Merge` : `${count} Merges`;
        },
        'user-statistics-tooltip-$count-merge-request': (count) => {
            return (count === 1) ? `1 Merge-Request` : `${count} Merge-Requests`;
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 Meilenstein` : `${count} Meilensteine`;
        },
        'user-statistics-tooltip-$count-post': (count) => {
            return (count === 1) ? `1 Beiträg` : `${count} Beiträge`;
        },
        'user-statistics-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 Push` : `${count} Pushs`;
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 Repository-Änderung` : `${count} Repository-Änderungen`;
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 Umfrage` : `${count} Umfragen`;
        },
        'user-statistics-tooltip-$count-tag': (count) => {
            return (count === 1) ? `1 Tag` : `${count} Tags`;
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 Aufgabenliste` : `${count} Aufgabenlisten`;
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 Wiki-Bearbeitung` : `${count} Wiki-Bearbeitungen`;
        },

        'video-capture-accept': 'Akzeptieren',
        'video-capture-cancel': 'Abbrechen',
        'video-capture-pause': 'Pausieren',
        'video-capture-resume': 'Fortzusetzen',
        'video-capture-retake': 'Neu aufzeichnen',
        'video-capture-start': 'Starten',
        'video-capture-stop': 'Stoppen',

        'warning-no-connection': 'Keine sofortige Datenaktualisierung',
    };
};

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ` und ${lastItem}`;
    }
    return items.join(', ');
}
