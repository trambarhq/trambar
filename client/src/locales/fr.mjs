import 'moment/locale/fi';
import { cardinal, list } from 'common/locale/grammars/french.mjs';

const phrases = {
    'action-contact-by-email': "Contacter par email",
    'action-contact-by-ichat': "Contacter avec iChat",
    'action-contact-by-phone': "Contacter par téléphone",
    'action-contact-by-skype': "Contacter avec Skype",
    'action-contact-by-slack': "Contacter avec Slack",
    'action-contact-by-twitter': "Contacter avec Twitter",
    'action-view-github-page': "Voir la page GitHub",
    'action-view-gitlab-page': "Voir la page GitLab",
    'action-view-linkedin-page': "Voir la page LinkedIn",
    'action-view-stackoverflow-page': "Voir la page Stack Overflow",

    'activation-address': "Adresse du serveur",
    'activation-cancel': "Annuler",
    'activation-code': "Code d'activation",
    'activation-ok': "OK",
    'activation-schema': "Projet",

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, "1 nouveau signet", "2 nouveaux signets");
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, "1 nouvelle notification", "2 nouvelles notifications");
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, "1 nouvelle histoire", "2 nouvelles histoires");
    },

    'app-component-close': "Fermer",

    'app-name': "Trambar",

    'audio-capture-accept': "Accepter",
    'audio-capture-cancel': "Annuler",
    'audio-capture-pause': "Pauser",
    'audio-capture-rerecord': "Réenregistrer",
    'audio-capture-resume': "Reprendre",
    'audio-capture-start': "Commencer",
    'audio-capture-stop': "Arrêter",

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, "1 autre utilisateur", "2 autres utilisateurs");
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, "1 utilisateur", "2 utilisateurs");
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} recommande ceci`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` et `, name2, ` recommandent ceci` ];
    },
    'bookmark-$you-bookmarked-it': "Vous avez ajouté un signet à cette",
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Vous avez ajouté un signet à cette (et ${name} recommande ceci)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
        return [ `Vous avez ajouté un signet à cette (et `, others, ` recommandent ceci)` ];
    },
    'bookmark-recommendations': "Recommandations",

    'bookmarks-no-bookmarks': "Aucun signet",

    'bottom-nav-bookmarks': "Signets",
    'bottom-nav-news': "Nouvelles",
    'bottom-nav-notifications': "Notifications",
    'bottom-nav-people': "Personnes",
    'bottom-nav-settings': "Paramètres",

    'confirmation-cancel': "Annuler",
    'confirmation-confirm': "Confirmer",

    'country-name-ad': "Andorre",
    'country-name-ae': "Emirats Arabes Unis",
    'country-name-af': "Afghanistan",
    'country-name-ag': "Antigua-et-Barbuda",
    'country-name-al': "Albanie",
    'country-name-am': "Arménie",
    'country-name-ao': "Angola",
    'country-name-ar': "Argentine",
    'country-name-at': "Autriche",
    'country-name-au': "Australie",
    'country-name-az': "Azerbaïdjan",
    'country-name-ba': "Bosnie Herzégovine",
    'country-name-bb': "Barbade",
    'country-name-bd': "Bangladesh",
    'country-name-be': "Belgique",
    'country-name-bf': "Burkina Faso",
    'country-name-bg': "Bulgarie",
    'country-name-bh': "Bahrein",
    'country-name-bi': "Burundi",
    'country-name-bj': "Bénin",
    'country-name-bn': "Brunei",
    'country-name-bo': "Bolivie",
    'country-name-br': "Brésil",
    'country-name-bs': "Bahamas",
    'country-name-bt': "Bhoutan",
    'country-name-bw': "Botswana",
    'country-name-by': "Biélorussie",
    'country-name-bz': "Belize",
    'country-name-ca': "Canada",
    'country-name-cd ': "Congo",
    'country-name-cf': "République centrafricaine",
    'country-name-cg': "République du Congo",
    'country-name-ch': "Suisse",
    'country-name-ci': "Côte d'Ivoire",
    'country-name-cl': "Chili",
    'country-name-cm': "Cameroun",
    'country-name-cn': "Chine",
    'country-name-co': "Colombie",
    'country-name-cr': "Costa Rica",
    'country-name-cu': "Cuba",
    'country-name-cv': "Cap-Vert",
    'country-name-cy': "Chypre",
    'country-name-cz': "République Tchèque",
    'country-name-de': "Allemagne",
    'country-name-dj': "Djibouti",
    'country-name-dk': "Danemark",
    'country-name-dm': "Dominique",
    'country-name-do': "République Dominicaine",
    'country-name-dz': "Algérie",
    'country-name-ec': "Équateur",
    'country-name-ee': "Estonie",
    'country-name-eg': "Egypte",
    'country-name-er': "Erythrée",
    'country-name-es': "Espagne",
    'country-name-et': "Ethiopie",
    'country-name-fi': "Finlande",
    'country-name-fj': "Fidji",
    'country-name-fm': "Micronésie",
    'country-name-fr': "France",
    'country-name-ga': "Gabon",
    'country-name-gb': "Royaume-Uni",
    'country-name-gd': "Grenade",
    'country-name-ge': "Géorgie",
    'country-name-gh': "Ghana",
    'country-name-gm': "Gambie",
    'country-name-gn': "Guinée",
    'country-name-gq': "Guinée Équatoriale",
    'country-name-gr': "Grèce",
    'country-name-gt': "Guatemala",
    'country-name-gw': "Guinée Bissau",
    'country-name-gy': "Guyane",
    'country-name-hk': "Hong Kong",
    'country-name-hn': "Honduras",
    'country-name-hr': "Croatie",
    'country-name-ht': "Haïti",
    'country-name-hu': "Hongrie",
    'country-name-id': "Indonésie",
    'country-name-ie': "Irlande",
    'country-name-il': "Israël",
    'country-name-in': "Inde",
    'country-name-iq': "Irak",
    'country-name-ir': "Iran",
    'country-name-is': "Islande",
    'country-name-it': "Italie",
    'country-name-jm': "Jamaïque",
    'country-name-jo': "Jordan",
    'country-name-jp': "Japon",
    'country-name-ke': "Kenya",
    'country-name-kg': "Kirghizistan",
    'country-name-kh': "Cambodge",
    'country-name-ki': "Kiribati",
    'country-name-km': "Comores",
    'country-name-kn': "Saint-Christophe-et-Niévès",
    'country-name-kp': "Corée du Nord",
    'country-name-kr': "Corée du Sud",
    'country-name-kw': "Koweit",
    'country-name-kz': "Kazakhstan",
    'country-name-la': "Laos",
    'country-name-lb': "Liban",
    'country-name-lc': "Sainte-Lucie",
    'country-name-li': "Liechtenstein",
    'country-name-lk': "Sri Lanka",
    'country-name-lr': "Libéria",
    'country-name-ls': "Lesotho",
    'country-name-lt': "Lituanie",
    'country-name-lu': "Luxembourg",
    'country-name-lv': "Lettonie",
    'country-name-ly': "Libye",
    'country-name-ma': "Maroc",
    'country-name-mc': "Monaco",
    'country-name-md': "Moldavie",
    'country-name-me': "Monténégro",
    'country-name-mg': "Madagascar",
    'country-name-mh': "Iles Marshall",
    'country-name-mk': "Macédoine du Nord",
    'country-name-ml': "Mali",
    'country-name-mm': "Myanmar",
    'country-name-mn': "Mongolie",
    'country-name-mo': "Macao",
    'country-name-mr': "Mauritanie",
    'country-name-mt': "Malte",
    'country-name-mu': "Maurice",
    'country-name-mv': "Maldives",
    'country-name-mw': "Malawi",
    'country-name-mx': "Mexique",
    'country-name-my': "Malaisie",
    'country-name-mz': "Mozambique",
    'country-name-na': "Namibie",
    'country-name-ne': "Niger",
    'country-name-ng': "Nigeria",
    'country-name-ni': "Nicaragua",
    'country-name-nl': "Pays-Bas",
    'country-name-no': "Norvège",
    'country-name-np': "Népal",
    'country-name-nr': "Nauru",
    'country-name-nz': "Nouvelle-Zélande",
    'country-name-om': "Oman",
    'country-name-pa': "Panama",
    'country-name-pe': "Pérou",
    'country-name-pg': "Papouasie Nouvelle Guinée",
    'country-name-ph': "Philippines",
    'country-name-pk': "Pakistan",
    'country-name-pl': "Pologne",
    'country-name-ps': "Palestine",
    'country-name-pt': "Portugal",
    'country-name-pw': "Palau",
    'country-name-py': "Paraguay",
    'country-name-qa': "Qatar",
    'country-name-ro': "Roumanie",
    'country-name-rs': "Serbie",
    'country-name-ru': "Russie",
    'country-name-rw': "Rwanda",
    'country-name-sa': "Arabie Saoudite",
    'country-name-sb': "Îles Salomon",
    'country-name-sc': "Seychelles",
    'country-name-sd': "Soudan",
    'country-name-se': "Suède",
    'country-name-sg': "Singapour",
    'country-name-si': "Slovénie",
    'country-name-sk': "Slovaquie",
    'country-name-sl': "Sierra Leone",
    'country-name-sm': "Saint Marin",
    'country-name-sn': "Sénégal",
    'country-name-so': "Somalie",
    'country-name-sr': "Suriname",
    'country-name-ss': "Soudan du sud",
    'country-name-st': "São Tomé et Príncipe",
    'country-name-sv': "Le Salvador",
    'country-name-sy': "Syrie",
    'country-name-sz': "Eswatini",
    'country-name-td': "Tchad",
    'country-name-tg': "Togo",
    'country-name-th': "Thaïlande",
    'country-name-tj': "Tadjikistan",
    'country-name-tl': "Timor oriental",
    'country-name-tm': "Turkménistan",
    'country-name-tn': "Tunisie",
    'country-name-to': "Tonga",
    'country-name-tr': "Turquie",
    'country-name-tt': "Trinité-et-Tobago",
    'country-name-tv': "Tuvalu",
    'country-name-tw': "Taïwan",
    'country-name-tz': "Tanzanie",
    'country-name-ua': "Ukraine",
    'country-name-ug': "Ouganda",
    'country-name-us': "États Unis",
    'country-name-uy': "Uruguay",
    'country-name-uz': "Ouzbekistan",
    'country-name-va': "Saint-Siège",
    'country-name-vc': "Saint-Vincent-et-les-Grenadines",
    'country-name-ve': "Venezuela",
    'country-name-vn': "Vietnam",
    'country-name-vu': "Vanuatu",
    'country-name-ws': "Samoa",
    'country-name-ye': "Yémen",
    'country-name-za': "Afrique du Sud",
    'country-name-zm': "Zambie",
    'country-name-zw': "Zimbabwe",
    'country-name-zz': "Autres",

    'development-code-push-$deployment': (deployment) => {
        return `Télécharger les mises à jour du code depuis «${deployment}»`;
    },
    'development-show-diagnostics': "Voir le diagnostic",
    'development-show-panel': "Afficher ce panneau",

    'device-selector-camera-$number': (number) => {
        return `Caméra ${number}`;
    },
    'device-selector-camera-back': "Arrière",
    'device-selector-camera-front': "Frontale",
    'device-selector-mic-$number': (number) => {
        return `Microphone ${number}`;
    },

    'empty-currently-offline': "Vous êtes actuellement hors ligne",

    'image-editor-image-transfer-in-progress': "Copier l'image du site web...",
    'image-editor-page-rendering-in-progress': "Rendu de l'aperçu du site Web...",
    'image-editor-poster-extraction-in-progress': "Extraire l'aperçu de la vidéo...",
    'image-editor-upload-in-progress': "Télécharger en cours...",

    'issue-cancel': "Annuler",
    'issue-delete': "Effacer",
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos > 0) {
            objects.push(cardinal(photos, "l'image", "les images"));
            ae = (photos === 1) ? "e" : "es";
        }
        if (videos > 0) {
            objects.push(cardinal(videos, "le clip vidéo", "les clips vidéo"));
            ae = (videos === 1) ? "" : "s";
        }
        if (audios > 0) {
            objects.push(cardinal(audios, "le clip audio", "les clips audio"));
            ae = (videos === 1) ? "" : "s";
        }
        if (objects.length > 1) {
            ae = "s";
        }
        let verb = (names.length === 1) ? "a" : "ont";
        return `${list(names)} ${verb} posté ${list(objects)} suivant${ae}:`;
    },
    'issue-export-$names-wrote': (names) => {
        return `${list(names)} a écrit:`;
    },
    'issue-ok': "OK",
    'issue-repo': "Dépôt",
    'issue-title': "Titre",

    'list-$count-more': (count) => {
        return `${count} de plus...`;
    },

    'media-close': "Fermer",
    'media-download-original': "Télécharger l'original",
    'media-editor-embed': "Incorporer",
    'media-editor-remove': "Supprimer",
    'media-editor-shift': "Décaler",
    'media-next': "Suivant",
    'media-previous': "Précédent",

    'membership-request-$you-are-member': "Vous êtes membre de ce projet",
    'membership-request-$you-are-now-member': "Vous êtes maintenant membre de ce projet",
    'membership-request-$you-have-requested-membership': "Vous avez demandé l'adhésion à ce projet",
    'membership-request-browse': "Feuilleter",
    'membership-request-cancel': "Annuler",
    'membership-request-join': "Rejoindre",
    'membership-request-ok': "OK",
    'membership-request-proceed': "Procéder",
    'membership-request-withdraw': "Retirer",

    'mobile-device-revoke': "révoquer",
    'mobile-device-revoke-are-you-sure': "Êtes-vous sûr de vouloir révoquer l'autorisation pour cet appareil?",

    'mobile-setup-address': "Adresse du serveur",
    'mobile-setup-close': "Fermer",
    'mobile-setup-code': "Code d'autorisation",
    'mobile-setup-project': "Projet",

    'news-no-stories-by-role': "Aucune histoire par quelqu'un avec ce rôle",
    'news-no-stories-found': "Aucune histoire correspondante trouvée",
    'news-no-stories-on-date': "Pas d'histoires à cette date",
    'news-no-stories-yet': "Pas encore d'histoires",

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} vous a invité à éditer ensemble un message`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} a ajouté votre message au tracker d'émission`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'sondage'; break;
            case 'task-list': story = 'liste de tâches'; break;
            case 'post': story = 'message'; break;
            default: story = 'histoire';
        }
        return `${name} a commenté votre ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} a terminé une tâche sur votre liste`;
    },
    'notification-$name-is-assigned-to-your-$story': (name, story) => {
        switch (story) {
            case 'issue': story = 'votre problème'; break;
            case 'merge-request': story = 'votre requête de fusion'; break;
        }
        return `${name} est affecté à ${story}`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'sondage'; break;
            case 'task-list': story = 'liste de tâches'; break;
            case 'post': story = 'message'; break;
            default: story = 'histoire';
        }
        return `${name} aime votre ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'un commentaire';
        return `${name} vous a mentionné dans ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'un sondage'; break;
            case 'task-list': story = 'une liste de tâches'; break;
            case 'post': story = 'un message'; break;
            case 'issue': story = 'un problème'; break;
            case 'merge-request': story = 'une requête de fusion'; break;
            default: story = 'une histoire';
        }
        return `${name} vous a mentionné dans ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} a fusionné les changements en branche «${branch}»`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} a ouvert un problème`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'commit'; break;
            case 'issue': story = 'problème'; break;
            case 'merge-request': story = 'requête de fusion'; break;
        }
        return `${name} a posté une note à propos de votre ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} a posté un sondage`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} a poussé les changements à la branche «${branch}»`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} a demandé à rejoindre ce projet`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'un sondage'; break;
            case 'task-list': story = 'une liste de tâches'; break;
            case 'post': story = 'un message'; break;
            default: story = 'une histoire';
        }
        return `${name} vous a envoyé un signet à ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} a répondu à votre sondage`;
    },
    'notification-option-assignment': "Quand quelqu'un est assigné à votre problème",
    'notification-option-bookmark': "Quand quelqu'un vous envoie un signet",
    'notification-option-coauthor': "Quand quelqu'un vous invite à éditer ensemble un message",
    'notification-option-comment': "Quand quelqu'un commente votre histoire",
    'notification-option-issue': "Quand quelqu'un ouvre un problème",
    'notification-option-join-request': "Quand quelqu'un veut rejoindre ce projet",
    'notification-option-like': "Quand quelqu'un aime votre histoire",
    'notification-option-mention': "Quand quelqu'un vous mentionne dans une histoire ou un commentaire",
    'notification-option-merge': "Quand quelqu'un fusionne le code dans la branche «master»",
    'notification-option-note': "Quand quelqu'un publie une note sur un commit ou un problème",
    'notification-option-push': "Quand quelqu'un pousse le code dans Git",
    'notification-option-survey': "Quand quelqu'un publie un sondage",
    'notification-option-task-completion': "Quand quelqu'un termine une tâche sur votre liste",
    'notification-option-vote': "Quand quelqu'un répond à votre sondage",
    'notification-option-web-session': "Quand une session Web est active",

    'notifications-no-notifications-on-date': "Aucune notification à cette date",
    'notifications-no-notifications-yet': "Aucune notification pour le moment",

    'option-add-bookmark': "Ajouter un signet",
    'option-add-issue': "Ajouter un post à un tracker d'émission",
    'option-bump-story': "Promouvoir l'histoire",
    'option-edit-comment': "Modifier le commentaire",
    'option-edit-post': "Modifier le message",
    'option-hide-comment': "Masquer le commentaire des invités",
    'option-hide-story': "Masquer l'histoire des invités",
    'option-keep-bookmark': "Garder le signet",
    'option-remove-comment': "Supprimer le commentaire",
    'option-remove-story': "Supprimer l'histoire",
    'option-send-bookmarks': "Envoyer des signets à d'autres utilisateurs",
    'option-send-bookmarks-to-$count-users': (count) => {
        let users = cardinal(count, "1 utilisateur", "2 utilisateurs");
        return `Envoyer des favoris à ${users}`;
    },
    'option-show-media-preview': "Afficher les médias attachés",
    'option-show-text-preview': "Afficher l'aperçu du texte",
    'option-statistics-14-days': "Afficher les activités des 14 derniers jours",
    'option-statistics-biweekly': "Afficher les activités bihebdomadaires",
    'option-statistics-monthly': "Afficher les activités mensuelles",
    'option-statistics-to-date': "Afficher les activités à ce jour",

    'people-no-stories-found': "Aucune histoire correspondante trouvée",
    'people-no-stories-on-date': "Aucune activité à cette date",
    'people-no-users-by-role': "Aucun membre du projet n'a ce rôle",
    'people-no-users-yet': "Aucun membre de projet",

    'person-no-stories-found': "Aucune histoire correspondante trouvée",
    'person-no-stories-on-date': "Pas d'histoires à cette date",
    'person-no-stories-yet': "Pas encore d'histoires",

    'photo-capture-accept': "Accepter",
    'photo-capture-cancel': "Annuler",
    'photo-capture-retake': "Reprendre",
    'photo-capture-snap': "Prendre",

    'project-description-close': "Fermer",

    'project-management-add': "Ajouter",
    'project-management-cancel': "Annuler",
    'project-management-description': "description du projet",
    'project-management-join-project': "rejoindre le projet",
    'project-management-manage': "Gérer la liste",
    'project-management-mobile-set-up': "installation mobile",
    'project-management-remove': "Retirer",
    'project-management-sign-out': "déconnecter",
    'project-management-sign-out-are-you-sure': "Êtes-vous sûr de vouloir vous déconnecter de ce serveur?",
    'project-management-withdraw-request': "retirer la demande d'adhésion",

    'qr-scanner-cancel': "Annuler",
    'qr-scanner-code-found': "QR code trouvé",
    'qr-scanner-code-invalid': "Code QR invalide",
    'qr-scanner-code-used': 'Code QR périmé',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name} a ajouté ce post au tracker d'émission.`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name} a voté`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name} a commenté cette branche`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name} a commenté ce problème`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name} a commenté cette fusions de code`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name} a commenté cette demande de fusion`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name} a commenté cette poussée`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        return `${name} a commenté cette étiquette`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name} a accompli une tâche`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name} a été affecté à ce problème`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name} a été affecté à cette demande de fusion`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} est en train d'éditer un commentaire...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} est en train d'envoyer un commentaire...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} est en train d'écrire un commentaire...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} aime ça`;
    },
    'reaction-status-storage-pending': "En attente",
    'reaction-status-transcoding': "Transcodage",
    'reaction-status-uploading': "Téléchargement",

    'role-filter-no-roles': "Aucun rôle défini",

    'search-bar-keywords': "mots-clés ou #hashtags",

    'selection-cancel': "Annuler",
    'selection-ok': "OK",

    'server-type-dropbox': "Dropbox",
    'server-type-facebook': "Facebook",
    'server-type-github': "GitHub",
    'server-type-gitlab': "GitLab",
    'server-type-google': "Google",
    'server-type-windows': "Windows Live",

    'settings-development': "Options de développeur",
    'settings-device': "Appareil mobile",
    'settings-devices': "Appareils mobiles",
    'settings-language': "Langue",
    'settings-mobile-alert': "Alerte mobile",
    'settings-notification': "Notification",
    'settings-profile-image': "Image de profil",
    'settings-projects': "Projets",
    'settings-social-networks': "Réseaux sociaux",
    'settings-user-information': "Informations de l'utilisateur",
    'settings-web-alert': "Alerte Web",

    'social-network-github': "URL du profil GitHub",
    'social-network-gitlab': "URL du profil GitLab",
    'social-network-ichat': "Nom d'utilisateur iChat",
    'social-network-linkedin': "URL du profil Linkedin",
    'social-network-skype': "Nom d'utilisateur Skype",
    'social-network-slack': "Identifiant d'utilisateur Slack",
    'social-network-slack-team': "Identifiant de l'équipe Slack",
    'social-network-stackoverflow': "URL du profil Stack Overflow",
    'social-network-twitter': "Nom d'utilisateur Twitter",

    'start-activation-add-server': "Ajouter un projet à partir d'un autre serveur",
    'start-activation-instructions': (ui) => {
        return [
            "Pour accéder à un serveur Trambar sur cet appareil, connectez-vous d'abord sur le serveur à l'aide d'un navigateur Web. Sélectionnez un projet puis allez dans ",
            ui.settings,
            ". Dans le panneau ",
            ui.projects,
            ", cliquez sur ",
            ui.mobileSetup,
            ". Un code QR apparaîtra à l'écran. Ensuite sur cet appareil, appuyez sur le bouton ci-dessous et scannez le code. Alternativement, vous pouvez entrer manuellement le code d'activation."
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            "Connectez-vous en utilisant un navigateur Web puis scannez le code QR affiché dans ",
            ui.settings,
            " > ",
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': "Entrée manuelle",
    'start-activation-new-server': "Nouveau serveur",
    'start-activation-others-servers': "Serveurs disponibles",
    'start-activation-return': "Revenir",
    'start-activation-scan-code': "Scanner le code QR",
    'start-error-access-denied': "Demande d'accès rejetée",
    'start-error-account-disabled': "Le compte est actuellement désactivé",
    'start-error-existing-users-only': "Seul le personnel autorisé peut accéder à ce système",
    'start-error-undefined': "Erreur inattendue",
    'start-no-projects': "Aucun projet",
    'start-no-servers': "Aucun fournisseur OAuth",
    'start-projects': "Projets",
    'start-social-login': "Connexion sociale",
    'start-system-title-default': "Trambar",
    'start-welcome': "Bienvenue!",
    'start-welcome-again': "Bienvenue à nouveau",

    'statistics-bar': "À barres",
    'statistics-line': "Linéaire",
    'statistics-pie': "Circulaire",

    'story-$count-reactions': (count) => {
        return cardinal(count, "1 réaction", "2 réactions");
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `A créé la branche «${branch}» dans le projet «${repo}»`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `A créé le jalon «${milestone}»`;
    },
    'story-$name-created-$page': (name, page) => {
        return `A créé la page wiki «${page}»`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let text = `A créé le projet`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        return `A créé la étiquette «${tag}» dans le projet «${repo}»`;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `A supprimé la page wiki «${page}»`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `A supprimé le projet`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `A importé le projet`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let text = `A rejoint le projet`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let text = `A quitté le projet`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let text = `A fusionné le code`;
        if (branches?.length > 0) {
            let sources = branches.map((branch) => {
                return `«${branch}»`;
            });
            text += ` de ${sources.join(', ')}`;
        }
        text += ` dans la branche «${branch}»`;
        if (repo) {
            text += ` du projet «${repo}»`;
        }
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        let text = `A ouvert le problème ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let text = `A poussé les changements à la branche «${branch}»`;
        if (repo) {
            text += ` du projet «${repo}»`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `Demandé de fusionner la branche «${branch1}» en «${branch2}»`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `A mis à jour la page wiki «${page}»`;
    },
    'story-add-coauthor': "Ajouter un coauteur",
    'story-add-remove-coauthor': "Ajouter/Supprimer un coauteur",
    'story-audio': "Audio",
    'story-author-$count-others': (count) => {
        return cardinal(count, "1 autre", "2 autres");
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` et `, name2 ];
    },
    'story-cancel': "Annuler",
    'story-cancel-are-you-sure': "Êtes-vous sûr de vouloir abandonner ce message?",
    'story-cancel-edit-are-you-sure': "Êtes-vous sûr de vouloir abandonner les modifications que vous avez apportées?",
    'story-coauthors': "Coauteurs",
    'story-comment': "Commentaire",
    'story-drop-files-here': "Faites glisser et déposez les fichiers multimédias ici",
    'story-file': "Fichier",
    'story-issue-current-status': "Statut actuel:",
    'story-issue-status-closed': "Fermé",
    'story-issue-status-merged': "Fusionné",
    'story-issue-status-opened': "Ouvert",
    'story-issue-status-reopened': "Rouvert",
    'story-like': "J'aime",
    'story-markdown': "Markdown",
    'story-milestone-due-date': "Date d'échéance:",
    'story-milestone-start-date': "Date de début:",
    'story-options': "Options",
    'story-paste-image-here': "Une image collée dans l'éditeur de texte se retrouvera également ici",
    'story-pending': "En attendant...",
    'story-photo': "Photo",
    'story-post': "Publier",
    'story-push-added-$count-files': (count) => {
        return cardinal(count, "1 fichier ajouté", "2 fichiers ajoutés");
    },
    'story-push-added-$count-lines': (count) => {
        return cardinal(count, "1 ligne ajouté", "2 lignes ajoutés");
    },
    'story-push-components-changed': "The following parts were changed:",
    'story-push-deleted-$count-files': (count) => {
        return cardinal(count, "1 fichier supprimé", "2 fichiers supprimés");
    },
    'story-push-deleted-$count-lines': (count) => {
        return cardinal(count, "1 ligne supprimé", "2 lignes supprimés");
    },
    'story-push-modified-$count-files': (count) => {
        return cardinal(count, "1 fichier modifié", "2 fichiers modifiés");
    },
    'story-push-modified-$count-lines': (count) => {
        return cardinal(count, "1 ligne modifié", "2 lignes modifiés");
    },
    'story-push-renamed-$count-files': (count) => {
        return cardinal(count, "1 fichier renommé", "2 fichiers renommés");
    },
    'story-remove-yourself': "Retirer-vous",
    'story-remove-yourself-are-you-sure': "Êtes-vous sûr de vouloir vous retirer en tant que co-auteur?",
    'story-status-storage-pending': "En attendant",
    'story-status-transcoding-$progress': (progress) => {
        return `Transcodage (${progress}%)`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `Téléchargement (${progress}%)`;
    },
    'story-survey': "Sondage",
    'story-task-list': "Liste de tâches",
    'story-video': "Vidéo",
    'story-vote-submit': "Soumettre",

    'telephone-dialog-close': "Fermer",

    'time-$days-ago': (days) => {
        let time = cardinal(days, "un jour", "2 jours");
        return `Il ya a ${time}`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, "une heure", "2 heures");
        return `Il ya a ${time}`;
    },
    'time-$hr-ago': (hr) => {
        return `Il y a ${hr} h`;
    },
    'time-$min-ago': (min) => {
        return `Il y a ${min} min`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, "une minute", "2 minutes");
        return `Il y a ${time}`;
    },
    'time-just-now': "Juste maintenant",
    'time-yesterday': "Hier",

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, "1 fichier", "2 fichiers");
        return `Téléchargement de ${files}, ${size} restants`;
    },

    'user-actions': "Actes",

    'user-activity-$name-created-branch': "A créé une nouvelle branche",
    'user-activity-$name-created-merge-request': "A fait une demande de fusion",
    'user-activity-$name-created-milestone': "A créé un jalon",
    'user-activity-$name-created-repo': "A créé un projet git",
    'user-activity-$name-created-tag': "A créé une nouvelle étiquette",
    'user-activity-$name-deleted-repo': "A supprimé un projet git",
    'user-activity-$name-edited-wiki-page': "A édité une page wiki",
    'user-activity-$name-imported-repo': "A importé un projet git",
    'user-activity-$name-joined-repo': "A rejoint un projet git",
    'user-activity-$name-left-repo': "A quitté un projet git",
    'user-activity-$name-merged-code': "A effectué une fusion de code",
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, "un clip audio", "2 un clips audio");
        return `A posté ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, "un lien", "des liens");
        let website = cardinal(count, "un site web", "2 sites web");
        return `A posté ${links} vers ${website}`
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, "une photo", "2 photos");
        return `A posté ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, "un clip vidéo", "2 clips vidéo");
        return `A posté ${videos}`;
    },
    'user-activity-$name-pushed-code': "A poussé le code au dépôt",
    'user-activity-$name-reported-issue': "A signalé un problème",
    'user-activity-$name-started-survey': "A commencé une enquête",
    'user-activity-$name-started-task-list': "A commencé une liste de tâches",
    'user-activity-$name-wrote-post': "A écrit un message",
    'user-activity-back': "Arrière",
    'user-activity-more': "Plus",

    'user-image-adjust': "Ajuster",
    'user-image-cancel': "Annuler",
    'user-image-replace': "Remplacer",
    'user-image-save': "Enregistrer",
    'user-image-select': "Sélectionner",
    'user-image-snap': "Prendre",

    'user-info-email': "Adresse e-mail",
    'user-info-gender': "Genre",
    'user-info-gender-female': "Femelle",
    'user-info-gender-male': "Mâle",
    'user-info-gender-unspecified': "Non spécifié",
    'user-info-name': "Nom",
    'user-info-phone': "Numéro de téléphone",

    'user-statistics-legend-branch': "Nouvelles branches",
    'user-statistics-legend-issue': "Problèmes",
    'user-statistics-legend-member': "Changement d'adhésion",
    'user-statistics-legend-merge': "Fusions de code",
    'user-statistics-legend-merge-request': "Demandes de fusion",
    'user-statistics-legend-milestone': "Jalons",
    'user-statistics-legend-post': "Messages",
    'user-statistics-legend-push': "Poussées de code",
    'user-statistics-legend-repo': "Modification de dépôt",
    'user-statistics-legend-survey': "Sondages",
    'user-statistics-legend-tag': "Nouvelles étiquettes",
    'user-statistics-legend-task-list': "Listes de tâches",
    'user-statistics-legend-wiki': "Éditions wiki",
    'user-statistics-today': "Aujourd'hui",
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, "1 branche", "2 branches");
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, "1 problème", "2 problèmes");
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, "1 changement d'adhésion", "2 changements d'adhésion");
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, "1 fusion", "2 fusions");
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, "1 demande de fusion", "2 demandes de fusion");
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, "1 jalon", "2 jalons");
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, "1 message", "2 messages");
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, "1 poussée", "2 poussées");
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, "1 modification de dépôt", "2 modifications de dépôt");
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, "1 sondage", "2 sondages");
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, "1 étiquette", "2 étiquettes");
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, "1 liste de tâches", "2 listes de tâches");
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, "1 édition wiki", "2 éditions wiki");
    },

    'video-capture-accept': "Accepter",
    'video-capture-cancel': "Annuler",
    'video-capture-pause': "Pauser",
    'video-capture-resume': "Reprendre",
    'video-capture-retake': "Réenregistrer",
    'video-capture-start': "Commencer",
    'video-capture-stop': "Arrêter",

    'warning-no-connection': "Pas de mise à jour instantanée",
};

export {
    phrases,
};
