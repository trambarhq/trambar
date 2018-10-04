import 'moment/locale/de';
import 'moment/locale/de-at';
import 'moment/locale/de-ch';
import { cardinal } from 'locale/grammars/german';

const phrases = {
    'action-badge-add': 'hinzufügen',
    'action-badge-approve': 'genehmigen',
    'action-badge-archive': 'archivieren',
    'action-badge-disable': 'deaktivieren',
    'action-badge-reactivate': 'reaktivieren',
    'action-badge-remove': 'entfernen',
    'action-badge-restore': 'wiederherzustellen',

    'activity-chart-legend-branch': 'Neue Branchs',
    'activity-chart-legend-issue': 'Probleme',
    'activity-chart-legend-member': 'Mitgliedschaft-Änderungen',
    'activity-chart-legend-merge': 'Merges',
    'activity-chart-legend-merge-request': 'Merge-Requests',
    'activity-chart-legend-milestone': 'Meilensteine',
    'activity-chart-legend-post': 'Beiträge',
    'activity-chart-legend-push': 'Pushs',
    'activity-chart-legend-repo': 'Repository-Änderungen',
    'activity-chart-legend-survey': 'Umfragen',
    'activity-chart-legend-tag': 'Neue Tags',
    'activity-chart-legend-task-list': 'Aufgabenlisten',
    'activity-chart-legend-wiki': 'Wiki-Bearbeitungen',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, '1 Geschichte', '2 Geschichten');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 Branch', '2 Branchs');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 Problem', '2 Probleme');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, '1 Mitgliedschaft-Änderung', '2 Mitgliedschaft-Änderungen');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 Merge', '2 Merges');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 Merge-Request', '2 Merge-Requests');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 Meilenstein', '2 Meilensteine');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, '1 Beiträg', '2 Beiträge');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, '1 Push', '2 Pushs');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 Repository-Änderung', '2 Repository-Änderungen');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 Umfrage', '2 Umfragen');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 Tag', '2 Tags');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 Aufgabenliste', '2 Aufgabenlisten');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 Wiki-Bearbeitung', '2 Wiki-Bearbeitungen');
    },

    'app-name': 'Trambar',
    'app-title': 'Trambar - Verwaltungskonsole',

    'confirmation-cancel': 'Abbrechen',
    'confirmation-confirm': 'Bestätigen',
    'confirmation-data-loss': 'Möchten Sie Änderungen, die Sie vorgenommen haben, wirklich abbrechen?',

    'date-range-$start-$end': (start, end) => {
        if (start) {
            if (end) {
                return `${start}–${end}`;
            } else {
                return `${start}–`;
            }
        }
        return '';
    },

    'image-album-cancel': 'Abbrechen',
    'image-album-done': 'Beenden',
    'image-album-manage': 'Album verwalten',
    'image-album-remove': 'Ausgewählte entfernen',
    'image-album-select': 'Ausgewählte verwenden',
    'image-album-upload': 'Bilddateien hochladen',

    'image-cropping-cancel': 'Abbrechen',
    'image-cropping-select': 'OK',

    'image-selector-choose-from-album': 'Aus dem Album auswählen',
    'image-selector-crop-image': 'Größe / Position anpassen',
    'image-selector-upload-file': 'Bilddatei hochladen',

    'member-list-$name-with-$username': (name, username) => {
        if (name) {
            if (username) {
                return `${name} (${username})`;
            } else {
                return name;
            }
        } else {
            return username;
        }
    },
    'member-list-add': 'Neuen Benutzer hinzufügen',
    'member-list-approve-all': 'Alle Anfragen genehmigen',
    'member-list-cancel': 'Abbrechen',
    'member-list-edit': 'Mitgliederliste bearbeiten',
    'member-list-reject-all': 'Alle Anfragen ablehnen',
    'member-list-save': 'Mitgliederliste speichern',
    'member-list-status-non-member': 'Kein Mitglied',
    'member-list-status-pending': 'Anfrage ausstehend',
    'member-list-title': 'Mitglieder',

    'nav-member-new': 'Neues Mitglied',
    'nav-members': 'Mitglieder',
    'nav-project-new': 'Neues Projekt',
    'nav-projects': 'Projekte',
    'nav-repositories': 'Repositorys',
    'nav-role-new': 'Neue Rolle',
    'nav-roles': 'Rollen',
    'nav-server-new': 'Neuer Server',
    'nav-servers': 'Server',
    'nav-settings': 'Einstellungen',
    'nav-user-new': 'Neue Benutzer',
    'nav-users': 'Benutzer',

    'project-list-add': 'Neues Projekt hinzufügen',
    'project-list-cancel': 'Abbrechen',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'das ausgewählte Projekt', 'diese 2 Projekte');
        return `Möchten Sie ${project} wirklich archivieren?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'das ausgewählte Projekt', 'diese 2 Projekte');
        return `Möchten Sie ${project} wirklich wiederherstellen?`;
    },
    'project-list-deleted': 'Gelöscht',
    'project-list-edit': 'Projektliste bearbeiten',
    'project-list-save': 'Projektliste speichern',
    'project-list-status-archived': 'Archiviert',
    'project-list-status-deleted': 'Gelöscht',
    'project-list-title': 'Projekte',

    'project-summary-$title': (title) => {
        let text = 'Projekt';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': 'Zugangskontrolle',
    'project-summary-access-control-member-only': 'Die Projektinhalte sind auf Mitglieder beschränkt',
    'project-summary-access-control-non-member-comment': 'Nichtmitglieder können Geschichten kommentieren',
    'project-summary-access-control-non-member-view': 'Nichtmitglieder können Inhalte anzeigen',
    'project-summary-add': 'Neues Projekt hinzufügen',
    'project-summary-archive': 'Projekt archivieren',
    'project-summary-cancel': 'Abbrechen',
    'project-summary-confirm-archive': 'Möchtest Sie dieses Projekt wirklich archivieren?',
    'project-summary-confirm-delete': 'Möchten Sie dieses Projekt wirklich löschen?',
    'project-summary-confirm-restore': 'Möchten Sie dieses Projekt wirklich wiederherstellen?',
    'project-summary-delete': 'Projekt löschen',
    'project-summary-description': 'Beschreibung',
    'project-summary-edit': 'Projekt bearbeiten',
    'project-summary-emblem': 'Emblem',
    'project-summary-name': 'Kennung',
    'project-summary-new-members': 'Neue Mitglieder',
    'project-summary-new-members-auto-accept-guest': 'Gastbenutzer werden automatisch akzeptiert',
    'project-summary-new-members-auto-accept-user': 'Normale Benutzer werden automatisch akzeptiert',
    'project-summary-new-members-join-guest': 'Gastbenutzer können anfordern, dem Projekt beizutreten',
    'project-summary-new-members-join-user': 'Normale Benutzer können anfordern, dem Projekt beizutreten',
    'project-summary-new-members-manual': 'Mitglieder werden manuell hinzugefügt',
    'project-summary-other-actions': 'Andere Aktionen',
    'project-summary-restore': 'Projekt wiederherstellen',
    'project-summary-return': 'Zurück zur Projektliste',
    'project-summary-save': 'Projekt speichern',
    'project-summary-statistics': 'Aktivitäten',
    'project-summary-title': 'Name',

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, '1 anderes', '2 andere');
    },

    'repo-list-cancel': 'Abbrechen',
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, 'dieses Repository', 'diese 2 Repositorys');
        return `Möchten Sie ${repositories} wirklich aus dem Projekt entfernen?`;
    },
    'repo-list-edit': 'Repository-Liste bearbeiten',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Aktiviert',
    'repo-list-save': 'Repository-Liste speichern',
    'repo-list-title': 'Repositorys',

    'repo-summary-$title': (title) => {
        let text = `Repository`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': 'Abbrechen',
    'repo-summary-confirm-remove': 'Möchten Sie dieses Repository wirklich aus dem Projekt entfernen?',
    'repo-summary-confirm-restore': 'Möchten Sie dieses Repository wirklich erneut zum Projekt hinzufügen?',
    'repo-summary-edit': 'Repository bearbeiten',
    'repo-summary-gitlab-name': 'GitLab-Projektname',
    'repo-summary-issue-tracker': 'Bugtracker',
    'repo-summary-issue-tracker-disabled': 'Deaktiviert',
    'repo-summary-issue-tracker-enabled': 'Aktiviert',
    'repo-summary-remove': 'Repository entfernen',
    'repo-summary-restore': 'Repository wiederherstellen',
    'repo-summary-return': 'Zurück zur Repository-Liste',
    'repo-summary-save': 'Repository speichern',
    'repo-summary-statistics': 'Aktivitäten',
    'repo-summary-title': 'Name',

    'repository-tooltip-$count': (count) => {
        return cardinal(count, '1 Repository', '2 Repositorys');
    },

    'role-list-add': 'Neue Rolle hinzufügen',
    'role-list-cancel': 'Abbrechen',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'diese Rolle', 'diese 2 Rollen');
        return `Möchten Sie ${roles} wirklich deaktivieren?`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'diese Rolle', 'diese 2 Rollen');
        return `Möchten Sie ${roles} wirklich reaktivieren?`
    },
    'role-list-edit': 'Rollenliste bearbeiten',
    'role-list-save': 'Rollenliste speichern',
    'role-list-status-deleted': 'Gelöscht',
    'role-list-status-disabled': 'Deaktiviert',
    'role-list-title': 'Rollen',

    'role-summary-$title': (title) => {
        let text = 'Rolle';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': 'Neue Rolle hinzufügen',
    'role-summary-cancel': 'Abbrechen',
    'role-summary-confirm-delete': 'Möchten Sie diese Rolle wirklich löschen?',
    'role-summary-confirm-disable': 'Möchten Sie diese Rolle wirklich deaktivieren?',
    'role-summary-confirm-reactivate': 'Möchten Sie diese Rolle wirklich reaktivieren?',
    'role-summary-delete': 'Rolle löschen',
    'role-summary-description': 'Beschreibung',
    'role-summary-disable': 'Rolle deaktivieren',
    'role-summary-edit': 'Rolle bearbeiten',
    'role-summary-name': 'Kennung',
    'role-summary-rating': 'Priorität der Geschichten',
    'role-summary-rating-high': 'Hohe',
    'role-summary-rating-low': 'Niedrige',
    'role-summary-rating-normal': 'Normale',
    'role-summary-rating-very-high': 'Sehr hohe',
    'role-summary-rating-very-low': 'Sehr niedrige',
    'role-summary-reactivate': 'Rolle reaktivieren',
    'role-summary-return': 'Zurück zur Rollenliste',
    'role-summary-save': 'Rolle speichern',
    'role-summary-title': 'Name',
    'role-summary-users': 'Benutzer',

    'role-tooltip-$count-others': (count) => {
        return `${count} andere`;
    },

    'server-list-add': 'Neuen Server hinzuzufügen',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Erworben',
    'server-list-cancel': 'Abbrechen',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'diesen Server', 'diese 2 Server');
        return `Möchten Sie ${servers} wirklich deaktivieren?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'diesen Server', 'diese 2 Server');
        return `Möchten Sie ${servers} wirklich reaktivieren?`
    },
    'server-list-edit': 'Serverliste bearbeiten',
    'server-list-oauth-false': '',
    'server-list-oauth-true': 'Aktiv',
    'server-list-save': 'Serverliste speichern',
    'server-list-status-deleted': 'Gelöscht',
    'server-list-status-disabled': 'Deaktiviert',
    'server-list-title': 'Server',

    'server-summary-acquire': 'API-Zugriff erwerben',
    'server-summary-activities': 'Aktivitäten',
    'server-summary-add': 'Neuen Server hinzuzufügen',
    'server-summary-api-access': 'API-Zugriff',
    'server-summary-api-access-acquired': 'Administrativer Zugang erworben',
    'server-summary-api-access-not-applicable': 'Unzutreffend',
    'server-summary-api-access-pending': 'Warten auf Benutzeraktion',
    'server-summary-cancel': 'Abbrechen',
    'server-summary-confirm-delete': 'Möchten Sie diesen Server wirklich löschen?',
    'server-summary-confirm-disable': 'Möchten Sie diesen Server wirklich deaktivieren?',
    'server-summary-confirm-reactivate': 'Möchten Sie diesen Server wirklich reaktivieren?',
    'server-summary-delete': 'Server löschen',
    'server-summary-disable': 'Server deaktivieren',
    'server-summary-edit': 'Server bearbeiten',
    'server-summary-gitlab-admin': 'GitLab-Administrator',
    'server-summary-gitlab-external-user': 'Externer GitLab-Benutzer',
    'server-summary-gitlab-regular-user': 'Normaler GitLab-Benutzer',
    'server-summary-member-$name': (name) => {
        return `Server: ${name}`;
    },
    'server-summary-name': 'Kennung',
    'server-summary-new-user': 'Neuer Benutzer',
    'server-summary-new-users': 'Neuer Benutzer',
    'server-summary-oauth-app-id': 'App-ID',
    'server-summary-oauth-app-key': 'App-Schlüssel',
    'server-summary-oauth-app-secret': 'App-Geheimnis',
    'server-summary-oauth-application-id': 'Anwendungs-ID',
    'server-summary-oauth-application-secret': 'Anwendungsgeheimnis',
    'server-summary-oauth-callback-url': 'Rückruf-URL',
    'server-summary-oauth-client-id': 'Kunden-ID',
    'server-summary-oauth-client-secret': 'Kundengeheimnis',
    'server-summary-oauth-deauthorize-callback-url': 'Entauthorisierung-Rückruf-URL ',
    'server-summary-oauth-gitlab-url': 'GitLab-URL',
    'server-summary-oauth-redirect-uri': 'URI umleiten',
    'server-summary-oauth-redirect-url': 'URL umleiten',
    'server-summary-oauth-site-url': 'Seiten-URL',
    'server-summary-privacy-policy-url': 'URL der Datenschutzrichtlinie',
    'server-summary-reactivate': 'Server reaktivieren',
    'server-summary-return': 'Zurück zur Serverliste',
    'server-summary-role-none': 'Neuen Benutzern werden keine Rollen zugewiesen',
    'server-summary-roles': 'Rollenzuweisung',
    'server-summary-save': 'Server speichern',
    'server-summary-system-address-missing': 'Systemadresse wurde nicht festgelegt',
    'server-summary-terms-and-conditions-url': 'URL der Nutzungsbedingungen',
    'server-summary-test-oauth': 'OAuth-Integration testen',
    'server-summary-title': 'Name',
    'server-summary-type': 'Server-Typ',
    'server-summary-user-automatic-approval': 'Neue Benutzer werden automatisch genehmigt',
    'server-summary-user-import-disabled': 'Neue Benutzer können sich nicht über diesen Server registrieren',
    'server-summary-user-import-gitlab-admin-disabled': 'GitLab-Administratoren werden nicht importiert',
    'server-summary-user-import-gitlab-external-user-disabled': 'Externe Gitlab-Benutzer werden nicht importiert',
    'server-summary-user-import-gitlab-user-disabled': 'Normale Gitlab-Benutzer werden nicht importiert',
    'server-summary-user-type-admin': 'Administrator',
    'server-summary-user-type-guest': 'Gastbenutzer',
    'server-summary-user-type-moderator': 'Moderator',
    'server-summary-user-type-regular': 'Normaler Benutzer',
    'server-summary-whitelist': 'Weiße Liste für E-Mail-Adressen',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Hintergrundbild',
    'settings-cancel': 'Abbrechen',
    'settings-company-name': 'Firmenname',
    'settings-edit': 'Einstellungen bearbeiten',
    'settings-input-languages': 'Eingabesprachen',
    'settings-push-relay': 'Push-Benachrichtigung-Relais',
    'settings-save': 'Einstellungen speichern',
    'settings-site-address': 'Website-Adresse',
    'settings-site-description': 'Beschreibung',
    'settings-site-title': 'Websitename',
    'settings-title': 'Einstellungen',

    'sign-in-$title': (title) => {
        let text = `Anmelden`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': 'Antrag auf Zugang abgelehnt',
    'sign-in-error-account-disabled': 'Konto ist derzeit deaktiviert',
    'sign-in-error-existing-users-only': 'Nur autorisiertes Personal kann auf dieses System zugreifen',
    'sign-in-error-restricted-area': 'Benutzer ist kein Administrator',
    'sign-in-oauth': 'Anmelden durch OAuth',
    'sign-in-password': 'Passwort:',
    'sign-in-problem-incorrect-username-password': 'Falscher Benutzername oder Passwort',
    'sign-in-problem-no-support-for-username-password': 'System akzeptiert kein Passwort',
    'sign-in-problem-unexpected-error': 'Unerwarteter Fehler aufgetreten',
    'sign-in-submit': 'Anmelden',
    'sign-in-username': 'Benutzername:',

    'sign-off-menu-sign-off': 'Abmelden',

    'table-heading-api-access': 'API-Zugriff',
    'table-heading-date-range': 'Aktive Periode',
    'table-heading-email': 'E-Mail-Addresse',
    'table-heading-issue-tracker': 'Bugtracker',
    'table-heading-last-modified': 'Bearbeitet',
    'table-heading-last-month': 'Letzter Monat',
    'table-heading-name': 'Name',
    'table-heading-oauth': 'OAuth-Authentifizierung',
    'table-heading-projects': 'Projekte',
    'table-heading-repositories': 'Repositorys',
    'table-heading-roles': 'Rollen',
    'table-heading-server': 'Server',
    'table-heading-this-month': 'Dieser Monat',
    'table-heading-title': 'Name',
    'table-heading-to-date': 'Bis heute',
    'table-heading-type': 'Typ',
    'table-heading-username': 'Benutzername',
    'table-heading-users': 'Benutzer',

    'task-$seconds': (seconds) => {
        return cardinal(count, '1 Sekunde', '2 Sekunden');
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 Commit-Kommentar', '2 Commit-Kommentare');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${comments} ${were} aus dem Repository “${repo}” importiert`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, '1 Ereignis', '2 Ereignisse');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${events} ${were} aus dem Repository “${repo}” importiert`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 Problemkommentar', '2 Problemkommentare');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${comments} ${were} aus dem Repository “${repo}” importiert`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 Merge-Request-Kommentar', '2 Merge-Request-Kommentare');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${comments} ${were} aus dem Repository “${repo}” importiert`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, '1 Repository', '2 Repositorys');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${repos} ${were} importiert`;
    },
    'task-imported-$count-users': (count) => {
        let users = `${count} Benutzer`;
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${users} ${were} importiert`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        return `Push mit ${count} aus dem Branch “${branch}” des Repositorys “${repo}” wurde importiert.`
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Commit-Kommentare werden aus dem Repository “${repo}” importiert`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Ereignisse werden aus dem Repository “${repo}” importiert`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Problemkommentare werden aus dem Repository “${repo}” importiert`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Merge-Request-Kommentare werden aus dem Repository “${repo}” importiert`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Push wird aus dem Repository “${repo}” importiert`;
    },
    'task-importing-repos': 'Repositorys werden importiert',
    'task-importing-users': 'Benutzer werden importiert',
    'task-installed-$count-hooks': (count) => {
        let hooks = `${count} Webhaken`;
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${hooks} ${were} installiert`;
    },
    'task-installing-hooks': 'Webhaken werden deinstalliert',
    'task-removed-$count-hooks': (count) => {
        let hooks = `${count} Webhaken`;
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${hooks} ${were} deinstalliert`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, '1 Repository', '2 Repositorys');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${repos} ${were} entfernt`;
    },
    'task-removed-$count-users': (count) => {
        let users = `${count} Benutzer`;
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${users} ${were} entfernt`;
    },
    'task-removing-hooks': 'Webhaken werden deinstalliert',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, '1 Repository', '2 Repositorys');
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${repos} ${were} aktualisiert`;
    },
    'task-updated-$count-users': (count) => {
        let users = `${count} Benutzer`;
        let were = (count === 1) ? `wurde` : `wurden`;
        return `${users} ${were} aktualisiert`;
    },

    'text-field-placeholder-none': 'keiner',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' und ', tooltip ];
    },
    'tooltip-more': 'Mehr',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 Datei', '2 Dateien');
        let are = (count === 1) ? `wird` : `werden`;
        return `${files} ${are} hochgeladen, ${size} übrig`;
    },

    'user-list-add': 'Neuen Benutzer hinzufügen',
    'user-list-approve-all': 'Alle Anfragen genehmigen',
    'user-list-cancel': 'Abbrechen',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'diesen Benutzer', 'diese 2 Benutzer');
        return `Möchten Sie ${accounts} wirklich deaktivieren?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'diesen Benutzer', 'diese 2 Benutzer');
        return `Möchten Sie ${accounts} wirklich reaktivieren?`
    },
    'user-list-edit': 'Benutzerliste bearbeiten',
    'user-list-reject-all': 'Alle Anfragen ablehnen',
    'user-list-save': 'Benutzerliste speichern',
    'user-list-status-deleted': 'Gelöscht',
    'user-list-status-disabled': 'Deaktiviert',
    'user-list-status-pending': 'Bestätigung ausstehend',
    'user-list-title': 'Benutzer',
    'user-list-type-admin': 'Administrator',
    'user-list-type-guest': 'Gastbenutzer',
    'user-list-type-moderator': 'Moderator',
    'user-list-type-regular': 'Normaler Benutzer',
    'user-summary-$name': (name) => {
        let text = 'Benutzer';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': 'Neuen Benutzer hinzufügen',
    'user-summary-cancel': 'Abbrechen',
    'user-summary-confirm-delete': 'Möchten Sie diesen Benutzer wirklich löschen?',
    'user-summary-confirm-disable': 'Möchten Sie diesen Benutzer wirklich deaktivieren?',
    'user-summary-confirm-reactivate': 'Möchten Sie diesen Benutzer wirklich deaktivieren?',
    'user-summary-delete': 'Benutzer löschen',
    'user-summary-disable': 'Benutzer deaktivieren',
    'user-summary-edit': 'Benutzer bearbeiten',
    'user-summary-email': 'E-Mail-Addresse',
    'user-summary-github': 'GitHub-Profil-URL',
    'user-summary-gitlab': 'GitLab-Profil-URL',
    'user-summary-ichat': 'iChat-Benutzername',
    'user-summary-linkedin': 'Linkedin-Profil-URL',
    'user-summary-member-$name': (name) => {
        let text = 'Mitglied';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': 'Mitglied bearbeiten',
    'user-summary-member-return': 'Zurück zur Mitgliederliste',
    'user-summary-member-save': 'Mitglied speichern',
    'user-summary-name': 'Name',
    'user-summary-phone': 'Telefonnummer',
    'user-summary-profile-image': 'Profilbild',
    'user-summary-reactivate': 'Benutzer reaktivieren',
    'user-summary-return': 'Zurück zur Benutzerliste',
    'user-summary-role-none': 'Keiner',
    'user-summary-roles': 'Rollen',
    'user-summary-save': 'Benutzer speichern',
    'user-summary-skype': 'Skype-Benutzername',
    'user-summary-slack': 'Slack-Benutzer-ID',
    'user-summary-slack-team': 'Slack-Team-ID',
    'user-summary-social-links': 'Soziale Netzwerklinks',
    'user-summary-stackoverflow': 'StackOverflow-Profil-URL',
    'user-summary-statistics': 'Aktivitäten',
    'user-summary-twitter': 'Twitter-Benutzername',
    'user-summary-type': 'Benutzertyp',
    'user-summary-type-admin': 'Administrator',
    'user-summary-type-guest': 'Gastbenutzer',
    'user-summary-type-moderator': 'Moderator',
    'user-summary-type-regular': 'Normaler Benutzer',
    'user-summary-username': 'Benutzername',

    'user-tooltip-$count': (count) => {
        return `Benutzer`;
    },

    'validation-duplicate-project-name': 'Ein Projekt mit dieser Kennung existiert bereits',
    'validation-duplicate-role-name': 'Eine Rolle mit dieser Kennung existiert bereits',
    'validation-duplicate-server-name': 'Ein Server mit dieser Kennung existiert bereits',
    'validation-duplicate-user-name': 'Ein Benutzer mit diesem Namen existiert bereits',
    'validation-illegal-project-name': 'Die Projektkennung darf nicht "global", "admin", "public" oder "srv" sein',
    'validation-localhost-is-wrong': '"localhost" ist nicht gültig',
    'validation-password-for-admin-only': 'Nur Administratoren können sich mit einem Passwort anmelden',
    'validation-required': 'Erforderlich',

    'welcome': 'Willkommen!',
};

export {
    phrases,
};
