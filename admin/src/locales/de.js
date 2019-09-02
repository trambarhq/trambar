import 'moment/locale/de';
import 'moment/locale/de-at';
import 'moment/locale/de-ch';
import { cardinal } from 'common/locale/grammars/german.mjs';

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
    'member-list-column-date-range': 'Aktive Periode',
    'member-list-column-email': 'E-Mail-Addresse',
    'member-list-column-last-modified': 'Bearbeitet',
    'member-list-column-last-month': 'Letzter Monat',
    'member-list-column-name': 'Name',
    'member-list-column-roles': 'Rollen',
    'member-list-column-this-month': 'Dieser Monat',
    'member-list-column-to-date': 'Bis heute',
    'member-list-column-type': 'Typ',
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
    'nav-spreadsheetss': 'Excel-Dateien',
    'nav-user-new': 'Neue Benutzer',
    'nav-users': 'Benutzer',
    'nav-website': 'Webseite',
    'nav-wikis': 'GitLab-Wikis',

    'project-list-add': 'Neues Projekt hinzufügen',
    'project-list-cancel': 'Abbrechen',
    'project-list-column-date-range': 'Aktive Periode',
    'project-list-column-last-modified': 'Bearbeitet',
    'project-list-column-last-month': 'Letzter Monat',
    'project-list-column-name': 'Name',
    'project-list-column-repositories': 'Repositorys',
    'project-list-column-this-month': 'Dieser Monat',
    'project-list-column-to-date': 'Bis heute',
    'project-list-column-users': 'Benutzer',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'das ausgewählte Projekt', 'diese 2 Projekte');
        return `Möchten Sie ${project} wirklich archivieren?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'das ausgewählte Projekt', 'diese 2 Projekte');
        return `Möchten Sie ${project} wirklich wiederherstellen?`;
    },
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
    'repo-list-column-date-range': 'Aktive Periode',
    'repo-list-column-issue-tracker': 'Bugtracker',
    'repo-list-column-last-modified': 'Bearbeitet',
    'repo-list-column-last-month': 'Letzter Monat',
    'repo-list-column-server': 'Server',
    'repo-list-column-this-month': 'Dieser Monat',
    'repo-list-column-title': 'Name',
    'repo-list-column-to-date': 'Bis heute',
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
    'role-list-column-last-modified': 'Bearbeitet',
    'role-list-column-title': 'Name',
    'role-list-column-users': 'Benutzer',
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
    'server-list-column-api-access': 'API-Zugriff',
    'server-list-column-last-modified': 'Bearbeitet',
    'server-list-column-oauth': 'OAuth-Authentifizierung',
    'server-list-column-title': 'Name',
    'server-list-column-type': 'Typ',
    'server-list-column-users': 'Benutzer',
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

    'tz-name-abidjan': 'Abidjan',
    'tz-name-accra': 'Accra',
    'tz-name-acre': 'Acre',
    'tz-name-act': 'Australisches Hauptstadtterritorium',
    'tz-name-adak': 'Adak',
    'tz-name-addis-ababa': 'Addis Abeba',
    'tz-name-adelaide': 'Adelaide',
    'tz-name-aden': 'Aden',
    'tz-name-africa': 'Afrika',
    'tz-name-alaska': 'Alaska',
    'tz-name-aleutian': 'Aleuten',
    'tz-name-algiers': 'Algier',
    'tz-name-almaty': 'Almaty',
    'tz-name-america': 'Amerika',
    'tz-name-amman': 'Amman',
    'tz-name-amsterdam': 'Amsterdam',
    'tz-name-anadyr': 'Anadyr',
    'tz-name-anchorage': 'Anchorage',
    'tz-name-andorra': 'Andorra',
    'tz-name-anguilla': 'Anguilla',
    'tz-name-antananarivo': 'Antananarivo',
    'tz-name-antarctica': 'Antarktis',
    'tz-name-antigua': 'Antigua',
    'tz-name-apia': 'Apia',
    'tz-name-aqtau': 'Aqtau',
    'tz-name-aqtobe': 'Aqtobe',
    'tz-name-araguaina': 'Araguaina',
    'tz-name-arctic': 'Arktis',
    'tz-name-argentina': 'Argentinien',
    'tz-name-arizona': 'Arizona',
    'tz-name-aruba': 'Aruba',
    'tz-name-ashgabat': 'Ashgabat',
    'tz-name-ashkhabad': 'Ashkhabad',
    'tz-name-asia': 'Asien',
    'tz-name-asmara': 'Asmara',
    'tz-name-asmera': 'Asmera',
    'tz-name-astrakhan': 'Astrachan',
    'tz-name-asuncion': 'Asuncion',
    'tz-name-athens': 'Athen',
    'tz-name-atikokan': 'Atikokan',
    'tz-name-atka': 'Atka',
    'tz-name-atlantic': 'atlantisch',
    'tz-name-atyrau': 'Atyrau',
    'tz-name-auckland': 'Auckland',
    'tz-name-australia': 'Australien',
    'tz-name-azores': 'Azoren',
    'tz-name-baghdad': 'Bagdad',
    'tz-name-bahia': 'Bahia',
    'tz-name-bahia-banderas': 'Bahia Banderas',
    'tz-name-bahrain': 'Bahrain',
    'tz-name-baja-norte': 'Baja Norte',
    'tz-name-baja-sur': 'Baja Sur',
    'tz-name-baku': 'Baku',
    'tz-name-bamako': 'Bamako',
    'tz-name-bangkok': 'Bangkok',
    'tz-name-bangui': 'Bangui',
    'tz-name-banjul': 'Banjul',
    'tz-name-barbados': 'Barbados',
    'tz-name-barnaul': 'Barnaul',
    'tz-name-beirut': 'Beirut',
    'tz-name-belem': 'Belem',
    'tz-name-belfast': 'Belfast',
    'tz-name-belgrade': 'Belgrad',
    'tz-name-belize': 'Belize',
    'tz-name-berlin': 'Berlin',
    'tz-name-bermuda': 'Bermuda',
    'tz-name-beulah': 'Beulah',
    'tz-name-bishkek': 'Bischkek',
    'tz-name-bissau': 'Bissau',
    'tz-name-blanc-sablon': 'Blanc-Sablon',
    'tz-name-blantyre': 'Blantyre',
    'tz-name-boa-vista': 'Boa Vista',
    'tz-name-bogota': 'Bogota',
    'tz-name-boise': 'Boise',
    'tz-name-bougainville': 'Bougainville',
    'tz-name-bratislava': 'Bratislava',
    'tz-name-brazil': 'Brasilien',
    'tz-name-brazzaville': 'Brazzaville',
    'tz-name-brisbane': 'Brisbane',
    'tz-name-broken-hill': 'Broken Hill',
    'tz-name-brunei': 'Brunei',
    'tz-name-brussels': 'Brüssel',
    'tz-name-bucharest': 'Bukarest',
    'tz-name-budapest': 'Budapest',
    'tz-name-buenos-aires': 'Buenos Aires',
    'tz-name-bujumbura': 'Bujumbura',
    'tz-name-busingen': 'Busingen',
    'tz-name-cairo': 'Kairo',
    'tz-name-calcutta': 'Kalkutta',
    'tz-name-cambridge-bay': 'Cambridge Bay',
    'tz-name-campo-grande': 'Campo Grande',
    'tz-name-canada': 'Kanada',
    'tz-name-canary': 'Kanarische Inseln',
    'tz-name-canberra': 'Canberra',
    'tz-name-cancun': 'Cancun',
    'tz-name-cape-verde': 'Kap Verde',
    'tz-name-caracas': 'Caracas',
    'tz-name-casablanca': 'Casablanca',
    'tz-name-casey': 'Casey',
    'tz-name-catamarca': 'Catamarca',
    'tz-name-cayenne': 'Cayenne',
    'tz-name-cayman': 'Cayman',
    'tz-name-center': 'Center',
    'tz-name-central': 'Zentral',
    'tz-name-ceuta': 'Ceuta',
    'tz-name-chagos': 'Chagos',
    'tz-name-chatham': 'Chatham',
    'tz-name-chicago': 'Chicago',
    'tz-name-chihuahua': 'Chihuahua',
    'tz-name-chile': 'Chile',
    'tz-name-chisinau': 'Chisinau',
    'tz-name-chita': 'Chita',
    'tz-name-choibalsan': 'Tschoibalsan',
    'tz-name-chongqing': 'Chongqing',
    'tz-name-christmas': 'Weihnachtsinsel',
    'tz-name-chungking': 'Chongqing',
    'tz-name-chuuk': 'Chuuk',
    'tz-name-cocos': 'Kokosinseln',
    'tz-name-colombo': 'Colombo',
    'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
    'tz-name-comoro': 'Comoro',
    'tz-name-conakry': 'Conakry',
    'tz-name-continental': 'Kontinental',
    'tz-name-copenhagen': 'Kopenhagen',
    'tz-name-coral-harbour': 'Coral Harbour',
    'tz-name-cordoba': 'Cordoba',
    'tz-name-costa-rica': 'Costa Rica',
    'tz-name-creston': 'Creston',
    'tz-name-cuiaba': 'Cuiaba',
    'tz-name-curacao': 'Curacao',
    'tz-name-currie': 'Currie',
    'tz-name-dacca': 'Dacca',
    'tz-name-dakar': 'Dakar',
    'tz-name-damascus': 'Damaskus',
    'tz-name-danmarkshavn': 'Danmarkshavn',
    'tz-name-dar-es-salaam': 'Dar es Salaam',
    'tz-name-darwin': 'Darwin',
    'tz-name-davis': 'Davis',
    'tz-name-dawson': 'Dawson',
    'tz-name-dawson-creek': 'Dawson Creek',
    'tz-name-de-noronha': 'De Noronha',
    'tz-name-denver': 'Denver',
    'tz-name-detroit': 'Detroit',
    'tz-name-dhaka': 'Dhaka',
    'tz-name-dili': 'Dili',
    'tz-name-djibouti': 'Dschibuti',
    'tz-name-dominica': 'Dominica',
    'tz-name-douala': 'Douala',
    'tz-name-dubai': 'Dubai',
    'tz-name-dublin': 'Dublin',
    'tz-name-dumont-d-urville': 'Dumont d’Urville',
    'tz-name-dushanbe': 'Duschanbe',
    'tz-name-east': 'Osten',
    'tz-name-east-indiana': 'East Indiana',
    'tz-name-easter': 'Osterinsel',
    'tz-name-easter-island': 'Osterinsel',
    'tz-name-eastern': 'Eastern',
    'tz-name-edmonton': 'Edmonton',
    'tz-name-efate': 'Efate',
    'tz-name-eirunepe': 'Eirunepe',
    'tz-name-el-aaiun': 'El Aaiun',
    'tz-name-el-salvador': 'El Salvador',
    'tz-name-enderbury': 'Enderbury',
    'tz-name-ensenada': 'Ensenada',
    'tz-name-eucla': 'Eucla',
    'tz-name-europe': 'Europa',
    'tz-name-faeroe': 'Färöer',
    'tz-name-fakaofo': 'Fakaofo',
    'tz-name-famagusta': 'Famagusta',
    'tz-name-faroe': 'Färöer',
    'tz-name-fiji': 'Fidschi',
    'tz-name-fort-nelson': 'Fort Nelson',
    'tz-name-fort-wayne': 'Fort Wayne',
    'tz-name-fortaleza': 'Fortaleza',
    'tz-name-freetown': 'Freetown',
    'tz-name-funafuti': 'Funafuti',
    'tz-name-gaborone': 'Gaborone',
    'tz-name-galapagos': 'Galapagos',
    'tz-name-gambier': 'Gambier',
    'tz-name-gaza': 'Gaza',
    'tz-name-general': 'Allgemeines',
    'tz-name-gibraltar': 'Gibraltar',
    'tz-name-glace-bay': 'Glace Bay',
    'tz-name-godthab': 'Godthab',
    'tz-name-goose-bay': 'Goose Bay',
    'tz-name-grand-turk': 'Grand Turk',
    'tz-name-grenada': 'Grenada',
    'tz-name-guadalcanal': 'Guadalcanal',
    'tz-name-guadeloupe': 'Guadeloupe',
    'tz-name-guam': 'Guam',
    'tz-name-guatemala': 'Guatemala',
    'tz-name-guayaquil': 'Guayaquil',
    'tz-name-guernsey': 'Guernsey',
    'tz-name-guyana': 'Guyana',
    'tz-name-halifax': 'Halifax',
    'tz-name-harare': 'Harare',
    'tz-name-harbin': 'Harbin',
    'tz-name-havana': 'Havanna',
    'tz-name-hawaii': 'Hawaii',
    'tz-name-hebron': 'Hebron',
    'tz-name-helsinki': 'Helsinki',
    'tz-name-hermosillo': 'Hermosillo',
    'tz-name-ho-chi-minh': 'Ho Chi Minh',
    'tz-name-hobart': 'Hobart',
    'tz-name-hong-kong': 'Hongkong',
    'tz-name-honolulu': 'Honolulu',
    'tz-name-hovd': 'Hovd',
    'tz-name-indian': 'Indischer Ozean',
    'tz-name-indiana': 'Indiana',
    'tz-name-indiana-starke': 'Indiana-Starke',
    'tz-name-indianapolis': 'Indianapolis',
    'tz-name-inuvik': 'Inuvik',
    'tz-name-iqaluit': 'Iqaluit',
    'tz-name-irkutsk': 'Irkutsk',
    'tz-name-isle-of-man': 'Isle of Man',
    'tz-name-istanbul': 'Istanbul',
    'tz-name-jakarta': 'Jakarta',
    'tz-name-jamaica': 'Jamaika',
    'tz-name-jan-mayen': 'Jan Mayen',
    'tz-name-jayapura': 'Jayapura',
    'tz-name-jersey': 'Jersey',
    'tz-name-jerusalem': 'Jerusalem',
    'tz-name-johannesburg': 'Johannesburg',
    'tz-name-johnston': 'Johnston',
    'tz-name-juba': 'Juba',
    'tz-name-jujuy': 'Jujuy',
    'tz-name-juneau': 'Juneau',
    'tz-name-kabul': 'Kabul',
    'tz-name-kaliningrad': 'Kaliningrad',
    'tz-name-kamchatka': 'Kamtschatka',
    'tz-name-kampala': 'Kampala',
    'tz-name-karachi': 'Karachi',
    'tz-name-kashgar': 'Kashgar',
    'tz-name-kathmandu': 'Kathmandu',
    'tz-name-katmandu': 'Katmandu',
    'tz-name-kentucky': 'Kentucky',
    'tz-name-kerguelen': 'Kerguelen',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': 'Khartum',
    'tz-name-kiev': 'Kiew',
    'tz-name-kigali': 'Kigali',
    'tz-name-kinshasa': 'Kinshasa',
    'tz-name-kiritimati': 'Kiritimati',
    'tz-name-kirov': 'Kirov',
    'tz-name-knox': 'Knox',
    'tz-name-knox-in': 'Knox, Indiana',
    'tz-name-kolkata': 'Kolkata',
    'tz-name-kosrae': 'Kosrae',
    'tz-name-kralendijk': 'Kralendijk',
    'tz-name-krasnoyarsk': 'Krasnojarsk',
    'tz-name-kuala-lumpur': 'Kuala Lumpur',
    'tz-name-kuching': 'Kuching',
    'tz-name-kuwait': 'Kuwait',
    'tz-name-kwajalein': 'Kwajalein',
    'tz-name-la-paz': 'La Paz',
    'tz-name-la-rioja': 'La Rioja',
    'tz-name-lagos': 'Lagos',
    'tz-name-lhi': 'Lord Howe Island',
    'tz-name-libreville': 'Libreville',
    'tz-name-lima': 'Lima',
    'tz-name-lindeman': 'Lindeman',
    'tz-name-lisbon': 'Lissabon',
    'tz-name-ljubljana': 'Ljubljana',
    'tz-name-lome': 'Lome',
    'tz-name-london': 'London',
    'tz-name-longyearbyen': 'Longyearbyen',
    'tz-name-lord-howe': 'Lord Howe',
    'tz-name-los-angeles': 'Los Angeles',
    'tz-name-louisville': 'Louisville',
    'tz-name-lower-princes': 'Lower Prince’s Quarter ',
    'tz-name-luanda': 'Luanda',
    'tz-name-lubumbashi': 'Lubumbashi',
    'tz-name-lusaka': 'Lusaka',
    'tz-name-luxembourg': 'Luxemburg',
    'tz-name-macao': 'Macao',
    'tz-name-macau': 'Macau',
    'tz-name-maceio': 'Maceio',
    'tz-name-macquarie': 'Macquarie',
    'tz-name-madeira': 'Madeira',
    'tz-name-madrid': 'Madrid',
    'tz-name-magadan': 'Magadan',
    'tz-name-mahe': 'Mahe',
    'tz-name-majuro': 'Majuro',
    'tz-name-makassar': 'Makassar',
    'tz-name-malabo': 'Malabo',
    'tz-name-maldives': 'Malediven',
    'tz-name-malta': 'Malta',
    'tz-name-managua': 'Managua',
    'tz-name-manaus': 'Manaus',
    'tz-name-manila': 'Manila',
    'tz-name-maputo': 'Maputo',
    'tz-name-marengo': 'Marengo',
    'tz-name-mariehamn': 'Mariehamn',
    'tz-name-marigot': 'Marigot',
    'tz-name-marquesas': 'Marquesas',
    'tz-name-martinique': 'Martinique',
    'tz-name-maseru': 'Maseru',
    'tz-name-matamoros': 'Matamoros',
    'tz-name-mauritius': 'Mauritius',
    'tz-name-mawson': 'Mawson',
    'tz-name-mayotte': 'Mayotte',
    'tz-name-mazatlan': 'Mazatlan',
    'tz-name-mbabane': 'Mbabane',
    'tz-name-mc-murdo': 'McMurdo',
    'tz-name-melbourne': 'Melbourne',
    'tz-name-mendoza': 'Mendoza',
    'tz-name-menominee': 'Menominee',
    'tz-name-merida': 'Merida',
    'tz-name-metlakatla': 'Metlakatla',
    'tz-name-mexico': 'Mexiko',
    'tz-name-mexico-city': 'Mexiko Stadt',
    'tz-name-michigan': 'Michigan',
    'tz-name-midway': 'Midway',
    'tz-name-minsk': 'Minsk',
    'tz-name-miquelon': 'Miquelon',
    'tz-name-mogadishu': 'Mogadischu',
    'tz-name-monaco': 'Monaco',
    'tz-name-moncton': 'Moncton',
    'tz-name-monrovia': 'Monrovia',
    'tz-name-monterrey': 'Monterrey',
    'tz-name-montevideo': 'Montevideo',
    'tz-name-monticello': 'Monticello',
    'tz-name-montreal': 'Montreal',
    'tz-name-montserrat': 'Montserrat',
    'tz-name-moscow': 'Moskau',
    'tz-name-mountain': 'Berg',
    'tz-name-muscat': 'Muscat',
    'tz-name-nairobi': 'Nairobi',
    'tz-name-nassau': 'Nassau',
    'tz-name-nauru': 'Nauru',
    'tz-name-ndjamena': 'Ndjamena',
    'tz-name-new-salem': 'New Salem',
    'tz-name-new-york': 'New York',
    'tz-name-newfoundland': 'Neufundland',
    'tz-name-niamey': 'Niamey',
    'tz-name-nicosia': 'Nikosia',
    'tz-name-nipigon': 'Nipigon',
    'tz-name-niue': 'Niue',
    'tz-name-nome': 'Nome',
    'tz-name-norfolk': 'Norfolk',
    'tz-name-noronha': 'Noronha',
    'tz-name-north': 'Norden',
    'tz-name-north-dakota': 'Norddakota',
    'tz-name-nouakchott': 'Nouakchott',
    'tz-name-noumea': 'Noumea',
    'tz-name-novokuznetsk': 'Novokuznetsk',
    'tz-name-novosibirsk': 'Nowosibirsk',
    'tz-name-nsw': 'New South Wales',
    'tz-name-ojinaga': 'Ojinaga',
    'tz-name-omsk': 'Omsk',
    'tz-name-oral': 'Oral',
    'tz-name-oslo': 'Oslo',
    'tz-name-ouagadougou': 'Ouagadougou',
    'tz-name-pacific': 'Pazifik',
    'tz-name-pacific-new': 'Pazifik-Neu',
    'tz-name-pago-pago': 'Pago Pago',
    'tz-name-palau': 'Palau',
    'tz-name-palmer': 'Palmer',
    'tz-name-panama': 'Panama',
    'tz-name-pangnirtung': 'Pangnirtung',
    'tz-name-paramaribo': 'Paramaribo',
    'tz-name-paris': 'Paris',
    'tz-name-perth': 'Perth',
    'tz-name-petersburg': 'Petersburg',
    'tz-name-phnom-penh': 'Phnom Penh',
    'tz-name-phoenix': 'Phönix',
    'tz-name-pitcairn': 'Pitcairn',
    'tz-name-podgorica': 'Podgorica',
    'tz-name-pohnpei': 'Pohnpei',
    'tz-name-ponape': 'Ponape',
    'tz-name-pontianak': 'Pontianak',
    'tz-name-port-au-prince': 'Port-au-Prince',
    'tz-name-port-moresby': 'Hafen von Moresby',
    'tz-name-port-of-spain': 'Hafen von Spanien',
    'tz-name-porto-acre': 'Porto Acre',
    'tz-name-porto-novo': 'Porto-Novo',
    'tz-name-porto-velho': 'Porto Velho',
    'tz-name-prague': 'Prag',
    'tz-name-puerto-rico': 'Puerto Rico',
    'tz-name-punta-arenas': 'Punta Arenas',
    'tz-name-pyongyang': 'Pjöngjang',
    'tz-name-qatar': 'Katar',
    'tz-name-qostanay': 'Qostanay',
    'tz-name-queensland': 'Queensland',
    'tz-name-qyzylorda': 'Qyzylorda',
    'tz-name-rainy-river': 'Regnerischer Fluss',
    'tz-name-rangoon': 'Rangun',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': 'Rarotonga',
    'tz-name-recife': 'Recife',
    'tz-name-regina': 'Regina',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': 'Réunion',
    'tz-name-reykjavik': 'Reykjavik',
    'tz-name-riga': 'Riga',
    'tz-name-rio-branco': 'Rio Branco',
    'tz-name-rio-gallegos': 'Rio Gallegos',
    'tz-name-riyadh': 'Riad',
    'tz-name-rome': 'Rom',
    'tz-name-rosario': 'Rosario',
    'tz-name-rothera': 'Rothera',
    'tz-name-saigon': 'Saigon',
    'tz-name-saipan': 'Saipan',
    'tz-name-sakhalin': 'Sachalin',
    'tz-name-salta': 'Salta',
    'tz-name-samara': 'Samara',
    'tz-name-samarkand': 'Samarkand',
    'tz-name-samoa': 'Samoa',
    'tz-name-san-juan': 'San Juan',
    'tz-name-san-luis': 'San Luis',
    'tz-name-san-marino': 'San Marino',
    'tz-name-santa-isabel': 'Santa Isabel',
    'tz-name-santarem': 'Santarem',
    'tz-name-santiago': 'Santiago',
    'tz-name-santo-domingo': 'Santo Domingo',
    'tz-name-sao-paulo': 'Sao Paulo',
    'tz-name-sao-tome': 'Sao Tome',
    'tz-name-sarajevo': 'Sarajevo',
    'tz-name-saratov': 'Saratov',
    'tz-name-saskatchewan': 'Saskatchewan',
    'tz-name-scoresbysund': 'Scoresbysund',
    'tz-name-seoul': 'Seoul',
    'tz-name-shanghai': 'Shanghai',
    'tz-name-shiprock': 'Shiprock',
    'tz-name-simferopol': 'Simferopol',
    'tz-name-singapore': 'Singapur',
    'tz-name-sitka': 'Sitka',
    'tz-name-skopje': 'Skopje',
    'tz-name-sofia': 'Sofia',
    'tz-name-south': 'Süden',
    'tz-name-south-georgia': 'Südgeorgien',
    'tz-name-south-pole': 'Südpol',
    'tz-name-srednekolymsk': 'Srednekolymsk',
    'tz-name-st-barthelemy': 'St. Barthelemy',
    'tz-name-st-helena': 'St. Helena',
    'tz-name-st-johns': 'Sankt Johannes',
    'tz-name-st-kitts': 'St. Kitts',
    'tz-name-st-lucia': 'St. Lucia',
    'tz-name-st-thomas': 'St. Thomas',
    'tz-name-st-vincent': 'St. Vincent',
    'tz-name-stanley': 'Stanley',
    'tz-name-stockholm': 'Stockholm',
    'tz-name-swift-current': 'Swift Current',
    'tz-name-sydney': 'Sydney',
    'tz-name-syowa': 'Syowa',
    'tz-name-tahiti': 'Tahiti',
    'tz-name-taipei': 'Taipei',
    'tz-name-tallinn': 'Tallinn',
    'tz-name-tarawa': 'Tarawa',
    'tz-name-tashkent': 'Taschkent',
    'tz-name-tasmania': 'Tasmanien',
    'tz-name-tbilisi': 'Tiflis',
    'tz-name-tegucigalpa': 'Tegucigalpa',
    'tz-name-tehran': 'Teheran',
    'tz-name-tel-aviv': 'Tel Aviv',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': 'Thimbu',
    'tz-name-thimphu': 'Thimphu',
    'tz-name-thule': 'Thule',
    'tz-name-thunder-bay': 'Thunder Bay',
    'tz-name-tijuana': 'Tijuana',
    'tz-name-timbuktu': 'Timbuktu',
    'tz-name-tirane': 'Tirane',
    'tz-name-tiraspol': 'Tiraspol',
    'tz-name-tokyo': 'Tokyo',
    'tz-name-tomsk': 'Tomsk',
    'tz-name-tongatapu': 'Tongatapu',
    'tz-name-toronto': 'Toronto',
    'tz-name-tortola': 'Tortola',
    'tz-name-tripoli': 'Tripolis',
    'tz-name-troll': 'Troll',
    'tz-name-truk': 'Truk',
    'tz-name-tucuman': 'Tucuman',
    'tz-name-tunis': 'Tunis',
    'tz-name-ujung-pandang': 'Ujung Pandang',
    'tz-name-ulaanbaatar': 'Ulaanbaatar',
    'tz-name-ulan-bator': 'Ulan Bator',
    'tz-name-ulyanovsk': 'Uljanowsk',
    'tz-name-urumqi': 'Urumqi',
    'tz-name-us': 'Vereinigte Staaten',
    'tz-name-ushuaia': 'Ushuaia',
    'tz-name-ust-nera': 'Ust-Nera',
    'tz-name-uzhgorod': 'Uschgorod',
    'tz-name-vaduz': 'Vaduz',
    'tz-name-vancouver': 'Vancouver',
    'tz-name-vatican': 'Vatikan',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': 'Victoria',
    'tz-name-vienna': 'Wien',
    'tz-name-vientiane': 'Vientiane',
    'tz-name-vilnius': 'Vilnius',
    'tz-name-vincennes': 'Vincennes',
    'tz-name-virgin': 'Jungferninseln',
    'tz-name-vladivostok': 'Wladiwostok',
    'tz-name-volgograd': 'Wolgograd',
    'tz-name-vostok': 'Wostok',
    'tz-name-wake': 'Wake Island',
    'tz-name-wallis': 'Wallis',
    'tz-name-warsaw': 'Warschau',
    'tz-name-west': 'Westen',
    'tz-name-whitehorse': 'Weißes Pferd',
    'tz-name-winamac': 'Winamac',
    'tz-name-windhoek': 'Windhoek',
    'tz-name-winnipeg': 'Winnipeg',
    'tz-name-yakutat': 'Yakutat',
    'tz-name-yakutsk': 'Jakutsk',
    'tz-name-yancowinna': 'Yancowinna',
    'tz-name-yangon': 'Yangon',
    'tz-name-yap': 'Yap',
    'tz-name-yekaterinburg': 'Jekaterinburg',
    'tz-name-yellowknife': 'Gelbmesser',
    'tz-name-yerevan': 'Eriwan',
    'tz-name-yukon': 'Yukon',
    'tz-name-zagreb': 'Zagreb',
    'tz-name-zaporozhye': 'Zaporozhye',
    'tz-name-zurich': 'Zürich',

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
    'user-list-column-email': 'E-Mail-Addresse',
    'user-list-column-last-modified': 'Bearbeitet',
    'user-list-column-name': 'Name',
    'user-list-column-projects': 'Projekte',
    'user-list-column-roles': 'Rollen',
    'user-list-column-type': 'Typ',
    'user-list-column-username': 'Benutzername',
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
    'user-summary-remove-membership': 'Benutzer aus Projekt entfernen',
    'user-summary-restore-membership': 'Benutzer zum Projekt hinzufügen',
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

    'website-summary-cancel': 'Abbrechen',
    'website-summary-domain-names': 'Domain Namen',
    'website-summary-edit': 'Webseite bearbeiten',
    'website-summary-save': 'Webseite speichern',
    'website-summary-template': 'Vorlage',
    'website-summary-template-disabled': 'Deaktiviert',
    'website-summary-template-generic': 'Allgemeine Vorlage',
    'website-summary-title': 'Webseite',

    'welcome': 'Willkommen!',
};

export {
    phrases,
};
