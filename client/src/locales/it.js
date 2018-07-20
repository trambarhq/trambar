require('moment/locale/it');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': "Contatto via e-mail",
        'action-contact-by-ichat': "Contatto con iChat",
        'action-contact-by-phone': "Contatto telefonico",
        'action-contact-by-skype': "Contatto con Skype",
        'action-contact-by-slack': "Contatto con Slack",
        'action-contact-by-twitter': "Contatto con Twitter",
        'action-view-github-page': "Visualizza la pagina GitHub",
        'action-view-gitlab-page': "Visualizza la pagina GitLab",
        'action-view-linkedin-page': "Visualizza la pagina LinkedIn",
        'action-view-stackoverflow-page': "Visualizza la pagina Stack Overflow",

        'activation-address': "Indirizzo del server",
        'activation-cancel': "Annulla",
        'activation-code': "Codice di attivazione",
        'activation-ok': "OK",
        'activation-schema': "Progetto",

        'alert-$count-new-bookmarks': (count) => {
            return (count === 1) ? `1 nuovo segnalibro` : `${count} nuovi segnalibri`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 nuova notifica` : `${count} nuove notifiche`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 nuova storia` : `${count} nuove storie`;
        },

        'app-component-close': 'Chiudi',

        'app-name': "Trambar",

        'audio-capture-accept': "Accetta",
        'audio-capture-cancel': "Annulla",
        'audio-capture-pause': "Pausa",
        'audio-capture-rerecord': "Ricomincia",
        'audio-capture-resume': "Riprendi",
        'audio-capture-start': "Comincia",
        'audio-capture-stop': "Termina",

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 altro utente` : `${count} altri utenti`;
        },
        'bookmark-$count-users': (count) => {
            return (count === 1) ? `1 utente` : `${count} utenti`;
        },
        'bookmark-$name-and-$others-recommend-this': (name, others, count) => {
            return [ `${name} o `, others, ` lo raccomandano` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} lo raccomanda`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
            return [ name1, ' o ', name2, ' lo raccomandano' ];
        },
        'bookmark-$you-bookmarked-it': "L'hai messo tra i segnalibri",
        'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
            return `L'hai messo tra i segnalibri (e ${name} lo raccomanda)`;
        },
        'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
            return [ `L'hai messo tra i segnalibri (e `, others, ` lo raccomandano)` ];
        },
        'bookmark-recommendations': "Raccomandazioni",

        'bookmarks-no-bookmarks': "Nessun segnalibro",

        'bottom-nav-bookmarks': "Segnalibri",
        'bottom-nav-news': "Notizia",
        'bottom-nav-notifications': "Notifiche",
        'bottom-nav-people': "Persone",
        'bottom-nav-settings': "Impostazioni",

        'confirmation-cancel': "Annulla",
        'confirmation-confirm': "Conferma",

        'development-code-push-$deployment': (deployment) => {
            return `Ottieni aggiornamenti del codice da «${deployment}»`;
        },
        'development-show-diagnostics': "Mostra diagnostica",
        'development-show-panel': "Mostra questo pannello",

        'device-selector-camera-$number': (number) => {
            return `Camera ${number}`;
        },
        'device-selector-camera-back': "Posteriore",
        'device-selector-camera-front': "Frontale",
        'device-selector-mic-$number': (number) => {
            return `Mic ${number}`;
        },

        'empty-currently-offline': "Al momento sei offline",

        'image-editor-page-rendering-in-progress': "Creazione dell'anteprima del sito...",
        'image-editor-poster-extraction-in-progress': "Estrazione dell'anteprima dal video...",
        'image-editor-upload-in-progress': "Carica in corso...",

        'issue-cancel': "Annulla",
        'issue-delete': "Elimina",
        'issue-ok': "OK",
        'issue-repo': "Repository",
        'issue-title': "Titolo",

        'list-$count-more': (count) => {
            return (count === 1) ? `altro 1...` : `altri ${count}...`;
        },

        'media-close': "Chiudi",
        'media-download-original': "Scarica il file originale",
        'media-editor-embed': "Incorpora",
        'media-editor-remove': "Rimuovi",
        'media-editor-shift': "Sposta",
        'media-next': "Prossimo",
        'media-previous': "Seguente",

        'membership-request-$you-are-member': "Sei un membro di questo progetto",
        'membership-request-$you-are-now-member': "Ora sei un membro di questo progetto",
        'membership-request-$you-have-requested-membership': "Hai richiesto l'iscrizione a questo progetto",
        'membership-request-browse': "Sfoglia",
        'membership-request-cancel': "Annulla",
        'membership-request-join': "Partecipa",
        'membership-request-ok': "OK",
        'membership-request-proceed': "Procedi",
        'membership-request-withdraw': "Ritira",

        'mobile-device-revoke': "revoca",
        'mobile-device-revoke-are-you-sure': "Sei sicuro di voler revocare l'autorizzazione a questo dispositivo?",

        'mobile-setup-address': "Indirizzo del server",
        'mobile-setup-close': "Chiudi",
        'mobile-setup-code': "Codice di autorizzazione",
        'mobile-setup-project': 'Progetto',

        'news-no-stories-by-role': "Nessuna storia di qualcuno con quel ruolo",
        'news-no-stories-found': "Nessuna storia corrispondente trovata",
        'news-no-stories-on-date': "Nessuna storia in quella data",
        'news-no-stories-yet': "Non ci sono ancora storie",

        'notification-$name-added-you-as-coauthor': (name) => {
            return `${name} ti ha invitato a modificare insieme un post`;
        },
        'notification-$name-added-your-post-to-issue-tracker': (name) => {
            return `${name} ha aggiunto il tuo post  al bug tracker`;
        },
        'notification-$name-commented-on-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = "il tuo sondaggio"; break;
                case 'task-list': story = "il elenco di attività"; break;
                case 'post': story = "il tuo post"; break;
                default: story = "la tua storia";
            }
            return `${name} ha commentato ${story}`;
        },
        'notification-$name-completed-task': (name) => {
            return `${name} ha completato un'attività nel tuo elenco`;
        },
        'notification-$name-is-assigned-to-your-issue': (name) => {
            return `${name} è stato assegnato al tuo problema`;
        },
        'notification-$name-likes-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = "il tuo sondaggio"; break;
                case 'task-list': story = "il elenco di attività"; break;
                case 'post': story = "il tuo post"; break;
                default: story = "la tua storia";
            }
            return `A ${name} piace ${story}`;
        },
        'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
            reaction = "un commento";
            return `${name} ti ha menzionato in ${reaction}`;
        },
        'notification-$name-mentioned-you-in-$story': (name, story) => {
            switch (story) {
                case 'survey': story = "un sondaggio"; break;
                case 'task-list': story = "un elenco di attività"; break;
                case 'post': story = "un post"; break;
                case 'issue': story = "un problema"; break;
                case 'merge-request': story = "una merge richiesta"; break;
                default: story = "una storia";
            }
            return `${name} ti ha menzionato in ${story}`;
        },
        'notification-$name-merged-code-to-$branch': (name, branch) => {
            return `${name} ha incorporato modifiche nel branch «${branch}»`;
        },
        'notification-$name-opened-an-issue': (name) => {
            return `${name} ha aperto un problema`;
        },
        'notification-$name-posted-a-note-about-your-$story': (name, story) => {
            switch (story) {
                case 'push': story = 'la tua commit'; break;
                case 'issue': story = 'la tua problema'; break;
                case 'merge-request': story = 'la tua merge richiesta'; break;
            }
            return `${name} ha commentato ${story}`;
        },
        'notification-$name-posted-a-survey': (name) => {
            return `${name} ha pubblicato un sondaggio`;
        },
        'notification-$name-pushed-code-to-$branch': (name, branch) => {
            return `${name} ha inviato modifiche al branch «${branch}»`;
        },
        'notification-$name-requested-to-join': (name) => {
            return `${name} ha chiesto di aderire a questo progetto`;
        },
        'notification-$name-sent-bookmark-to-$story': (name, story) => {
            switch (story) {
                case 'survey': story = "un sondaggio"; break;
                case 'task-list': story = "un elenco di attività"; break;
                case 'post': story = "un post"; break;
                default: story = "una storia";
            }
            return `${name} ti ha inviato un segnalibro per ${story}`;
        },
        'notification-$name-voted-in-your-survey': (name) => {
            return `${name} ha risposto al tuo sondaggio`;
        },
        'notification-option-assignment': "Quando qualcuno è assegnato al tuo problema",
        'notification-option-bookmark': "Quando qualcuno ti manda un segnalibro",
        'notification-option-coauthor': "Quando qualcuno ti invita a modificare in comune un post",
        'notification-option-comment': "Quando qualcuno commenta la tua storia",
        'notification-option-issue': "Quando qualcuno apre un problema",
        'notification-option-join-request': "Quando qualcuno vuole unirsi a questo progetto",
        'notification-option-like': "Quando a qualcuno piace la tua storia",
        'notification-option-mention': "Quando qualcuno ti menziona in una storia o un commento",
        'notification-option-merge': "Quando qualcuno unisce il codice nel branch master",
        'notification-option-note': "Quando qualcuno pubblica una nota su un commit o un problema",
        'notification-option-push': "Quando qualcuno inserisce il codice in Git",
        'notification-option-survey': "Quando qualcuno pubblica un sondaggio",
        'notification-option-task-completion': "Quando qualcuno completa un'attività nel tuo elenco",
        'notification-option-vote': "Quando qualcuno risponde al tuo sondaggio",
        'notification-option-web-session': "Quando una sessione web è attiva",

        'notifications-no-notifications-on-date': "Nessuna notifica in quella data",
        'notifications-no-notifications-yet': "Nessuna notifica ancora",

        'option-add-bookmark': "Aggiungi segnalibro",
        'option-add-issue': "Aggiungi post al bug tracker",
        'option-bump-story': "Promuovi la storia",
        'option-edit-comment': "Modifica il commento",
        'option-edit-post': "Modifica il post",
        'option-hide-comment': "Nascondi il commento agli ospiti",
        'option-hide-story': "Nascondi la storia agli ospiti",
        'option-keep-bookmark': "Mantieni un segnalibro",
        'option-remove-comment': "Rimuovi il commento",
        'option-remove-story': "Rimuovi la storia",
        'option-send-bookmarks': "Invia segnalibri ad altri utenti",
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} utente` : `${count} utenti`;
            var bookmarks = (count === 1) ? `segnalibro` : `segnalibri`;
            return `Invia ${bookmarks} a ${users}`;
        },
        'option-show-media-preview': "Mostra media allegati",
        'option-show-text-preview': "Mostra anteprima di testo",
        'option-statistics-biweekly': "Mostra le attività degli ultimi 14 giorni",
        'option-statistics-monthly': "Mostra attività mensili",
        'option-statistics-to-date': "Mostra le attività fino ad oggi",

        'people-no-stories-found': "Nessuna storia corrispondente trovata",
        'people-no-stories-on-date': "Nessuna attività in quella data",
        'people-no-users-by-role': "Nessun membro del progetto ha quel ruolo",
        'people-no-users-yet': "Nessun membro del progetto ancora",

        'person-no-stories-found': "Nessuna storia corrispondente trovata",
        'person-no-stories-on-date': "Nessuna storia in quella data",
        'person-no-stories-yet': "Non ci sono ancora storie",

        'photo-capture-accept': "Accetta",
        'photo-capture-cancel': "Annulla",
        'photo-capture-retake': "Rigira",
        'photo-capture-snap': "Gira",

        'project-description-close': "Chiudi",

        'project-management-add': "Aggiungi",
        'project-management-cancel': "Annulla",
        'project-management-description': "descrizione del progetto",
        'project-management-join-project': "partecipa al progetto",
        'project-management-manage': "Gestisci lista",
        'project-management-mobile-set-up': "impostazioni del dispositivo mobile",
        'project-management-remove': "Rimuovi",
        'project-management-sign-out': "disconnettersi",
        'project-management-sign-out-are-you-sure': "Sei sicuro di voler uscire da questo server?",
        'project-management-withdraw-request': "ritira la richiesta di adesione",

        'qr-scanner-cancel': "Annulla",
        'qr-scanner-invalid-qr-code': "Codice QR non valido",
        'qr-scanner-qr-code-found': "Codice QR trovato",

        'reaction-$name-added-story-to-issue-tracker': (name) => {
            return `${name} ha aggiunto questo post al bug tracker`;
        },
        'reaction-$name-cast-a-vote': (name) => {
            return `${name} ha votato`;
        },
        'reaction-$name-commented-on-branch': (name) => {
            return `${name} ha commentato questo branch`;
        },
        'reaction-$name-commented-on-issue': (name) => {
            return `${name} ha commentato questo problema`;
        },
        'reaction-$name-commented-on-merge': (name) => {
            return `${name} ha commentato questo merge`;
        },
        'reaction-$name-commented-on-merge-request': (name) => {
            return `${name} ha commentato questo merge richiesta`;
        },
        'reaction-$name-commented-on-push': (name) => {
            return `${name} ha commentato questo push`;
        },
        'reaction-$name-commented-on-tag': (name) => {
            return `${name} ha commentato questo tag`;
        },
        'reaction-$name-completed-a-task': (name) => {
            return `${name} ha completato una attività`;
        },
        'reaction-$name-is-assigned-to-issue': (name) => {
            return `${name} è stato assegnato a questo problema`;
        },
        'reaction-$name-is-assigned-to-merge-request': (name) => {
            return `${name} è stato assegnato a questa merge richiesta`;
        },
        'reaction-$name-is-editing': (name) => {
            return `${name} sta modificando un commento...`;
        },
        'reaction-$name-is-sending': (name) => {
            return `${name} sta inviando un commento...`;
        },
        'reaction-$name-is-writing': (name) => {
            return `${name} sta scrivendo un commento...`;
        },
        'reaction-$name-likes-this': (name) => {
            return `A ${name} piace questo`;
        },
        'reaction-status-storage-pending': "In sospeso",
        'reaction-status-transcoding': "Transcodifica",
        'reaction-status-uploading': "Caricamento",

        'role-filter-no-roles': "Nessun ruolo definito",

        'search-bar-keywords': "termini di ricerca o #hashtag",

        'selection-cancel': "Annulla",
        'selection-ok': "OK",

        'server-type-dropbox': "Dropbox",
        'server-type-facebook': "Facebook",
        'server-type-github': "GitHub",
        'server-type-gitlab': "GitLab",
        'server-type-google': "Google",
        'server-type-windows': "Windows Live",

        'settings-development': "Opzioni dello sviluppatore",
        'settings-device': "Dispositivo mobile",
        'settings-devices': "Dispositivi mobili",
        'settings-language': "Lingua",
        'settings-mobile-alert': "Avviso mobile",
        'settings-notification': "Notificazione",
        'settings-profile-image': "Immagine del profilo",
        'settings-projects': "Progetti",
        'settings-social-networks': "Social Networks",
        'settings-user-information': "Informazioni utente",
        'settings-web-alert': "Avviso web",

        'social-network-github': "URL del profilo GitHub",
        'social-network-gitlab': "URL del profilo GitLab",
        'social-network-ichat': "Nome utente iChat",
        'social-network-linkedin': "URL del profilo Linkedin",
        'social-network-skype': "Nome utente Skype",
        'social-network-slack': "ID utente Slack",
        'social-network-slack-team': "ID della squadra Slack",
        'social-network-stackoverflow': "URL del profilo StackOverflow",
        'social-network-twitter': "Nome utente Twitter",

        'start-activation-add-server': "Aggiungi progetto da un altro server",
        'start-activation-instructions': (ui) => {
            return [
                'Per accedere a un server Trambar su questo dispositivo, accedere prima al server utilizzando un browser web. Seleziona un progetto quindi vai alle ',
                ui.settings,
                '. Nel pannello ',
                ui.projects,
                ', fai clic su ',
                ui.mobileSetup,
                '. Un codice QR apparirà sullo schermo. Su questo dispositivo, premere il pulsante qui sotto e scansionare il codice. In alternativa, è possibile inserire manualmente il codice di attivazione.'
            ];
        },
        'start-activation-instructions-short': (ui) => {
            return [
                'Accedi utilizzando un browser web e scansiona il codice QR mostrato in ',
                ui.settings,
                ' > ',
                ui.mobileSetup,
            ];
        },
        'start-activation-manual': "Manualmente",
        'start-activation-new-server': 'Nuovo server',
        'start-activation-others-servers': 'Server disponibili',
        'start-activation-return': 'Ritorno',
        'start-activation-scan-code': "Scansiona il codice QR",
        'start-error-access-denied': "Richiesta di accesso rifiutata",
        'start-error-account-disabled': "L'account è attualmente disabilitato",
        'start-error-existing-users-only': "Solo il personale autorizzato può accedere a questo sistema",
        'start-error-undefined': "Errore inaspettato",
        'start-no-projects': "Nessun progetto",
        'start-no-servers': "Nessun fornitore OAuth",
        'start-projects': "Progetti",
        'start-social-login': "Social login",
        'start-system-title-default': "Trambar",
        'start-welcome': "Benvenuto!",
        'start-welcome-again': "Benvenuto di nuovo",

        'statistics-bar': "Barre",
        'statistics-line': "Linee",
        'statistics-pie': "Torta",

        'story-$count-reactions': (count) => {
            return (count === 1) ? `1 reazione` : `${count} reazioni`;
        },
        'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
            return `Ha creato il branch «${branch}» nel repository «${repo}»`;
        },
        'story-$name-created-$milestone': (name, milestone) => {
            return `Ha creato il traguardo «${milestone}»`;
        },
        'story-$name-created-$page': (name, page) => {
            return `Ha creato la pagina wiki «${page}»`;
        },
        'story-$name-created-$repo': (name, repo) => {
            var text = `Ha creato il repository `;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
            return `Ha creato il tag «${tag}» nel repository «${repo}»`;
        },
        'story-$name-deleted-$page': (name, page) => {
            return `Ha rimosso la pagina wiki «${page}»`;
        },
        'story-$name-joined-$repo': (name, repo) => {
            var text = `Si è unito al repository`;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-left-$repo': (name, repo) => {
            var text = `Ha lasciato il repository`;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
            var text = `Ha incorporato le modifiche`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `«${branch}»`;
                });
                if (sources.length === 1) {
                    text += ` dal branch `
                } else {
                    text += ` dai branch `
                }
                text += sources.join(', ');
            }
            text += ` nel branch «${branch}»`;
            if (repo) {
                text += ` del repository «${repo}»`;
            }
            return text;
        },
        'story-$name-opened-issue-$number-$title': (name, number, title) => {
            var text = `Ha aperto il problema #${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
            var text = `Ha inviato modifiche al branch «${branch}»`;
            if (repo) {
                text += ` del repository «${repo}»`;
            }
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
            return `Ha richiesto di unire il branch «${branch1}» nel branch «${branch2}»`;
        },
        'story-$name-updated-$page': (name, page) => {
            return `Ha modificato la pagina wiki «${page}»`;
        },
        'story-add-coauthor': "Aggiungi coautore",
        'story-add-remove-coauthor': "Aggiungi/Rimuovi coautore",
        'story-audio': "Audio",
        'story-author-$count-others': (count) => {
            return `altri ${count}`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' e ', name2 ];
        },
        'story-cancel': "Annulla",
        'story-cancel-are-you-sure': "Sei sicuro di voler abbandonare questo post?",
        'story-cancel-edit-are-you-sure': "Sei sicuro di voler abbandonare le modifiche che hai apportato?",
        'story-coauthors': "Coautori",
        'story-comment': "Commenta",
        'story-drop-files-here': "Trascina e rilascia i file multimediali qui",
        'story-file': "File",
        'story-issue-current-status': "Stato attuale:",
        'story-issue-status-closed': "Chiuso",
        'story-issue-status-opened': "Aperto",
        'story-issue-status-reopened': "Riaperto",
        'story-like': "Mi piace",
        'story-markdown': "Markdown",
        'story-milestone-due-date': "Scadenza:",
        'story-milestone-start-date': "Data di inizio:",
        'story-options': "Opzioni",
        'story-paste-image-here': "Qui verrà posizionata anche un'immagine incollata nell'editor di testo",
        'story-pending': "In sospeso...",
        'story-photo': "Foto",
        'story-post': "Pubblica",
        'story-push-added-$count-files': (count) => {
            if (count === 1) {
                return `1 file aggiunto`;
            } else {
                return `${count} file aggiunti`;
            }
        },
        'story-push-added-$count-lines': (count) => {
            if (count === 1) {
                return `1 riga aggiunto`;
            } else {
                return `${count} righe aggiunti`;
            }
        },
        'story-push-components-changed': "Le seguenti parti sono state cambiate:",
        'story-push-deleted-$count-files': (count) => {
            if (count === 1) {
                return `1 file rimosso`;
            } else {
                return `${count} file rimossi`;
            }
        },
        'story-push-deleted-$count-lines': (count) => {
            if (count === 1) {
                return `1 righe rimosso`;
            } else {
                return `${count} riga rimossi`;
            }
        },
        'story-push-modified-$count-files': (count) => {
            if (count === 1) {
                return `1 file modificato`;
            } else {
                return `${count} file modificati`;
            }
        },
        'story-push-modified-$count-lines': (count) => {
            if (count === 1) {
                return `1 righe modificato`;
            } else {
                return `${count} riga modificati`;
            }
        },
        'story-push-renamed-$count-files': (count) => {
            if (count === 1) {
                return `1 file rinominato`;
            } else {
                return `${count} file rinominati`;
            }
        },
        'story-remove-yourself': "Rimuovi te stesso",
        'story-remove-yourself-are-you-sure': "Sei sicuro di volerti rimuovere come coautore?",
        'story-status-storage-pending': "In sospeso",
        'story-status-transcoding-$progress': (progress) => {
            return `Transcodifica (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Caricamento (${progress}%)`;
        },

        'story-survey': "Sondaggio",
        'story-task-list': "Elenco delle attività",
        'story-video': "Video",
        'story-vote-submit': "Invia",

        'telephone-dialog-close': "Chiudi",

        'time-$hours-ago': (hours) => {
            return (hours === 1) ? `Un'ora fa` : `${hours} ore fa`;
        },
        'time-$hr-ago': (hr) => {
            return `${hr} ore fa`;
        },
        'time-$min-ago': (min) => {
            return `${min} min fa`;
        },
        'time-$minutes-ago': (minutes) => {
            return (minutes === 1) ? `Un minuto fa` : `${minutes} minuti fa`;
        },
        'time-just-now': "Proprio ora",
        'time-yesterday': "Ieri",

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            return `Caricamento di ${count} file, ${size} rimanenti`;
        },

        'user-actions': "Azioni",

        'user-activity-$name-created-branch': "Ha creato un nuovo branch",
        'user-activity-$name-created-merge-request': "Ha fatto una merge richiesta",
        'user-activity-$name-created-milestone': "Ha creato un traguardo",
        'user-activity-$name-created-repo': "Ha creato un progetto git",
        'user-activity-$name-created-tag': "Ha creato un nuovo tag",
        'user-activity-$name-edited-wiki-page': "Ha curato una pagina wiki",
        'user-activity-$name-joined-repo': "Si è unito a un progetto git",
        'user-activity-$name-left-repo': "Ha lasciato un progetto git",
        'user-activity-$name-merged-code': "Ha eseguito un merge",
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios = (count === 1) ? `un audioclip` : `${count} audioclip`;
            return `Ha pubblicato ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `un link` : `link`;
            var website = (count === 1) ? `un sito web` : `${count} siti web`;
            return `Ha pubblicato ${links} a ${website}`;
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures = (count === 1) ? `a foto` : `${count} foto`;
            return `Ha pubblicato ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos = (count === 1) ? `un videoclip` : `${count} videoclip`;
            return `Ha pubblicato ${videos}`;
        },
        'user-activity-$name-pushed-code': "Ha inviato il codice nel repository",
        'user-activity-$name-reported-issue': "Ha segnalato un problema",
        'user-activity-$name-started-survey': "Ha iniziato un sondaggio",
        'user-activity-$name-started-task-list': "Ha iniziato un elenco di attività",
        'user-activity-$name-wrote-post': "Ha scritto un post",
        'user-activity-back': "Indietro",
        'user-activity-more': "Altre",

        'user-image-adjust': 'Regola',
        'user-image-cancel': 'Annulla',
        'user-image-replace': 'Sostituisci',
        'user-image-save': 'Salva',
        'user-image-select': 'Seleziona',
        'user-image-snap': 'Scatta',

        'user-info-email': "Indirizzo e-mail",
        'user-info-gender': "Genere",
        'user-info-gender-female': "Femmina",
        'user-info-gender-male': "Maschio",
        'user-info-gender-unspecified': "Imprecisato",
        'user-info-name': "Nome e cognome",
        'user-info-phone': "Numero di telefono",

        'user-statistics-legend-branch': "Nuovi branch",
        'user-statistics-legend-issue': "Problemi",
        'user-statistics-legend-member': "Cambiamenti di appartenenza",
        'user-statistics-legend-merge': "Merge",
        'user-statistics-legend-merge-request': "Merge richieste",
        'user-statistics-legend-milestone': "Traguardi",
        'user-statistics-legend-post': "Post",
        'user-statistics-legend-push': "Push",
        'user-statistics-legend-repo': "Cambiamenti del repository",
        'user-statistics-legend-survey': "Sondaggi",
        'user-statistics-legend-tag': "Nuovi tag",
        'user-statistics-legend-task-list': "Elenchi di attività",
        'user-statistics-legend-wiki': "Modifiche wiki",
        'user-statistics-today': "Oggi",
        'user-statistics-tooltip-$count-branch': (count) => {
            return `${count} branch`;
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 problema` : `${count} problemi`;
        },
        'user-statistics-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 cambiamento di appartenenza` : `${count} cambiamenti di appartenenza`;
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            return `${count} merge`;
        },
        'user-statistics-tooltip-$count-merge-request': (count) => {
            return (count === 1) ? `1 merge richiesta` : `${count} merge richieste`;
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 traguardo` : `${count} traguardi`;
        },
        'user-statistics-tooltip-$count-post': (count) => {
            return `${count} post`;
        },
        'user-statistics-tooltip-$count-push': (count) => {
            return `${count} push`;
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 cambiamento del repository` : `${count} cambiamenti del repository`;
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 sondaggio` : `${count} sondaggi`;
        },
        'user-statistics-tooltip-$count-tag': (count) => {
            return `${count} tag`;
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 elenco di attività` : `${count} elenchi di attività`;
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 modifica wiki` : `${count} modifiche Wiki`;
        },

        'video-capture-accept': "Accetta",
        'video-capture-cancel': "Annulla",
        'video-capture-pause': "Pausa",
        'video-capture-resume': "Riprendi",
        'video-capture-retake': "Ricomincia",
        'video-capture-start': "Comincia",
        'video-capture-stop': "Termina",

        'warning-no-connection': "Nessun aggiornamento istantaneo",
    };
};
