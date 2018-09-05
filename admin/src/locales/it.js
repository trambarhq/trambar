import 'moment/locale/it';
import { cardinal } from 'locale/grammars/italian';

let phrases = {
    'action-badge-add': "aggiungere",
    'action-badge-approve': "approvare",
    'action-badge-archive': "archiviare",
    'action-badge-disable': "disattivare",
    'action-badge-reactivate': "riattivare",
    'action-badge-remove': "rimuovere",
    'action-badge-restore': "ripristinare",

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
        return cardinal(count, 'storia', 'storie');
    },
    'activity-tooltip-$count-branch': (count) => {
        return `${count} branch`;
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, 'problema', 'problemi');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, 'cambiamento di appartenenza', 'cambiamenti di appartenenza');
    },
    'activity-tooltip-$count-merge': (count) => {
        return `${count} merge`;
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, 'merge richiesta', 'merge richieste');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, 'traguardo', 'traguardi');
    },
    'activity-tooltip-$count-post': (count) => {
        return `${count} post`;
    },
    'activity-tooltip-$count-push': (count) => {
        return `${count} push`;
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, 'cambiamento del repository', 'cambiamenti del repository');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, 'sondaggio', 'sondaggi');
    },
    'activity-tooltip-$count-tag': (count) => {
        return `${count} tag`;
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, 'elenco di attività', 'elenchi di attività');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, 'modifica wiki', 'modifiche Wiki');
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
        return '';
    },

    'image-album-cancel': "Annulla",
    'image-album-done': "Fatto",
    'image-album-manage': "Gestisci album",
    'image-album-remove': "Rimuovi i selezionati",
    'image-album-select': "Utilizzare il selezionato",
    'image-album-upload': "Carica file",

    'image-cropping-cancel': "Annulla",
    'image-cropping-select': "OK",

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
    'nav-repositories': "Repositories",
    'nav-role-new': "Nuovo ruolo",
    'nav-roles': "Ruoli",
    'nav-server-new': "Nuovo server",
    'nav-servers': "Server",
    'nav-settings': "Impostazioni",
    'nav-user-new': "Nuovo utente",
    'nav-users': "Utenti",

    'project-list-add': "Aggiungi un nuovo progetto",
    'project-list-cancel': "Annulla",
    'project-list-confirm-archive-$count': (count) => {
        var projects = (count === 1) ? 'il progetto selezionato' : `questi ${count} progetti`;
        return `Sei sicuro di voler archiviare ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        var projects = (count === 1) ? 'il progetto selezionato' : `questi ${count} progetti`;
        return `Sei sicuro di voler ripristinare ${projects}?`;
    },
    'project-list-deleted': "Eliminato",
    'project-list-edit': "Modifica la lista dei progetti",
    'project-list-save': "Salva la lista dei progetti",
    'project-list-status-archived': "Archiviato",
    'project-list-status-deleted': "Eliminato",
    'project-list-title': "Progetti",

    'project-summary-$title': (title) => {
        var text = 'Progetto';
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
    'repo-list-confirm-remove-$count': (count) => {
        var repositories = (count === 1) ? `il repository selezionato` : `questoi ${count} repository`;
        return `Sei sicuro di voler rimuovere ${repositories} dal progetto?`;
    },
    'repo-list-edit': "Modifica la lista dei repository",
    'repo-list-issue-tracker-enabled-false': "",
    'repo-list-issue-tracker-enabled-true': "Attivato",
    'repo-list-save': "Salva la lista dei repository",
    'repo-list-title': "Repositories",

    'repo-summary-$title': (title) => {
        var text = `Repository`;
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
    'role-list-confirm-disable-$count': (count) => {
        var roles = (count === 1) ? `il ruolo selezionato` : `questi ${count} ruoli`;
        return `Sei sicuro di voler disattivare ${roles}?`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        var roles = (count === 1) ? `il ruolo selezionato` : `questi ${count} ruoli`;
        return `Sei sicuro di voler riattivare questo ${roles}?`
    },
    'role-list-edit': "Modifica la lista dei ruoli",
    'role-list-save': "Salva la lista dei ruoli",
    'role-list-status-deleted': "Eliminato",
    'role-list-status-disabled': "Disattivato",
    'role-list-title': "Ruoli",

    'role-summary-$title': (title) => {
        var text = 'Ruolo';
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
    'server-list-confirm-disable-$count': (count) => {
        var servers = (count === 1) ? `il server selezionato` : `questi ${count} server`;
        return `Sei sicuro di voler disattivare ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        var servers = (count === 1) ? `il server selezionato` : `questi ${count} server`;
        return `Sei sicuro di voler riattivare ${servers}?`
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
    'server-summary-oauth-deauthorize-callback-url': 'URL di callback di deauthorization',
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
    'server-summary-whitelist': 'Lista bianca indirizzo email',

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
        var text = `Accedi`;
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

    'table-heading-api-access': "Accesso API﻿",
    'table-heading-date-range': "Periodo attivo",
    'table-heading-email': "E-mail",
    'table-heading-issue-tracker': "Bug tracker",
    'table-heading-last-modified': "Ultima modifica",
    'table-heading-last-month': "Lo scorso mese",
    'table-heading-name': "Nome e cognome",
    'table-heading-oauth': "Autenticazione OAuth",
    'table-heading-projects': "Progetti",
    'table-heading-repositories': "Repository",
    'table-heading-roles': "Ruoli",
    'table-heading-server': "Server",
    'table-heading-this-month': "Questo mese",
    'table-heading-title': "Nome",
    'table-heading-to-date': "Ad oggi",
    'table-heading-type': "Tipo",
    'table-heading-username': 'Nome utente',
    'table-heading-users': "Utenti",

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
        var commits = `${count} commit`;
        return `Si un push con ${commits} è importato dal branch «${branch}» del repository «${repo}»`
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

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        return `Caricamento di ${count} file, ${size} rimanenti`;
    },

    'user-list-add': "Aggiungi un nuovo utente",
    'user-list-approve-all': "Approva tutte le richieste",
    'user-list-cancel': "Annulla",
    'user-list-confirm-disable-$count': (count) => {
        var accounts = (count === 1) ? `l'account utente selezionato` : `questi ${count} account utente`;
        return `Sei sicuro di voler disabilitare ${accounts}?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        var accounts = (count === 1) ? `l'account utente selezionato` : `questi ${count} account utente`;
        return `Sei sicuro di voler riattivare questo ${accounts}?`
    },
    'user-list-edit': "Modifica la lista degli utenti",
    'user-list-reject-all': "Rifiuta tutte le richieste",
    'user-list-save': "Salva la lista degli utenti",
    'user-list-status-deleted': "Eliminato",
    'user-list-status-disabled': "Disabilitato",
    'user-list-status-pending': "In attesa",
    'user-list-title': "Utenti",
    'user-list-type-admin': "Amministratore",
    'user-list-type-guest': "Utente ospite",
    'user-list-type-moderator': "Moderatore",
    'user-list-type-regular': "Utente normale",
    'user-summary-$name': (name) => {
        var text = 'Utente';
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
        var text = 'Membro';
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
        return cardinal(count, 'utente', 'untenti');
    },

    'validation-duplicate-project-name': "Esiste già un progetto con quell'identificatore",
    'validation-duplicate-role-name': "Esiste già un ruolo con quell'identificatore",
    'validation-duplicate-server-name': "Un server con quell'identificatore esiste già",
    'validation-duplicate-user-name': "Esiste già un utente con quel nome",
    'validation-illegal-project-name': "L'identificatore del progetto non può essere «global», «admin», «public» o «srv»",
    'validation-localhost-is-wrong': "«localhost» non è valido",
    'validation-password-for-admin-only': "Solo gli amministratori possono accedere utilizzando la password",
    'validation-required': "Necessario",

    'welcome': "Benvenuto!",
};

export {
    phrases,
};
