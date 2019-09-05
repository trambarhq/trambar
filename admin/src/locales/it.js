import 'moment/locale/it';
import { cardinal } from 'common/locale/grammars/italian.mjs';

const phrases = {
    'action-badge-add': "aggiungere",
    'action-badge-approve': "approvare",
    'action-badge-archive': "archiviare",
    'action-badge-deselect': 'deselezionare',
    'action-badge-disable': "disattivare",
    'action-badge-reactivate': "riattivare",
    'action-badge-remove': "rimuovere",
    'action-badge-restore': "ripristinare",
    'action-badge-select': 'selezionare',

    'activity-chart-legend-branch': "Nuovi branch",
    'activity-chart-legend-issue': "Problemi",
    'activity-chart-legend-member': "Cambiamenti di appartenenza",
    'activity-chart-legend-merge': "Merge",
    'activity-chart-legend-merge-request': "Merge richieste",
    'activity-chart-legend-milestone': "Traguardi",
    'activity-chart-legend-post': "Post",
    'activity-chart-legend-push': "Push",
    'activity-chart-legend-repo': "Cambiamenti del repository",
    'activity-chart-legend-survey': "Sondaggi",
    'activity-chart-legend-tag': "Tag",
    'activity-chart-legend-task-list': "Elenchi di attività",
    'activity-chart-legend-wiki': "Modifiche wiki",

    'activity-tooltip-$count': (count) => {
        return cardinal(count, "1 storia", "2 storie");
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count} branch`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, "1 problema", "2 problemi");
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, "1 cambiamento di appartenenza", "2 cambiamenti di appartenenza");
    },
    'activity-tooltip-$count-merge': (count) => {
        return `${count} merge`;
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, "1 merge richiesta", "2 merge richieste");
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, "1 traguardo", "2 traguardi");
    },
    'activity-tooltip-$count-post': (count) => {
        return `${count} post`;
    },
    'activity-tooltip-$count-push': (count) => {
        return `${count} push`;
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, "1 cambiamento del repository", "2 cambiamenti del repository");
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, "1 sondaggio", "2 sondaggi");
    },
    'activity-tooltip-$count-tag': (count) => {
        return `${count} tag`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, "1 elenco di attività", "2 elenchi di attività");
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, "1 modifica wiki", "2 modifiche Wiki");
    },

    'app-name': "Trambar",
    'app-title': "Trambar - Console amministrativa",

    'confirmation-cancel': "Annulla",
    'confirmation-confirm': "Conferma",
    'confirmation-data-loss': "Sei sicuro di voler abbandonare le modifiche che hai apportato?",

    'date-range-$start-$end': (start, end) => {
        if (start) {
            if (end) {
                return `${start}–${end}`;
            } else {
                return `${start}–`;
            }
        }
        return "";
    },

    'image-album-cancel': "Annulla",
    'image-album-done': "Fatto",
    'image-album-manage': "Gestisci album",
    'image-album-remove': "Rimuovi i selezionati",
    'image-album-select': "Utilizzare il selezionato",
    'image-album-upload': "Carica file",

    'image-cropping-cancel': "Annulla",
    'image-cropping-select': "OK",

    'image-preview-close': 'Chiudi',
    'image-preview-dropbox': 'Dropbox',
    'image-preview-onedrive': 'OneDrive',

    'image-selector-choose-from-album': "Scegli dall'album",
    'image-selector-crop-image': "Regola dimensione/posizione",
    'image-selector-upload-file': "Carica immagine",

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
    'member-list-add': "Aggiungi un nuovo utente",
    'member-list-approve-all': "Approva tutte le richieste",
    'member-list-cancel': "Annulla",
    'member-list-column-date-range': "Periodo attivo",
    'member-list-column-email': "E-mail",
    'member-list-column-last-modified': "Ultima modifica",
    'member-list-column-last-month': "Lo scorso mese",
    'member-list-column-name': "Nome e cognome",
    'member-list-column-roles': "Ruoli",
    'member-list-column-server': "Server",
    'member-list-column-this-month': "Questo mese",
    'member-list-column-title': "Nome",
    'member-list-column-to-date': "Ad oggi",
    'member-list-column-type': "Tipo",
    'member-list-edit': "Modifica la lista dei membri",
    'member-list-reject-all': "Rifiuta tutte le richieste",
    'member-list-save': "Salva la lista dei membri",
    'member-list-status-non-member': "Non un membro",
    'member-list-status-pending': "Richiesta in sospeso",
    'member-list-title': "Membri",

    'nav-member-new': "Nuovo membro",
    'nav-members': "Membri",
    'nav-project-new': "Nuovo progetto",
    'nav-projects': "Progetti",
    'nav-repositories': "Repository",
    'nav-rest-sources': "Fonti REST",
    'nav-role-new': "Nuovo ruolo",
    'nav-roles': "Ruoli",
    'nav-server-new': "Nuovo server",
    'nav-servers': "Server",
    'nav-settings': "Impostazioni",
    'nav-spreadsheets': "File di Excel",
    'nav-user-new': "Nuovo utente",
    'nav-users': "Utenti",
    'nav-website': "Sito web",
    'nav-wiki': "GitLab wiki",

    'project-list-add': "Aggiungi un nuovo progetto",
    'project-list-cancel': "Annulla",
    'project-list-column-date-range': "Periodo attivo",
    'project-list-column-last-modified': "Ultima modifica",
    'project-list-column-last-month': "Lo scorso mese",
    'project-list-column-repositories': "Repository",
    'project-list-column-this-month': "Questo mese",
    'project-list-column-title': "Nome",
    'project-list-column-to-date': "Ad oggi",
    'project-list-column-users': "Utenti",
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, "il progetto selezionato", "questi 2 progetti");
        return `Sei sicuro di voler archiviare ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, "il progetto selezionato", "questi 2 progetti");
        return `Sei sicuro di voler ripristinare ${projects}?`;
    },
    'project-list-edit': "Modifica la lista dei progetti",
    'project-list-save': "Salva la lista dei progetti",
    'project-list-status-archived': "Archiviato",
    'project-list-status-deleted': "Eliminato",
    'project-list-title': "Progetti",

    'project-summary-$title': (title) => {
        let text = "Progetto";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': "Controllo di accesso",
    'project-summary-access-control-member-only': "I contenuti del progetto sono riservati ai soli membri",
    'project-summary-access-control-non-member-comment': "I non membri possono commentare storie",
    'project-summary-access-control-non-member-view': "I non membri possono visualizzare i contenuti",
    'project-summary-add': "Aggiungi un nuovo progetto",
    'project-summary-archive': "Archivia il progetto",
    'project-summary-cancel': "Annulla",
    'project-summary-confirm-archive': "Sei sicuro di voler archiviare questo progetto?",
    'project-summary-confirm-delete': "Sei sicuro di voler eliminare questo progetto?",
    'project-summary-confirm-restore': "Sei sicuro di voler ripristinare questo progetto?",
    'project-summary-delete': "Elimina il progetto",
    'project-summary-description': "Descrizione",
    'project-summary-edit': "Modifica il progetto",
    'project-summary-emblem': "Emblema",
    'project-summary-name': "Identifier",
    'project-summary-new-members': "Nuovi membri",
    'project-summary-new-members-auto-accept-guest': "Gli utenti ospiti sono accettati automaticamente",
    'project-summary-new-members-auto-accept-user': "Gli utenti regolari sono accettati automaticamente",
    'project-summary-new-members-join-guest': "Gli utenti ospiti possono richiedere di partecipare al progetto",
    'project-summary-new-members-join-user': "Gli utenti regolari possono richiedere di partecipare al progetto",
    'project-summary-new-members-manual': "I membri vengono aggiunti manualmente",
    'project-summary-other-actions': "Altre azioni",
    'project-summary-restore': "Ripristina il progetto",
    'project-summary-return': "Ritorna alla lista dei progetti",
    'project-summary-save': "Salva il progetto",
    'project-summary-statistics': "Attività",
    'project-summary-title': "Nome",

    'project-tooltip-$count-others': (count) => {
        return (count === 1) ? `altro` : `altri ${count}`;
    },

    'repo-list-cancel': "Annulla",
    'repo-list-column-date-range': "Periodo attivo",
    'repo-list-column-issue-tracker': "Bug tracker",
    'repo-list-column-last-modified': "Ultima modifica",
    'repo-list-column-last-month': "Lo scorso mese",
    'repo-list-column-server': "Server",
    'repo-list-column-this-month': "Questo mese",
    'repo-list-column-title': "Nome",
    'repo-list-column-to-date': "Ad oggi",
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, "il repository selezionato", "questoi 2 repository");
        return `Sei sicuro di voler rimuovere ${repositories} dal progetto?`;
    },
    'repo-list-edit': "Modifica la lista dei repository",
    'repo-list-issue-tracker-enabled-false': "",
    'repo-list-issue-tracker-enabled-true': "Attivato",
    'repo-list-save': "Salva la lista dei repository",
    'repo-list-title': "Repositories",

    'repo-summary-$title': (title) => {
        let text = `Repository`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': "Annulla",
    'repo-summary-confirm-remove': "Sei sicuro di voler rimuovere questo repository dal progetto?",
    'repo-summary-confirm-restore': "Sei sicuro di voler aggiungere nuovamente questo repository al progetto?",
    'repo-summary-edit': "Modifica il repository",
    'repo-summary-gitlab-name': "Nome del repository in GitLab",
    'repo-summary-issue-tracker': "Bug tracker",
    'repo-summary-issue-tracker-disabled': "Disattivato",
    'repo-summary-issue-tracker-enabled': "Attivato",
    'repo-summary-remove': "Rimuovi il repository",
    'repo-summary-restore': "Ripristina il repository",
    'repo-summary-return': "Ritorna alla lista dei repository",
    'repo-summary-save': "Salva il repository",
    'repo-summary-statistics': "Attività",
    'repo-summary-title': "Nome",

    'repository-tooltip-$count': (count) => {
        return `${count} repository`;
    },

    'role-list-add': "Aggiungi un nuovo ruolo",
    'role-list-cancel': "Annulla",
    'role-list-column-last-modified': "Ultima modifica",
    'role-list-column-title': "Nome",
    'role-list-column-users': "Utenti",
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, "il ruolo selezionato", "questi 2 ruoli");
        return `Sei sicuro di voler disattivare ${roles}?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, "il ruolo selezionato", "questi 2 ruoli");
        return `Sei sicuro di voler riattivare questo ${roles}?`;
    },
    'role-list-edit': "Modifica la lista dei ruoli",
    'role-list-save': "Salva la lista dei ruoli",
    'role-list-status-deleted': "Eliminato",
    'role-list-status-disabled': "Disattivato",
    'role-list-title': "Ruoli",

    'role-summary-$title': (title) => {
        let text = "Ruolo";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': "Aggiungi un nuovo ruolo",
    'role-summary-cancel': "Annulla",
    'role-summary-confirm-delete': "Sei sicuro di voler eliminare questo ruolo?",
    'role-summary-confirm-disable': "Sei sicuro di voler disattivare questo ruolo?",
    'role-summary-confirm-reactivate': "Sei sicuro di voler riattivare questo ruolo?",
    'role-summary-delete': "Elimina il ruolo",
    'role-summary-description': "Descrizione",
    'role-summary-disable': "Disattiva il ruolo",
    'role-summary-edit': "Modifica il ruolo",
    'role-summary-name': "Identifier",
    'role-summary-rating': "Priorità delle storie",
    'role-summary-rating-high': "Alta",
    'role-summary-rating-low': "Bassa",
    'role-summary-rating-normal': "Normale",
    'role-summary-rating-very-high': "Molto alta",
    'role-summary-rating-very-low': "Molto bassa",
    'role-summary-reactivate': "Riattivare ruolo",
    'role-summary-return': "Ritorna alla lista dei ruoli",
    'role-summary-save': "Salva il ruolo",
    'role-summary-title': "Nome",
    'role-summary-users': "Utenti",

    'role-tooltip-$count-others': (count) => {
        return (count === 1) ? `Altro 1` : `Altri ${count}`;
    },

    'server-list-add': "Aggiungi un nuovo server",
    'server-list-api-access-false': "",
    'server-list-api-access-true': "Acquisito",
    'server-list-cancel': "Annulla",
    'server-list-column-api-access': "Accesso API﻿",
    'server-list-column-last-modified': "Ultima modifica",
    'server-list-column-oauth': "Autenticazione OAuth",
    'server-list-column-title': "Nome",
    'server-list-column-type': "Tipo",
    'server-list-column-users': "Utenti",
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, "il server selezionato", "questi 2 server");
        return `Sei sicuro di voler disattivare ${servers}?`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, "il server selezionato", "questi 2 server");
        return `Sei sicuro di voler riattivare ${servers}?`;
    },
    'server-list-edit': "Modifica la lista dei server",
    'server-list-oauth-false': "",
    'server-list-oauth-true': "Attivo",
    'server-list-save': "Salva la lista dei server",
    'server-list-status-deleted': "Eliminato",
    'server-list-status-disabled': "Disattivato",
    'server-list-title': "Server",

    'server-summary-acquire': "Acquisisci l'accesso API",
    'server-summary-activities': "Attività",
    'server-summary-add': "Aggiungi new server",
    'server-summary-api-access': "Accesso API",
    'server-summary-api-access-acquired': "Accesso amministrativo acquisito",
    'server-summary-api-access-not-applicable': "Non applicabile",
    'server-summary-api-access-pending': "In attesa di azione dell'utente",
    'server-summary-cancel': "Annulla",
    'server-summary-confirm-delete': "Sei sicuro di voler eliminare questo server?",
    'server-summary-confirm-disable': "Sei sicuro di voler disattivare questo server?",
    'server-summary-confirm-reactivate': "Sei sicuro di voler riattivare questo server?",
    'server-summary-delete': "Elimina il server",
    'server-summary-disable': "Disattiva il server",
    'server-summary-edit': "Modifica il server",
    'server-summary-gitlab-admin': "Amministratore GitLab",
    'server-summary-gitlab-external-user': "Utente esterno GitLab",
    'server-summary-gitlab-regular-user': "Utente normale GitLab",
    'server-summary-member-$name': (name) => {
        return `Server: ${name}`;
    },
    'server-summary-name': "Identifier",
    'server-summary-new-user': "Nuovo utente",
    'server-summary-new-users': "Nuovi utenti",
    'server-summary-oauth-app-id': "ID app",
    'server-summary-oauth-app-key': "Chiave app",
    'server-summary-oauth-app-secret': "Segreto app",
    'server-summary-oauth-application-id': "ID applicazione",
    'server-summary-oauth-application-secret': "Segreto applicazione",
    'server-summary-oauth-callback-url': "URL di callback",
    'server-summary-oauth-client-id': "ID client",
    'server-summary-oauth-client-secret': "Segreto client",
    'server-summary-oauth-deauthorize-callback-url': "URL di callback di deauthorization",
    'server-summary-oauth-gitlab-url': "URL del server GitLab",
    'server-summary-oauth-redirect-uri': "URI di reindirizzamento",
    'server-summary-oauth-redirect-url': "URL di reindirizzamento",
    'server-summary-oauth-site-url': "Indirizzo del sito",
    'server-summary-privacy-policy-url': "URL della politica sulla privacy",
    'server-summary-reactivate': "Riattivare il server",
    'server-summary-return': "Ritorna alla litsa dei server",
    'server-summary-role-none': "Non assegnare alcun ruolo ai nuovi utenti",
    'server-summary-roles': "Assegnazione del ruolo",
    'server-summary-save': "Salva il server",
    'server-summary-system-address-missing': "L'indirizzo di sistema non è stato impostato",
    'server-summary-terms-and-conditions-url': "Termini e condizioni URL",
    'server-summary-test-oauth': "Prova l'integrazione con OAuth",
    'server-summary-title': "Nome",
    'server-summary-type': "Tipo di server",
    'server-summary-user-automatic-approval': "Approva automaticamente i nuovi utenti",
    'server-summary-user-import-disabled': "Non registrare nuovi utenti",
    'server-summary-user-import-gitlab-admin-disabled': "Non importare gli amministratori GitLab",
    'server-summary-user-import-gitlab-external-user-disabled': "Non importare utenti esterni GitLab",
    'server-summary-user-import-gitlab-user-disabled': "Non importare utenti normale GitLab",
    'server-summary-user-type-admin': "Amministratore",
    'server-summary-user-type-guest': "Utente ospite",
    'server-summary-user-type-moderator': "Moderatore",
    'server-summary-user-type-regular': "Utente normale",
    'server-summary-whitelist': "Lista bianca indirizzo email",

    'server-type-dropbox': "Dropbox",
    'server-type-facebook': "Facebook",
    'server-type-github': "GitHub",
    'server-type-gitlab': "GitLab",
    'server-type-google': "Google",
    'server-type-windows': "Windows Live",

    'settings-background-image': "Immagine di sfondo",
    'settings-cancel': "Annulla",
    'settings-company-name': "Nome della ditta",
    'settings-edit': "Modifica settings",
    'settings-input-languages': "Lingue di input",
    'settings-push-relay': "Relè di notifica push",
    'settings-save': "Salva le impostazioni",
    'settings-site-address': "Indirizzo",
    'settings-site-description': "Descrizione",
    'settings-site-title': "Nome del sito",
    'settings-title': "Impostazioni",

    'sign-in-$title': (title) => {
        let text = `Accedi`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': "Richiesta di accesso rifiutata",
    'sign-in-error-account-disabled': "L'account è attualmente disabilitato",
    'sign-in-error-existing-users-only': "Solo il personale autorizzato può accedere a questo sistema",
    'sign-in-error-restricted-area': "L'utente non è un amministratore",
    'sign-in-oauth': "Accedi utilizzando OAuth",
    'sign-in-password': "Password:",
    'sign-in-problem-incorrect-username-password': "Nome utente o password errati",
    'sign-in-problem-no-support-for-username-password': "Il sistema non accetta la password",
    'sign-in-problem-unexpected-error': "Si è verificato un errore imprevisto",
    'sign-in-submit': "Invia",
    'sign-in-username': "Nome utente:",

    'sign-off-menu-sign-off': "Disconnettersi",

    'spreadsheet-list-add': "Aggiungi nuovo link",
    'spreadsheet-list-cancel': "Annulla",
    'spreadsheet-list-column-filename': "Nome del file",
    'spreadsheet-list-column-last-modified': "Ultima modifica",
    'spreadsheet-list-column-sheets': "Fogli",
    'spreadsheet-list-column-url': "URL",
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, "questo link", "questi 2 link");
        return `Sei sicuro di voler disattivare ${spreadsheets}?`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, "questo link", "questi 2 link");
        return `Sei sicuro di voler riattivare ${spreadsheets}?`;
    },
    'spreadsheet-list-edit': "Modifica la lista di link",
    'spreadsheet-list-save': "Salva la lista di link",
    'spreadsheet-list-status-deleted': "Eliminato",
    'spreadsheet-list-status-disabled': "Disattivato",
    'spreadsheet-list-title': "File Excel",

    'spreadsheet-summary-$title': (title) => {
        let text = 'File Excel';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': "Aggiungi nuovo link",
    'spreadsheet-summary-cancel': "Annulla",
    'spreadsheet-summary-confirm-delete': "Sei sicuro di voler eliminare questo link?",
    'spreadsheet-summary-confirm-disable': "Sei sicuro di voler disattivare questo link?",
    'spreadsheet-summary-confirm-reactivate': "Sei sicuro di voler riattivare questo link?",
    'spreadsheet-summary-delete': "Elimina il link",
    'spreadsheet-summary-description': "Descrizione",
    'spreadsheet-summary-disable': "Disabilita il link",
    'spreadsheet-summary-edit': "Modifica il link",
    'spreadsheet-summary-filename': "Nome del file",
    'spreadsheet-summary-name': "Identificatore",
    'spreadsheet-summary-reactivate': "Riattiva il link",
    'spreadsheet-summary-return': "Ritorna alla lista di link",
    'spreadsheet-summary-save': "Salva il link",
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Foglio ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': "Titolo",
    'spreadsheet-summary-url': "URL",

    'task-$seconds': (seconds) => {
        return (seconds === 1) ? `1 secondo` : `${seconds} secondi`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        if (count === 1) {
            return `Si 1 commento del commit è importato dal repository «${repo}»`;
        } else {
            return `Si ${count} commenti del commit sono importati dal repository «${repo}»`;
        }
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        if (count === 1) {
            return `Si 1 evento è importato dal repository «${repo}»`;
        } else {
            return `Si ${count} eventi sono importati dal repository «${repo}»`;
        }
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        if (count === 1) {
            return `Si 1 commento del problema è importato dal repository «${repo}»`;
        } else {
            return `Si ${count} commenti del problema sono importati dal repository «${repo}»`;
        }
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        if (count === 1) {
            return `Si 1 commento delle merge richieste è importato dal repository «${repo}»`;
        } else {
            return `Si ${count} commenti delle merge richieste sono importati dal repository «${repo}»`;
        }
    },
    'task-imported-$count-repos': (count) => {
        if (count === 1) {
            return `Si 1 repository è importato`;
        } else {
            return `Si ${count} repository sono importati`;
        }
    },
    'task-imported-$count-users': (count) => {
        if (count === 1) {
            return `Si 1 utente è importato`;
        } else {
            return `Si ${count} utenti sono importati`;
        }
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = `${count} commit`;
        return `Si un push con ${commits} è importato dal branch «${branch}» del repository «${repo}»`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Si sta importando i commenti del commit dal repository «${repo}»`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Si sta importando gli eventi dal repository «${repo}»`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Si sta importando i commenti del problema dal repository «${repo}»`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Si sta importando i commenti delle merge richieste dal repository «${repo}»`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Si sta importando un push dal repository «${repo}»`;
    },
    'task-importing-repos': "Si sta importando i repository",
    'task-importing-users': "Si sta importando gli utenti",
    'task-installed-$count-hooks': (count) => {
        if (count === 1) {
            return `Si 1 webhook è installato`;
        } else {
            return `Si ${count} webhook sono installati`;
        }
    },
    'task-installing-hooks': "Si sta installando i webhook",
    'task-removed-$count-hooks': (count) => {
        if (count === 1) {
            return `Si 1 webhook è disinstallato`;
        } else {
            return `Si ${count} webhook sono disinstallati`;
        }
    },
    'task-removed-$count-repos': (count) => {
        if (count === 1) {
            return `Si 1 repository è rimosso`;
        } else {
            return `Si ${count} repository sono rimossi`;
        }
    },
    'task-removed-$count-users': (count) => {
        if (count === 1) {
            return `Si 1 utente è rimosso`;
        } else {
            return `Si ${count} utenti sono rimossi`;
        }
    },
    'task-removing-hooks': "Si sta disinstallando i webhook",
    'task-updated-$count-repos': (count) => {
        if (count === 1) {
            return `Si 1 repository è modificato`;
        } else {
            return `Si ${count} repository sono modificati`;
        }
    },
    'task-updated-$count-users': (count) => {
        if (count === 1) {
            return `Si 1 utente è modificato`;
        } else {
            return `Si ${count} utenti sono modificati`;
        }
    },

    'text-field-placeholder-none': "nessuno",

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' e ', tooltip ];
    },
    'tooltip-more': "Altri",

    'tz-name-abidjan': "Abidjan",
    'tz-name-accra': "Accra",
    'tz-name-acre': "Acre",
    'tz-name-act': "Australian Capital Territory",
    'tz-name-adak': "Adak",
    'tz-name-addis-ababa': "Addis Abeba",
    'tz-name-adelaide': "Adelaide",
    'tz-name-aden': "Aden",
    'tz-name-africa': "Africa",
    'tz-name-alaska': "Alaska",
    'tz-name-aleutian': "Isole Aleutine",
    'tz-name-algiers': "Algeri",
    'tz-name-almaty': "Almaty",
    'tz-name-america': "America",
    'tz-name-amman': "Amman",
    'tz-name-amsterdam': "Amsterdam",
    'tz-name-anadyr': "Anadyr",
    'tz-name-anchorage': "Ancoraggio",
    'tz-name-andorra': "Andorra",
    'tz-name-anguilla': "Anguilla",
    'tz-name-antananarivo': "Antananarivo",
    'tz-name-antarctica': "Antartide",
    'tz-name-antigua': "Antigua",
    'tz-name-apia': "Apia",
    'tz-name-aqtau': "Aktau",
    'tz-name-aqtobe': "Aqtobe",
    'tz-name-araguaina': "Araguaina",
    'tz-name-arctic': "Artico",
    'tz-name-argentina': "Argentina",
    'tz-name-arizona': "Arizona",
    'tz-name-aruba': "Aruba",
    'tz-name-ashgabat': "Ashgabat",
    'tz-name-ashkhabad': "Ashkhabad",
    'tz-name-asia': "Asia",
    'tz-name-asmara': "Asmara",
    'tz-name-asmera': "Asmara",
    'tz-name-astrakhan': "Astracan",
    'tz-name-asuncion': "Asuncion",
    'tz-name-athens': "Atene",
    'tz-name-atikokan': "Atikokan",
    'tz-name-atka': "Atka",
    'tz-name-atlantic': "Atlantico",
    'tz-name-atyrau': "Atyrau",
    'tz-name-auckland': "Auckland",
    'tz-name-australia': "Australia",
    'tz-name-azores': "Azzorre",
    'tz-name-baghdad': "Baghdad",
    'tz-name-bahia': "Bahia",
    'tz-name-bahia-banderas': "Bahia Banderas",
    'tz-name-bahrain': "Bahrain",
    'tz-name-baja-norte': "Baja Norte",
    'tz-name-baja-sur': "Baja Sur",
    'tz-name-baku': "Baku",
    'tz-name-bamako': "Bamako",
    'tz-name-bangkok': "Bangkok",
    'tz-name-bangui': "Bangui",
    'tz-name-banjul': "Banjul",
    'tz-name-barbados': "Barbados",
    'tz-name-barnaul': "Barnaul",
    'tz-name-beirut': "Beirut",
    'tz-name-belem': "Belem",
    'tz-name-belfast': "Belfast",
    'tz-name-belgrade': "Belgrado",
    'tz-name-belize': "Belize",
    'tz-name-berlin': "Berlino",
    'tz-name-bermuda': "Bermuda",
    'tz-name-beulah': "Beulah",
    'tz-name-bishkek': "Bishkek",
    'tz-name-bissau': "Bissau",
    'tz-name-blanc-sablon': "Blanc-Sablon",
    'tz-name-blantyre': "Blantyre",
    'tz-name-boa-vista': "Boa Vista",
    'tz-name-bogota': "Bogota",
    'tz-name-boise': "Boise",
    'tz-name-bougainville': "Bougainville",
    'tz-name-bratislava': "Bratislava",
    'tz-name-brazil': "Brasile",
    'tz-name-brazzaville': "Brazzaville",
    'tz-name-brisbane': "Brisbane",
    'tz-name-broken-hill': "Broken Hill",
    'tz-name-brunei': "Brunei",
    'tz-name-brussels': "Bruxelles",
    'tz-name-bucharest': "Bucarest",
    'tz-name-budapest': "Budapest",
    'tz-name-buenos-aires': "Buenos Aires",
    'tz-name-bujumbura': "Bujumbura",
    'tz-name-busingen': "Busingen",
    'tz-name-cairo': "Cairo",
    'tz-name-calcutta': "Calcutta",
    'tz-name-cambridge-bay': "Cambridge Bay",
    'tz-name-campo-grande': "Campo Grande",
    'tz-name-canada': "Canada",
    'tz-name-canary': "Isole Canarie",
    'tz-name-canberra': "Canberra",
    'tz-name-cancun': "Cancun",
    'tz-name-cape-verde': "capo Verde",
    'tz-name-caracas': "Caracas",
    'tz-name-casablanca': "Casablanca",
    'tz-name-casey': "Casey",
    'tz-name-catamarca': "Catamarca",
    'tz-name-cayenne': "Cayenne",
    'tz-name-cayman': "Cayman",
    'tz-name-center': "Centro",
    'tz-name-central': "Centrale",
    'tz-name-ceuta': "Ceuta",
    'tz-name-chagos': "Chagos",
    'tz-name-chatham': "Chatham",
    'tz-name-chicago': "Chicago",
    'tz-name-chihuahua': "Chihuahua",
    'tz-name-chile': "Chile",
    'tz-name-chisinau': "Chisinau",
    'tz-name-chita': "Chita",
    'tz-name-choibalsan': "Choibalsan",
    'tz-name-chongqing': "Chongqing",
    'tz-name-christmas': "Isola di Natale",
    'tz-name-chungking': "Chungking",
    'tz-name-chuuk': "Chuuk",
    'tz-name-cocos': "Isole Cocos",
    'tz-name-colombo': "Colombo",
    'tz-name-comod-rivadavia': "Comodoro Rivadavia",
    'tz-name-comoro': "Comore",
    'tz-name-conakry': "Conakry",
    'tz-name-continental': "Continentale",
    'tz-name-copenhagen': "Copenhagen",
    'tz-name-coral-harbour': "Coral Harbour",
    'tz-name-cordoba': "Cordoba",
    'tz-name-costa-rica': "Costa Rica",
    'tz-name-creston': "Creston",
    'tz-name-cuiaba': "Cuiaba",
    'tz-name-curacao': "Curacao",
    'tz-name-currie': "Currie",
    'tz-name-dacca': "Dacca",
    'tz-name-dakar': "Dakar",
    'tz-name-damascus': "Damasco",
    'tz-name-danmarkshavn': "Danmarkshavn",
    'tz-name-dar-es-salaam': "Dar es Salaam",
    'tz-name-darwin': "Darwin",
    'tz-name-davis': "Davis",
    'tz-name-dawson': "Dawson",
    'tz-name-dawson-creek': "Dawson Creek",
    'tz-name-de-noronha': "De Noronha",
    'tz-name-denver': "Denver",
    'tz-name-detroit': "Detroit",
    'tz-name-dhaka': "Dacca",
    'tz-name-dili': "Dili",
    'tz-name-djibouti': "Gibuti",
    'tz-name-dominica': "Dominica",
    'tz-name-douala': "Douala",
    'tz-name-dubai': "Dubai",
    'tz-name-dublin': "Dublino",
    'tz-name-dumont-d-urville': "Dumont d’Urville",
    'tz-name-dushanbe': "Dushanbe",
    'tz-name-east': "Est",
    'tz-name-east-indiana': "Indiana orientale",
    'tz-name-easter': "Isola di Pasqua",
    'tz-name-easter-island': "Isola di Pasqua",
    'tz-name-eastern': "Orientale",
    'tz-name-edmonton': "Edmonton",
    'tz-name-efate': "Efate",
    'tz-name-eirunepe': "Eirunepe",
    'tz-name-el-aaiun': "El Aaiun",
    'tz-name-el-salvador': "El Salvador",
    'tz-name-enderbury': "Enderbury",
    'tz-name-ensenada': "Ensenada",
    'tz-name-eucla': "Eucla",
    'tz-name-europe': "Europa",
    'tz-name-faeroe': "Isole Fær Øer",
    'tz-name-fakaofo': "Fakaofo",
    'tz-name-famagusta': "Famagusta",
    'tz-name-faroe': "Faroe",
    'tz-name-fiji': "Fiji",
    'tz-name-fort-nelson': "Fort Nelson",
    'tz-name-fort-wayne': "Fort Wayne",
    'tz-name-fortaleza': "Fortaleza",
    'tz-name-freetown': "Freetown",
    'tz-name-funafuti': "Funafuti",
    'tz-name-gaborone': "Gaborone",
    'tz-name-galapagos': "Galapagos",
    'tz-name-gambier': "Gambier",
    'tz-name-gaza': "Gaza",
    'tz-name-general': "Generale",
    'tz-name-gibraltar': "Gibilterra",
    'tz-name-glace-bay': "Glace Bay",
    'tz-name-godthab': "Godthab",
    'tz-name-goose-bay': "Goose Bay",
    'tz-name-grand-turk': "Grand Turk",
    'tz-name-grenada': "Grenada",
    'tz-name-guadalcanal': "Guadalcanal",
    'tz-name-guadeloupe': "Guadeloupe",
    'tz-name-guam': "Guam",
    'tz-name-guatemala': "Guatemala",
    'tz-name-guayaquil': "Guayaquil",
    'tz-name-guernsey': "Guernsey",
    'tz-name-guyana': "Guyana",
    'tz-name-halifax': "Halifax",
    'tz-name-harare': "Harare",
    'tz-name-harbin': "Harbin",
    'tz-name-havana': "Avana",
    'tz-name-hawaii': "Hawaii",
    'tz-name-hebron': "Hebron",
    'tz-name-helsinki': "Helsinki",
    'tz-name-hermosillo': "Hermosillo",
    'tz-name-ho-chi-minh': "Ho Chi Minh",
    'tz-name-hobart': "Hobart",
    'tz-name-hong-kong': "Hong Kong",
    'tz-name-honolulu': "Honolulu",
    'tz-name-hovd': "Hovd",
    'tz-name-indian': "Oceano Indiano",
    'tz-name-indiana': "Indiana",
    'tz-name-indiana-starke': "Indiana-Starke",
    'tz-name-indianapolis': "Indianapolis",
    'tz-name-inuvik': "Inuvik",
    'tz-name-iqaluit': "Iqaluit",
    'tz-name-irkutsk': "Irkutsk",
    'tz-name-isle-of-man': "Isola di Man",
    'tz-name-istanbul': "Istanbul",
    'tz-name-jakarta': "Jakarta",
    'tz-name-jamaica': "Giamaica",
    'tz-name-jan-mayen': "Jan Mayen",
    'tz-name-jayapura': "Jayapura",
    'tz-name-jersey': "Jersey",
    'tz-name-jerusalem': "Gerusalemme",
    'tz-name-johannesburg': "Johannesburg",
    'tz-name-johnston': "Johnston",
    'tz-name-juba': "Juba",
    'tz-name-jujuy': "Jujuy",
    'tz-name-juneau': "Juneau",
    'tz-name-kabul': "Kabul",
    'tz-name-kaliningrad': "Kaliningrad",
    'tz-name-kamchatka': "Kamchatka",
    'tz-name-kampala': "Kampala",
    'tz-name-karachi': "Karachi",
    'tz-name-kashgar': "Kashgar",
    'tz-name-kathmandu': "Kathmandu",
    'tz-name-katmandu': "Katmandu",
    'tz-name-kentucky': "Kentucky",
    'tz-name-kerguelen': "Kerguelen",
    'tz-name-khandyga': "Khandyga",
    'tz-name-khartoum': "Khartoum",
    'tz-name-kiev': "Kiev",
    'tz-name-kigali': "Kigali",
    'tz-name-kinshasa': "Kinshasa",
    'tz-name-kiritimati': "Kiritimati",
    'tz-name-kirov': "Kirov",
    'tz-name-knox': "Knox",
    'tz-name-knox-in': "Knox, Indiana",
    'tz-name-kolkata': "Kolkata",
    'tz-name-kosrae': "Kosrae",
    'tz-name-kralendijk': "Kralendijk",
    'tz-name-krasnoyarsk': "Krasnoyarsk",
    'tz-name-kuala-lumpur': "Kuala Lumpur",
    'tz-name-kuching': "Kuching",
    'tz-name-kuwait': "Kuwait",
    'tz-name-kwajalein': "Kwajalein",
    'tz-name-la-paz': "La Paz",
    'tz-name-la-rioja': "La Rioja",
    'tz-name-lagos': "Lagos",
    'tz-name-lhi': "Lord Howe Island",
    'tz-name-libreville': "Libreville",
    'tz-name-lima': "Lima",
    'tz-name-lindeman': "Lindeman",
    'tz-name-lisbon': "Lisbona",
    'tz-name-ljubljana': "Lubiana",
    'tz-name-lome': "Lome",
    'tz-name-london': "Londra",
    'tz-name-longyearbyen': "Longyearbyen",
    'tz-name-lord-howe': "Lord Howe",
    'tz-name-los-angeles': "Los Angeles",
    'tz-name-louisville': "Louisville",
    'tz-name-lower-princes': "Lower Prince’s Quarter",
    'tz-name-luanda': "Luanda",
    'tz-name-lubumbashi': "Lubumbashi",
    'tz-name-lusaka': "Lusaka",
    'tz-name-luxembourg': "Lussemburgo",
    'tz-name-macao': "Macao",
    'tz-name-macau': "Macau",
    'tz-name-maceio': "Maceio",
    'tz-name-macquarie': "Macquarie",
    'tz-name-madeira': "Madera",
    'tz-name-madrid': "Madrid",
    'tz-name-magadan': "Magadan",
    'tz-name-mahe': "Mahe",
    'tz-name-majuro': "Majuro",
    'tz-name-makassar': "Makassar",
    'tz-name-malabo': "Malabo",
    'tz-name-maldives': "Maldive",
    'tz-name-malta': "Malta",
    'tz-name-managua': "Managua",
    'tz-name-manaus': "Manaus",
    'tz-name-manila': "Manila",
    'tz-name-maputo': "Maputo",
    'tz-name-marengo': "Marengo",
    'tz-name-mariehamn': "Mariehamn",
    'tz-name-marigot': "Marigot",
    'tz-name-marquesas': "Marchesi",
    'tz-name-martinique': "Martinique",
    'tz-name-maseru': "Maseru",
    'tz-name-matamoros': "Matamoros",
    'tz-name-mauritius': "Mauritius",
    'tz-name-mawson': "Mawson",
    'tz-name-mayotte': "Mayotte",
    'tz-name-mazatlan': "Mazatlan",
    'tz-name-mbabane': "Mbabane",
    'tz-name-mc-murdo': "McMurdo",
    'tz-name-melbourne': "Melbourne",
    'tz-name-mendoza': "Mendoza",
    'tz-name-menominee': "Menominee",
    'tz-name-merida': "Merida",
    'tz-name-metlakatla': "Metlakatla",
    'tz-name-mexico': "Messico",
    'tz-name-mexico-city': "Città del Messico",
    'tz-name-michigan': "Michigan",
    'tz-name-midway': "Midway",
    'tz-name-minsk': "Minsk",
    'tz-name-miquelon': "Miquelon",
    'tz-name-mogadishu': "Mogadiscio",
    'tz-name-monaco': "Monaco",
    'tz-name-moncton': "Moncton",
    'tz-name-monrovia': "Monrovia",
    'tz-name-monterrey': "Monterrey",
    'tz-name-montevideo': "Montevideo",
    'tz-name-monticello': "Monticello",
    'tz-name-montreal': "Montreal",
    'tz-name-montserrat': "Montserrat",
    'tz-name-moscow': "Mosca",
    'tz-name-mountain': "Montagna",
    'tz-name-muscat': "Moscato",
    'tz-name-nairobi': "Nairobi",
    'tz-name-nassau': "Nassau",
    'tz-name-nauru': "Nauru",
    'tz-name-ndjamena': "Ndjamena",
    'tz-name-new-salem': "New Salem",
    'tz-name-new-york': "New York",
    'tz-name-newfoundland': "Terranova",
    'tz-name-niamey': "Niamey",
    'tz-name-nicosia': "Nicosia",
    'tz-name-nipigon': "Nipigon",
    'tz-name-niue': "Niue",
    'tz-name-nome': "Nome",
    'tz-name-norfolk': "Norfolk",
    'tz-name-noronha': "Noronha",
    'tz-name-north': "Nord",
    'tz-name-north-dakota': "Nord Dakota",
    'tz-name-nouakchott': "Nouakchott",
    'tz-name-noumea': "Noumea",
    'tz-name-novokuznetsk': "Novokuznetsk",
    'tz-name-novosibirsk': "Novosibirsk",
    'tz-name-nsw': "Nuovo Galles del Sud",
    'tz-name-ojinaga': "Ojinaga",
    'tz-name-omsk': "Omsk",
    'tz-name-oral': "Oral",
    'tz-name-oslo': "Oslo",
    'tz-name-ouagadougou': "Ouagadougou",
    'tz-name-pacific': "Pacifico",
    'tz-name-pacific-new': "Pacific-Nuova",
    'tz-name-pago-pago': "Pago Pago",
    'tz-name-palau': "Palau",
    'tz-name-palmer': "Palmer",
    'tz-name-panama': "Panama",
    'tz-name-pangnirtung': "Pangnirtung",
    'tz-name-paramaribo': "Paramaribo",
    'tz-name-paris': "Parigi",
    'tz-name-perth': "Perth",
    'tz-name-petersburg': "Petersburg",
    'tz-name-phnom-penh': "Phnom Penh",
    'tz-name-phoenix': "Fenice",
    'tz-name-pitcairn': "Pitcairn",
    'tz-name-podgorica': "Podgorica",
    'tz-name-pohnpei': "Pohnpei",
    'tz-name-ponape': "Ponape",
    'tz-name-pontianak': "Pontianak",
    'tz-name-port-au-prince': "Port-au-Prince",
    'tz-name-port-moresby': "Port Moresby",
    'tz-name-port-of-spain': "Porto della Spagna",
    'tz-name-porto-acre': "Porto Acre",
    'tz-name-porto-novo': "Porto-Novo",
    'tz-name-porto-velho': "Porto Velho",
    'tz-name-prague': "Praga",
    'tz-name-puerto-rico': "Porto Rico",
    'tz-name-punta-arenas': "Punta Arenas",
    'tz-name-pyongyang': "Pyongyang",
    'tz-name-qatar': "Qatar",
    'tz-name-qostanay': "Qostanay",
    'tz-name-queensland': "Queensland",
    'tz-name-qyzylorda': "Qyzylorda",
    'tz-name-rainy-river': "Rainy River",
    'tz-name-rangoon': "Rangoon",
    'tz-name-rankin-inlet': "Rankin Inlet",
    'tz-name-rarotonga': "Rarotonga",
    'tz-name-recife': "Recife",
    'tz-name-regina': "Regina",
    'tz-name-resolute': "Resolute",
    'tz-name-reunion': "Riunione",
    'tz-name-reykjavik': "Reykjavik",
    'tz-name-riga': "Riga",
    'tz-name-rio-branco': "Rio Branco",
    'tz-name-rio-gallegos': "Rio Gallegos",
    'tz-name-riyadh': "Riyadh",
    'tz-name-rome': "Roma",
    'tz-name-rosario': "Rosario",
    'tz-name-rothera': "Rothera",
    'tz-name-saigon': "Saigon",
    'tz-name-saipan': "Saipan",
    'tz-name-sakhalin': "Sakhalin",
    'tz-name-salta': "Salta",
    'tz-name-samara': "Samara",
    'tz-name-samarkand': "Samarcanda",
    'tz-name-samoa': "Samoa",
    'tz-name-san-juan': "San Giovanni",
    'tz-name-san-luis': "San Luis",
    'tz-name-san-marino': "San Marino",
    'tz-name-santa-isabel': "Santa Isabel",
    'tz-name-santarem': "Santarem",
    'tz-name-santiago': "Santiago",
    'tz-name-santo-domingo': "Santo Domingo",
    'tz-name-sao-paulo': "San Paolo",
    'tz-name-sao-tome': "Sao Tomé",
    'tz-name-sarajevo': "Sarajevo",
    'tz-name-saratov': "Saratov",
    'tz-name-saskatchewan': "Saskatchewan",
    'tz-name-scoresbysund': "Scoresbysund",
    'tz-name-seoul': "Seoul",
    'tz-name-shanghai': "Shanghai",
    'tz-name-shiprock': "Shiprock",
    'tz-name-simferopol': "Simferopol",
    'tz-name-singapore': "Singapore",
    'tz-name-sitka': "Sitka",
    'tz-name-skopje': "Skopje",
    'tz-name-sofia': "Sofia",
    'tz-name-south': "Sud",
    'tz-name-south-georgia': "Georgia del Sud",
    'tz-name-south-pole': "Polo Sud",
    'tz-name-srednekolymsk': "Srednekolymsk",
    'tz-name-st-barthelemy': "St Barthelemy",
    'tz-name-st-helena': "Sant'Elena",
    'tz-name-st-johns': "St Johns",
    'tz-name-st-kitts': "St Kitts",
    'tz-name-st-lucia': "Santa Lucia",
    'tz-name-st-thomas': "San Tommaso",
    'tz-name-st-vincent': "St Vincent",
    'tz-name-stanley': "Stanley",
    'tz-name-stockholm': "Stoccolma",
    'tz-name-swift-current': "Swift Current",
    'tz-name-sydney': "Sydney",
    'tz-name-syowa': "Syowa",
    'tz-name-tahiti': "Tahiti",
    'tz-name-taipei': "Taipei",
    'tz-name-tallinn': "Tallinn",
    'tz-name-tarawa': "Tarawa",
    'tz-name-tashkent': "Tashkent",
    'tz-name-tasmania': "Tasmania",
    'tz-name-tbilisi': "Tbilisi",
    'tz-name-tegucigalpa': "Tegucigalpa",
    'tz-name-tehran': "Teheran",
    'tz-name-tel-aviv': "Tel Aviv",
    'tz-name-tell-city': "Tell City",
    'tz-name-thimbu': "Thimbu",
    'tz-name-thimphu': "Thimphu",
    'tz-name-thule': "Thule",
    'tz-name-thunder-bay': "Thunder Bay",
    'tz-name-tijuana': "Tijuana",
    'tz-name-timbuktu': "Timbuktu",
    'tz-name-tirane': "Tirana",
    'tz-name-tiraspol': "Tiraspol",
    'tz-name-tokyo': "Tokyo",
    'tz-name-tomsk': "Tomsk",
    'tz-name-tongatapu': "Tongatapu",
    'tz-name-toronto': "Toronto",
    'tz-name-tortola': "Tortola",
    'tz-name-tripoli': "Tripoli",
    'tz-name-troll': "Troll",
    'tz-name-truk': "Truk",
    'tz-name-tucuman': "Tucuman",
    'tz-name-tunis': "Tunisi",
    'tz-name-ujung-pandang': "Ujung Pandang",
    'tz-name-ulaanbaatar': "Ulaanbaatar",
    'tz-name-ulan-bator': "Ulan Bator",
    'tz-name-ulyanovsk': "Ulyanovsk",
    'tz-name-urumqi': "Urumqi",
    'tz-name-us': "Stati Uniti",
    'tz-name-ushuaia': "Ushuaia",
    'tz-name-ust-nera': "Ust-Nera",
    'tz-name-uzhgorod': "Uzhgorod",
    'tz-name-vaduz': "Vaduz",
    'tz-name-vancouver': "Vancouver",
    'tz-name-vatican': "Vaticano",
    'tz-name-vevay': "Vevay",
    'tz-name-victoria': "Vittoria",
    'tz-name-vienna': "Vienna",
    'tz-name-vientiane': "Vientiane",
    'tz-name-vilnius': "Vilnius",
    'tz-name-vincennes': "Vincennes",
    'tz-name-virgin': "Isole Vergini",
    'tz-name-vladivostok': "Vladivostok",
    'tz-name-volgograd': "Volgograd",
    'tz-name-vostok': "Vostok",
    'tz-name-wake': "Wake Island",
    'tz-name-wallis': "Wallis",
    'tz-name-warsaw': "Varsavia",
    'tz-name-west': "Ovest",
    'tz-name-whitehorse': "Whitehorse",
    'tz-name-winamac': "Winamac",
    'tz-name-windhoek': "Windhoek",
    'tz-name-winnipeg': "Winnipeg",
    'tz-name-yakutat': "Yakutat",
    'tz-name-yakutsk': "Yakutsk",
    'tz-name-yancowinna': "Yancowinna",
    'tz-name-yangon': "Yangon",
    'tz-name-yap': "Yap",
    'tz-name-yekaterinburg': "Ekaterinburg",
    'tz-name-yellowknife': "Yellowknife",
    'tz-name-yerevan': "Yerevan",
    'tz-name-yukon': "Yukon",
    'tz-name-zagreb': "Zagabria",
    'tz-name-zaporozhye': "Zaporozhye",
    'tz-name-zurich': "Zurich",

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        return `Caricamento di ${count} file, ${size} rimanenti`;
    },

    'user-list-add': "Aggiungi un nuovo utente",
    'user-list-approve-all': "Approva tutte le richieste",
    'user-list-cancel': "Annulla",
    'user-list-column-email': "E-mail",
    'user-list-column-last-modified': "Ultima modifica",
    'user-list-column-name': "Nome e cognome",
    'user-list-column-projects': "Progetti",
    'user-list-column-roles': "Ruoli",
    'user-list-column-type': "Tipo",
    'user-list-column-username': "Nome utente",
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, "l'account utente selezionato", "questi 2 account utente", true);
        return `Sei sicuro di voler disattivare ${accounts}?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, "l'account utente selezionato", "questi 2 account utente", true);
        return `Sei sicuro di voler riattivare questo ${accounts}?`;
    },
    'user-list-edit': "Modifica la lista degli utenti",
    'user-list-reject-all': "Rifiuta tutte le richieste",
    'user-list-save': "Salva la lista degli utenti",
    'user-list-status-deleted': "Eliminato",
    'user-list-status-disabled': "Disattivato",
    'user-list-status-pending': "In attesa",
    'user-list-title': "Utenti",
    'user-list-type-admin': "Amministratore",
    'user-list-type-guest': "Utente ospite",
    'user-list-type-moderator': "Moderatore",
    'user-list-type-regular': "Utente normale",
    'user-summary-$name': (name) => {
        let text = "Utente";
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': "Aggiungi un nuovo utente",
    'user-summary-cancel': "Annulla",
    'user-summary-confirm-delete': "Sei sicuro di voler eliminare questo account utente?",
    'user-summary-confirm-disable': "Sei sicuro di voler disabilitare questo account utente?",
    'user-summary-confirm-reactivate': "Sei sicuro di voler riattivare questo account utente?",
    'user-summary-delete': "Elimina l'account utente",
    'user-summary-disable': "Disabilita l'account utente",
    'user-summary-edit': "Modifica l'account utente",
    'user-summary-email': "Indirizzo e-mail",
    'user-summary-github': "URL del profilo GitHub",
    'user-summary-gitlab': "URL del profilo GitLab",
    'user-summary-ichat': "Nome utente iChat",
    'user-summary-linkedin': "URL del profilo LinkedIn",
    'user-summary-member-$name': (name) => {
        let text = "Membro";
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': "Modifica il membro",
    'user-summary-member-return': "Ritorna alla lista dei membri",
    'user-summary-member-save': "Salva il membro",
    'user-summary-name': "Nome e cognome",
    'user-summary-phone': "Numero di telefono",
    'user-summary-profile-image': "Immagine del profilo",
    'user-summary-reactivate': "Riattiva l'account utente",
    'user-summary-remove-membership': "Rimuovi l'utente dal progetto",
    'user-summary-restore-membership': "Aggiungi l'utente al progetto",
    'user-summary-return': "Ritorna allala lista degli utenti",
    'user-summary-role-none': "Nessun",
    'user-summary-roles': "Ruoli",
    'user-summary-save': "Salva il utente",
    'user-summary-skype': "Nome utente Skype",
    'user-summary-slack': "ID utente Slack",
    'user-summary-slack-team': "ID della squadra Slack",
    'user-summary-social-links': "Collegamenti di social network",
    'user-summary-stackoverflow': "URL del profilo StackOverflow",
    'user-summary-statistics': "Attività",
    'user-summary-twitter': "Nome utente Twitter",
    'user-summary-type': "Tipo di utente",
    'user-summary-type-admin': "Amministratore",
    'user-summary-type-guest': "Utente ospite",
    'user-summary-type-moderator': "Moderatore",
    'user-summary-type-regular': "Utente normale",
    'user-summary-username': "Nome utente",

    'user-tooltip-$count': (count) => {
        return cardinal(count, "1 utente", "2 untenti");
    },

    'validation-duplicate-project-name': "Esiste già un progetto con quell'identificatore",
    'validation-duplicate-role-name': "Esiste già un ruolo con quell'identificatore",
    'validation-duplicate-server-name': "Un server con quell'identificatore esiste già",
    'validation-duplicate-source-name': "Una fonte con quell'identificatore esiste già",
    'validation-duplicate-spreadsheet-name': "Un link con quell'identificatore esiste già",
    'validation-duplicate-user-name': "Esiste già un utente con quel nome",
    'validation-illegal-project-name': "L'identificatore del progetto non può essere «global», «admin», «public» o «srv»",
    'validation-invalid-timezone': "Fuso orario non valido",
    'validation-localhost-is-wrong': "«localhost» non è valido",
    'validation-password-for-admin-only': "Solo gli amministratori possono accedere utilizzando la password",
    'validation-required': "Necessario",
    'validation-used-by-trambar': "Utilizzato da Trambar",

    'website-summary-cancel': "Annulla",
    'website-summary-domain-names': "Nomi di dominio",
    'website-summary-edit': "Modifica sito Web",
    'website-summary-save': "Salva sito Web",
    'website-summary-template': "Modello",
    'website-summary-template-disabled': "Disattivato",
    'website-summary-template-generic': "Modello generico",
    'website-summary-timezone': "Fuso orario",
    'website-summary-title': "Sito web",
    'website-summary-traffic-report-time': "Tempo di pubblicazione del rapporto sul traffico",
    'website-summary-versions': "Versioni",

    'welcome': "Benvenuto!",

    'wiki-list-cancel': "Annulla",
    'wiki-list-column-last-modified': "Ultima modifica",
    'wiki-list-column-public': "Pubblica",
    'wiki-list-column-repo': "Repository",
    'wiki-list-column-title': "Titolo",
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, "questa pagina", "queste 2 pagine");
        return `Sei sicuro di voler deselezionare ${pages}?`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, "questa pagina", "queste 2 pagine");
        return `Sei sicuro di voler rendere pubblica ${pages}?`;
    },
    'wiki-list-edit': "Modifica la lista di pagine",
    'wiki-list-public-always': "sempre",
    'wiki-list-public-no': "no",
    'wiki-list-public-referenced': "referenziata",
    'wiki-list-save': "Salva la lista di pagine",
    'wiki-list-title': "Wiki GitLab",

    'wiki-summary-$title': (title) => {
        let text = "Wiki GitLab";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': "Annulla",
    'wiki-summary-confirm-deselect': "Sei sicuro di voler deselezionare questa pagina?",
    'wiki-summary-confirm-select': "Sei sicuro di voler rendere pubblica questa pagina?",
    'wiki-summary-edit': "Modifier la page",
    'wiki-summary-page-contents': "Contenuto",
    'wiki-summary-public': "Pubblica",
    'wiki-summary-public-always': "Sempre",
    'wiki-summary-public-no': "No",
    'wiki-summary-public-referenced': "Sì (indicato da un'altra pagina pubblica)",
    'wiki-summary-repo': "Identificatore del repository",
    'wiki-summary-return': "Ritorna alla lista di pagine",
    'wiki-summary-slug': "Slug",
    'wiki-summary-title': "Titolo",
};

export {
    phrases,
};
