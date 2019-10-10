import 'moment/locale/it';
import { cardinal, list } from 'common/locale/grammars/italian.mjs';

const phrases = {
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
        return cardinal(count, "1 nuovo segnalibro", "2 nuovi segnalibri");
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, "1 nuova notifica", "2 nuove notifiche");
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, "1 nuova storia", "2 nuove storie");
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
        return cardinal(count, "1 altro utente", "2 altri utenti");
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, "1 utente", "2 utenti");
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} lo raccomanda`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` e `, name2, ` lo raccomandano` ];
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

    'country-name-ad': "Andorra",
    'country-name-ae': "Emirati Arabi Uniti",
    'country-name-af': "Afghanistan",
    'country-name-ag': "Antigua e Barbuda",
    'country-name-al': "Albania",
    'country-name-am': "Armenia",
    'country-name-ao': "Angola",
    'country-name-ar': "Argentina",
    'country-name-at': "Austria",
    'country-name-au': "Australia",
    'country-name-az': "Azerbaijan",
    'country-name-ba': "Bosnia Erzegovina",
    'country-name-bb': "Barbados",
    'country-name-bd': "Bangladesh",
    'country-name-be': "Belgio",
    'country-name-bf': "Burkina Faso",
    'country-name-bg': "Bulgaria",
    'country-name-bh': "Bahrain",
    'country-name-bi': "Burundi",
    'country-name-bj': "Benin",
    'country-name-bn': "Brunei",
    'country-name-bo': "Bolivia",
    'country-name-br': "Brasile",
    'country-name-bs': "Bahamas",
    'country-name-bt': "Bhutan",
    'country-name-bw': "Botswana",
    'country-name-by': "Bielorussia",
    'country-name-bz': "Belize",
    'country-name-ca': "Canada",
    'country-name-cd ': "Congo",
    'country-name-cf': "Repubblica Centrafricana",
    'country-name-cg': "Repubblica del Congo",
    'country-name-ch': "Svizzera",
    'country-name-ci': "Costa d'Avorio",
    'country-name-cl': "Chile",
    'country-name-cm': "Camerun",
    'country-name-cn': "Cina",
    'country-name-co': "Colombia",
    'country-name-cr': "Costa Rica",
    'country-name-cu': "Cuba",
    'country-name-cv': "capo Verde",
    'country-name-cy': "Cipro",
    'country-name-cz': "Repubblica Ceca",
    'country-name-de': "Germania",
    'country-name-dj': "Gibuti",
    'country-name-dk': "Danimarca",
    'country-name-dm': "Dominica",
    'country-name-do': "Repubblica Dominicana",
    'country-name-dz': "Algeria",
    'country-name-ec': "Ecuador",
    'country-name-ee': "Estonia",
    'country-name-eg': "Egitto",
    'country-name-er': "Eritrea",
    'country-name-es': "Spagna",
    'country-name-et': "Etiopia",
    'country-name-fi': "Finlandia",
    'country-name-fj': "Fiji",
    'country-name-fm': "Micronesia",
    'country-name-fr': "Francia",
    'country-name-ga': "Gabon",
    'country-name-gb': "Regno Unito",
    'country-name-gd': "Grenada",
    'country-name-ge': "Georgia",
    'country-name-gh': "Ghana",
    'country-name-gm': "Gambia",
    'country-name-gn': "Guinea",
    'country-name-gq': "Guinea Equatoriale",
    'country-name-gr': "Grecia",
    'country-name-gt': "Guatemala",
    'country-name-gw': "Guinea-Bissau",
    'country-name-gy': "Guyana",
    'country-name-hk': "Hong Kong",
    'country-name-hn': "Honduras",
    'country-name-hr': "Croazia",
    'country-name-ht': "Haiti",
    'country-name-hu': "Ungheria",
    'country-name-id': "Indonesia",
    'country-name-ie': "Irlanda",
    'country-name-il': "Israele",
    'country-name-in': "India",
    'country-name-iq': "Iraq",
    'country-name-ir': "Iran",
    'country-name-is': "Islanda",
    'country-name-it': "Italia",
    'country-name-jm': "Giamaica",
    'country-name-jo': "Giordania",
    'country-name-jp': "Giappone",
    'country-name-ke': "Kenia",
    'country-name-kg': "Kyrgyzstan",
    'country-name-kh': "Cambogia",
    'country-name-ki': "Kiribati",
    'country-name-km': "Comoros",
    'country-name-kn': "Saint Kitts e Nevis",
    'country-name-kp': "Corea del nord",
    'country-name-kr': "Corea del Sud",
    'country-name-kw': "Kuwait",
    'country-name-kz': "Kazakistan",
    'country-name-la': "Laos",
    'country-name-lb': "Libano",
    'country-name-lc': "Santa Lucia",
    'country-name-li': "Liechtenstein",
    'country-name-lk': "Sri Lanka",
    'country-name-lr': "Liberia",
    'country-name-ls': "Lesoto",
    'country-name-lt': "Lituania",
    'country-name-lu': "Lussemburgo",
    'country-name-lv': "Lettonia",
    'country-name-ly': "Libia",
    'country-name-ma': "Marocco",
    'country-name-mc': "Monaco",
    'country-name-md': "Moldova",
    'country-name-me': "Montenegro",
    'country-name-mg': "Madagascar",
    'country-name-mh': "Isole Marshall",
    'country-name-mk': "Macedonia del Nord",
    'country-name-ml': "Mali",
    'country-name-mm': "Myanmar",
    'country-name-mn': "Mongolia",
    'country-name-mo': "Macau",
    'country-name-mr': "Mauritania",
    'country-name-mt': "Malta",
    'country-name-mu': "Mauritius",
    'country-name-mv': "Maldive",
    'country-name-mw': "Malawi",
    'country-name-mx': "Messico",
    'country-name-my': "Malaysia",
    'country-name-mz': "Mozambico",
    'country-name-na': "Namibia",
    'country-name-ne': "Niger",
    'country-name-ng': "Nigeria",
    'country-name-ni': "Nicaragua",
    'country-name-nl': "Olanda",
    'country-name-no': "Norvegia",
    'country-name-np': "Nepal",
    'country-name-nr': "Nauru",
    'country-name-nz': "Nuova Zelanda",
    'country-name-om': "Oman",
    'country-name-pa': "Panama",
    'country-name-pe': "Perù",
    'country-name-pg': "Papua Nuova Guinea",
    'country-name-ph': "Filippine",
    'country-name-pk': "Pakistan",
    'country-name-pl': "Polonia",
    'country-name-ps': "Palestina",
    'country-name-pt': "Portogallo",
    'country-name-pw': "Palau",
    'country-name-py': "Paraguay",
    'country-name-qa': "Qatar",
    'country-name-ro': "Romania",
    'country-name-rs': "Serbia",
    'country-name-ru': "Russia",
    'country-name-rw': "Ruanda",
    'country-name-sa': "Arabia Saudita",
    'country-name-sb': "Isole Salomone",
    'country-name-sc': "Seychelles",
    'country-name-sd': "Sudan",
    'country-name-se': "Svezia",
    'country-name-sg': "Singapore",
    'country-name-si': "Slovenia",
    'country-name-sk': "Slovacchia",
    'country-name-sl': "Sierra Leone",
    'country-name-sm': "San Marino",
    'country-name-sn': "Senegal",
    'country-name-so': "Somalia",
    'country-name-sr': "Suriname",
    'country-name-ss': "Sudan del Sud",
    'country-name-st': "São Tomé e Principe",
    'country-name-sv': "El Salvador",
    'country-name-sy': "Siria",
    'country-name-sz': "Eswatini",
    'country-name-td': "Chad",
    'country-name-tg': "Togo",
    'country-name-th': "Tailandia",
    'country-name-tj': "Tajikistan",
    'country-name-tl': "Timor Est",
    'country-name-tm': "Turkmenistan",
    'country-name-tn': "Tunisia",
    'country-name-to': "Tonga",
    'country-name-tr': "Turchia",
    'country-name-tt': "Trinidad e Tobago",
    'country-name-tv': "Tuvalu",
    'country-name-tw': "Taiwan",
    'country-name-tz': "Tanzania",
    'country-name-ua': "Ucraina",
    'country-name-ug': "Uganda",
    'country-name-us': "Stati Uniti",
    'country-name-uy': "Uruguay",
    'country-name-uz': "Uzbekistan",
    'country-name-va': "Santa Sede",
    'country-name-vc': "Saint Vincent e Grenadine",
    'country-name-ve': "Venezuela",
    'country-name-vn': "Vietnam",
    'country-name-vu': "Vanuatu",
    'country-name-ws': "Samoa",
    'country-name-ye': "Yemen",
    'country-name-za': "Sud Africa",
    'country-name-zm': "Zambia",
    'country-name-zw': "Zimbabwe",
    'country-name-zz': "Altri",

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

    'image-editor-image-transfer-in-progress': "Copia immagine dal sito...",
    'image-editor-page-rendering-in-progress': "Creazione dell'anteprima del sito...",
    'image-editor-poster-extraction-in-progress': "Estrazione dell'anteprima dal video...",
    'image-editor-upload-in-progress': "Carica in corso...",

    'issue-cancel': "Annulla",
    'issue-delete': "Elimina",
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        if (photos > 0) {
            objects.push(cardinal(photos, "la immagine", "le immagini"));
        }
        if (videos > 0) {
            objects.push(cardinal(videos, "il videoclip", "i videoclip"));
        }
        if (audios > 0) {
            objects.push(cardinal(audios, "il audioclip", "i audioclip"));
        }
        if (objects.length > 0) {
            objects[0] = objects[0].replace(/^(\S+)/, '$1 seguenti');
        }
        let verb = (names.length === 1) ? 'ha' : 'hanno';
        return `${list(names)} ${verb} inviato ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        return `${list(names)} scritto:`;
    },
    'issue-ok': "OK",
    'issue-repo': "Repository",
    'issue-title': "Titolo",

    'list-$count-more': (count) => {
        return cardinal(count, "altro 1...", "altri 2...");
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
    'notification-$name-is-assigned-to-your-$story': (name, story) => {
        switch (story) {
            case 'issue': story = 'al tuo problema'; break;
            case 'merge-request': story = 'alla tua merge richiesta'; break;
        }
        return `${name} è stato assegnato ${story}`;
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
        let users = cardinal(count, "1 utente", "2 utenti");
        let bookmarks = cardinal(count, "segnalibro", "segnalibri");
        return `Invia ${bookmarks} a ${users}`;
    },
    'option-show-media-preview': "Mostra media allegati",
    'option-show-text-preview': "Mostra anteprima di testo",
    'option-statistics-14-days': "Mostra le attività degli ultimi 14 giorni",
    'option-statistics-biweekly': "Mostra attività bisettimanali",
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
    'qr-scanner-code-found': "Codice QR trovato",
    'qr-scanner-code-invalid': "Codice QR non valido",
    'qr-scanner-code-used': 'Codice QR obsoleto',

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
        return cardinal(count, "1 reazione", "2 reazioni");
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
        let text = `Ha creato il repository `;
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
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `Ha cancellato il progetto`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `Ha importato il progetto`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let text = `Si è unito al repository`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let text = `Ha lasciato il repository`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let text = `Ha incorporato le modifiche`;
        if (branches?.length > 0) {
            let sources = branches.map((branch) => {
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
        let text = `Ha aperto il problema #${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let text = `Ha inviato modifiche al branch «${branch}»`;
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
        return cardinal(count, "1 altro", "2 altri");
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` e `, name2 ];
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
    'story-issue-status-merged': "Unito",
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
        return cardinal(count, "1 file aggiunto", "2 file aggiunti");
    },
    'story-push-added-$count-lines': (count) => {
        return cardinal(count, "1 righe aggiunto", "2 riga aggiunti");
    },
    'story-push-components-changed': "Le seguenti parti sono state cambiate:",
    'story-push-deleted-$count-files': (count) => {
        return cardinal(count, "1 file rimosso", "2 file rimossi");
    },
    'story-push-deleted-$count-lines': (count) => {
        return cardinal(count, "1 righe rimosso", "2 riga rimossi");
    },
    'story-push-modified-$count-files': (count) => {
        return cardinal(count, "1 file modificato", "2 file modificati");
    },
    'story-push-modified-$count-lines': (count) => {
        return cardinal(count, "1 righe modificato", "2 riga modificati");
    },
    'story-push-renamed-$count-files': (count) => {
        return cardinal(count, "1 file rinominato", "2 file rinominati");
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

    'time-$days-ago': (days) => {
        let time = cardinal(days, "Un giorno", "2 giorni");
        return `${time} fa`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, "Un'ora", "2 ore");
        return `${time} fa`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} ore fa`;
    },
    'time-$min-ago': (min) => {
        return `${min} min fa`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, "Un minuto", "2 minuti");
        return `${time} fa`;
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
    'user-activity-$name-deleted-repo': "Ha cancellato un progetto git",
    'user-activity-$name-edited-wiki-page': "Ha curato una pagina wiki",
    'user-activity-$name-imported-repo': "Ha importato un progetto git",
    'user-activity-$name-joined-repo': "Si è unito a un progetto git",
    'user-activity-$name-left-repo': "Ha lasciato un progetto git",
    'user-activity-$name-merged-code': "Ha eseguito un merge",
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, "un audioclip", "2 audioclip");
        return `Ha pubblicato ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, "un link", "link");
        let website = cardinal(count, "un sito web", "2 siti web");
        return `Ha pubblicato ${links} a ${website}`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, "una foto", "2 foto");
        return `Ha pubblicato ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, "un videoclip", "2 videoclip");
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
    'user-statistics-legend-snapshot': "Revisioni del sito Web",
    'user-statistics-legend-survey': "Sondaggi",
    'user-statistics-legend-tag': "Nuovi tag",
    'user-statistics-legend-task-list': "Elenchi di attività",
    'user-statistics-legend-website-traffic': "Rapporti sul traffico",
    'user-statistics-legend-wiki': "Modifiche wiki",
    'user-statistics-today': "Oggi",
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, "1 branch");
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, "1 problema", "2 problemi");
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, "1 cambiamento di appartenenza", "2 cambiamenti di appartenenza");
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, "1 merge");
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, "1 merge richiesta", "2 merge richieste");
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, "1 traguardo", "2 traguardi");
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, "1 post");
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, "1 push");
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, "1 cambiamento del repository", "2 cambiamenti del repository");
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, "1 sondaggio", "2 sondaggi");
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, "1 tag");
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, "1 elenco di attività", "2 elenchi di attività");
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, "1 modifica wiki", "2 modifiche Wiki");
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

export {
    phrases,
};
