import 'moment/locale/fr';
import 'moment/locale/fr-ca';
import 'moment/locale/fr-ch';
import { cardinal } from 'common/locale/grammars/french.mjs';

const phrases = {
    'action-badge-add': "ajouter",
    'action-badge-approve': "approuver",
    'action-badge-archive': "archiver",
    'action-badge-deselect': "désélectionner",
    'action-badge-disable': "désactiver",
    'action-badge-reactivate': "réactiver",
    'action-badge-remove': "supprimer",
    'action-badge-restore': "restaurer",
    'action-badge-select': "sélectionner",

    'activity-chart-legend-branch': "Nouvelles branches",
    'activity-chart-legend-issue': "Problèmes",
    'activity-chart-legend-member': "Changement d'adhésion",
    'activity-chart-legend-merge': "Fusions de code",
    'activity-chart-legend-merge-request': "Demandes de fusion",
    'activity-chart-legend-milestone': "Jalons",
    'activity-chart-legend-post': "Messages",
    'activity-chart-legend-push': "Poussées de code",
    'activity-chart-legend-repo': "Modification de dépôt",
    'activity-chart-legend-snapshot': "Révisions du site",
    'activity-chart-legend-survey': "Sondages",
    'activity-chart-legend-tag': "étiquettes",
    'activity-chart-legend-task-list': "Listes de tâches",
    'activity-chart-legend-website-traffic': "Rapports de circulation",
    'activity-chart-legend-wiki': "Éditions wiki",

    'activity-tooltip-$count': (count) => {
        return cardinal(count, "1 histoire", "2 histoires");
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, "1 branche", "2 branches");
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, "1 problème", "2 problèmes");
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, "1 changement d'adhésion", "2 changements d'adhésion");
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, "1 fusion", "2 fusions");
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, "1 demande de fusion", "2 demandes de fusion");
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, "1 jalon", "2 jalons");
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, "1 message", "2 messages");
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, "1 poussée", "2 poussées");
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, "1 modification de dépôt", "2 modifications de dépôt");
    },
    'activity-tooltip-$count-snapshot': (count) => {
        return cardinal(count, "1 révision du site", "2 révisions du site");
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, "1 sondage", "2 sondages");
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, "1 étiquette", "2 étiquettes");
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, "1 liste de tâches", "2 listes de tâches");
    },
    'activity-tooltip-$count-website-traffic': (count) => {
        return cardinal(count, "1 révision du site", "2 révisions du site");
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, "1 édition wiki", "2 éditions wiki");
    },

    'app-name': "Trambar",
    'app-title': "Trambar - Console d'administration",

    'confirmation-cancel': "Annuler",
    'confirmation-confirm': "Confirmer",
    'confirmation-data-loss': "Êtes-vous sûr de vouloir abandonner les modifications que vous avez apportées?",

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

    'image-album-cancel': "Annuler",
    'image-album-done': "Terminer",
    'image-album-manage': "Gérer l'album",
    'image-album-remove': "Supprimer la sélection",
    'image-album-select': "Utiliser la sélection",
    'image-album-upload': "Télécharger des fichiers",

    'image-cropping-cancel': "Annuler",
    'image-cropping-select': "OK",

    'image-preview-close': "Fermer",
    'image-preview-dropbox': "Dropbox",
    'image-preview-onedrive': "OneDrive",

    'image-selector-choose-from-album': "Choisir parmi l'album",
    'image-selector-crop-image': "Ajuster la taille/position",
    'image-selector-upload-file': "Télécharger une image",

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
    'member-list-add': "Ajouter un utilisateur",
    'member-list-approve-all': "Approuver toutes les demandes",
    'member-list-cancel': "Annuler",
    'member-list-column-date-range': "Période active",
    'member-list-column-email': "Email",
    'member-list-column-last-modified': "Modification",
    'member-list-column-last-month': "Le mois dernier",
    'member-list-column-name': "Nom",
    'member-list-column-roles': "Rôles",
    'member-list-column-this-month': "Ce mois-ci",
    'member-list-column-to-date': "À ce jour",
    'member-list-column-type': "Type",
    'member-list-edit': "Modifier la liste des membres",
    'member-list-reject-all': "Rejeter toutes les demandes",
    'member-list-save': "Enregistrer la liste des membres",
    'member-list-status-non-member': "Pas un membre",
    'member-list-status-pending': "Requête en attente",
    'member-list-title': "Membres",

    'nav-member-new': "Nouveau membre",
    'nav-members': "Membres",
    'nav-project-new': "Nouveau projet",
    'nav-projects': "Projets",
    'nav-repositories': "Dépôts",
    'nav-rest-source-new': "Nouvelle source",
    'nav-rest-sources': "Sources REST",
    'nav-role-new': "Nouveau rôle",
    'nav-roles': "Rôles",
    'nav-server-new': "Nouveau serveur",
    'nav-servers': "Serveurs",
    'nav-settings': "Paramètres",
    'nav-spreadsheet-new': "Nouveau fichier",
    'nav-spreadsheets': "Fichiers Excel",
    'nav-user-new': "Nouveau utilisateur",
    'nav-users': "Utilisateurs",
    'nav-website': "Site Web",
    'nav-wiki': "Wiki GitLab",

    'project-list-add': "Ajouter un nouveau projet",
    'project-list-cancel': "Annuler",
    'project-list-column-date-range': "Période active",
    'project-list-column-last-modified': "Modification",
    'project-list-column-last-month': "Le mois dernier",
    'project-list-column-repositories': "Dépôts",
    'project-list-column-this-month': "Ce mois-ci",
    'project-list-column-title': "Nom",
    'project-list-column-to-date': "À ce jour",
    'project-list-column-users': "Utilisateurs",
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, "le projet sélectionné", "ces 2 projets");
        return `Êtes-vous sûr de vouloir archiver ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, "le projet sélectionné", "ces 2 projets");
        return `Êtes-vous sûr de vouloir restaurer ${projects}?`;
    },
    'project-list-edit': "Modifier la liste des projets",
    'project-list-save': "Enregistrer la liste des projets",
    'project-list-status-archived': "Archivé",
    'project-list-status-deleted': "Supprimé",
    'project-list-title': "Projets",

    'project-summary-$title': (title) => {
        let text = "Projet";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': "Contrôle d'accès",
    'project-summary-access-control-member-only': "Le contenu du projet est réservé aux membres seulement",
    'project-summary-access-control-non-member-comment': "Les non-membres peuvent commenter des histoires",
    'project-summary-access-control-non-member-view': "Les non-membres peuvent voir le contenu",
    'project-summary-add': "Ajouter un nouveau projet",
    'project-summary-archive': "Archiver le projet",
    'project-summary-cancel': "Annuler",
    'project-summary-confirm-archive': "Êtes-vous sûr de vouloir archiver ce projet?",
    'project-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer ce projet?",
    'project-summary-confirm-restore': "Êtes-vous sûr de vouloir restaurer ce projet?",
    'project-summary-delete': "Supprimer le projet",
    'project-summary-description': "Description",
    'project-summary-edit': "Modifier le projet",
    'project-summary-emblem': "Emblème",
    'project-summary-name': "Identifiant",
    'project-summary-new-members': "Nouveaux membres",
    'project-summary-new-members-auto-accept-guest': "Les utilisateurs invités sont automatiquement acceptés",
    'project-summary-new-members-auto-accept-user': "Les utilisateurs réguliers sont acceptés automatiquement",
    'project-summary-new-members-join-guest': "Les invités peuvent demander à rejoindre le projet",
    'project-summary-new-members-join-user': "Les utilisateurs réguliers peuvent demander à rejoindre le projet",
    'project-summary-new-members-manual': "Les membres sont ajoutés manuellement",
    'project-summary-other-actions': "Autres actions",
    'project-summary-restore': "Restaurer le projet",
    'project-summary-return': "Retour à la liste des projets",
    'project-summary-save': "Enregistrer le projet",
    'project-summary-statistics': "Activités",
    'project-summary-title': "Nom",

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, "1 autre", "2 autres");
    },

    'repo-list-cancel': "Annuler",
    'repo-list-column-date-range': "Période active",
    'repo-list-column-issue-tracker': "Suivi de problèmes",
    'repo-list-column-last-modified': "Modification",
    'repo-list-column-last-month': "Le mois dernier",
    'repo-list-column-server': "Serveur",
    'repo-list-column-this-month': "Ce mois-ci",
    'repo-list-column-title': "Nom",
    'repo-list-column-to-date': "À ce jour",
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, "ce dépôt", "ces 2 dépôts");
        return `Êtes-vous sûr de vouloir supprimer ${repositories} du projet?`;
    },
    'repo-list-edit': "Modifier la liste des dépôts",
    'repo-list-issue-tracker-enabled-false': "",
    'repo-list-issue-tracker-enabled-true': "Activée",
    'repo-list-save': "Enregistrer la liste des dépôts",
    'repo-list-title': "Dépôts",

    'repo-summary-$title': (title) => {
        let text = `Dépôt`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': "Annuler",
    'repo-summary-confirm-remove': "Êtes-vous sûr de vouloir supprimer ce dépôt du projet?",
    'repo-summary-confirm-restore': "Êtes-vous sûr de vouloir à nouveau ajouter ce dépôt au projet?",
    'repo-summary-edit': "Modifier le dépôt",
    'repo-summary-gitlab-name': "Nom du projet GitLab",
    'repo-summary-issue-tracker': "Suivi de problèmes",
    'repo-summary-issue-tracker-disabled': "Désactivé",
    'repo-summary-issue-tracker-enabled': "Activée",
    'repo-summary-remove': "Supprimer le dépôt",
    'repo-summary-restore': "Restaurer le dépôt",
    'repo-summary-return': "Retour à la liste des dépôts",
    'repo-summary-save': "Enregistrer le dépôt",
    'repo-summary-statistics': "Activités",
    'repo-summary-title': "Nom",

    'repository-tooltip-$count': (count) => {
        return cardinal(count, "1 dépôt", "2 dépôts");
    },

    'rest-list-add': "Ajouter une nouvelle source",
    'rest-list-cancel': "Annuler",
    'rest-list-column-identifier': "Identifiant",
    'rest-list-column-last-modified': "Modification",
    'rest-list-column-type': "Type",
    'rest-list-column-url': "URL",
    'rest-list-confirm-disable-$count': (count) => {
        let sources = cardinal(count, "cette source", "ces 2 sources");
        return `Êtes-vous sûr de vouloir désactiver ${sources}?`;
    },
    'rest-list-confirm-reactivate-$count': (count) => {
        let sources = cardinal(count, "cette source", "ces 2 sources");
        return `Êtes-vous sûr de vouloir réactiver ${sources}?`;
    },
    'rest-list-edit': "Editer la liste des sources",
    'rest-list-save': "Enregistrer la liste des sources",
    'rest-list-status-deleted': "Supprimé",
    'rest-list-status-disabled': "Désactivé",
    'rest-list-title': "Sources REST",

    'rest-summary-$title': (title) => {
        let text = "Source REST";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'rest-summary-add': "Ajouter une nouvelle source",
    'rest-summary-cancel': "Annuler",
    'rest-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer cette source?",
    'rest-summary-confirm-disable': "Êtes-vous sûr de vouloir désactiver cette source?",
    'rest-summary-confirm-reactivate': "Êtes-vous sûr de vouloir réactiver cette source?",
    'rest-summary-delete': "Supprimer la source",
    'rest-summary-description': "Description",
    'rest-summary-disable': "Désactiver la source",
    'rest-summary-edit': "Editer la source",
    'rest-summary-max-age': "Âge maximum",
    'rest-summary-name': "Identifiant",
    'rest-summary-reactivate': "Réactiver la source",
    'rest-summary-return': "Retour à la liste des sources",
    'rest-summary-save': "Enregistrer la source",
    'rest-summary-type': "Type",
    'rest-summary-url': "URL",

    'rest-type-generic': "Générique",
    'rest-type-wordpress': "WordPress",

    'role-list-add': "Ajouter un nouveau rôle",
    'role-list-cancel': "Annuler",
    'role-list-column-last-modified': "Modification",
    'role-list-column-title': "Nom",
    'role-list-column-users': "Utilisateurs",
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, "ce rôle", "ces 2 rôle");
        return `Êtes-vous sûr de vouloir désactiver ${roles}?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, "ce rôle", "ces 2 rôle");
        return `Êtes-vous sûr de vouloir réactiver ${roles}?`;
    },
    'role-list-edit': "Modifier la liste des rôles",
    'role-list-save': "Enregistrer la liste des rôles",
    'role-list-status-deleted': "Supprimé",
    'role-list-status-disabled': "Désactivé",
    'role-list-title': "Rôles",

    'role-summary-$title': (title) => {
        let text = "Rôle";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': "Ajouter un nouveau rôle",
    'role-summary-cancel': "Annuler",
    'role-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer ce rôle?",
    'role-summary-confirm-disable': "Êtes-vous sûr de vouloir désactiver ce rôle?",
    'role-summary-confirm-reactivate': "Êtes-vous sûr de vouloir réactiver ce rôle?",
    'role-summary-delete': "Supprimer le rôle",
    'role-summary-description': "Description",
    'role-summary-disable': "Désactiver le rôle",
    'role-summary-edit': "Modifier le rôle",
    'role-summary-name': "Identifiant",
    'role-summary-rating': "Priorité de l'histoire",
    'role-summary-rating-high': "Haute",
    'role-summary-rating-low': "Faible",
    'role-summary-rating-normal': "Ordinaire",
    'role-summary-rating-very-high': "Très haute",
    'role-summary-rating-very-low': "Très faible",
    'role-summary-reactivate': "Réactiver le rôle",
    'role-summary-return': "Retour à la liste des rôles",
    'role-summary-save': "Enregistrer le rôle",
    'role-summary-title': "Nom",
    'role-summary-users': "Utilisateurs",

    'role-tooltip-$count-others': (count) => {
        return cardinal(count, "1 autre", "2 autres");
    },

    'server-list-add': "Ajouter un nouveau serveur",
    'server-list-api-access-false': "",
    'server-list-api-access-true': "Acquis",
    'server-list-cancel': "Annuler",
    'server-list-column-api-access': "Accès à l'API",
    'server-list-column-last-modified': "Modification",
    'server-list-column-oauth': "Authentification OAuth",
    'server-list-column-title': "Nom",
    'server-list-column-type': "Type",
    'server-list-column-users': "Utilisateurs",
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, "ce serveur", "ces 2 serveurs");
        return `Êtes-vous sûr de vouloir désactiver ${servers}?`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, "ce serveur", "ces 2 serveurs");
        return `Êtes-vous sûr de vouloir réactiver ${servers}?`;
    },
    'server-list-edit': "Modifier la liste des serveurs",
    'server-list-oauth-false': "",
    'server-list-oauth-true': "Actif",
    'server-list-save': "Enregistrer la liste des serveurs",
    'server-list-status-deleted': "Supprimé",
    'server-list-status-disabled': "Désactivé",
    'server-list-title': "Serveurs",

    'server-summary-acquire': "Acquérir l'accès à l'API",
    'server-summary-activities': "Activités",
    'server-summary-add': "Ajouter un nouveau serveur",
    'server-summary-api-access': "Accès à l'API",
    'server-summary-api-access-acquired': "Accès administratif acquis",
    'server-summary-api-access-not-applicable': "Non applicable",
    'server-summary-api-access-pending': "En attente d'une action de l'utilisateur",
    'server-summary-cancel': "Annuler",
    'server-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer ce serveur?",
    'server-summary-confirm-disable': "Êtes-vous sûr de vouloir désactiver ce serveur?",
    'server-summary-confirm-reactivate': "Êtes-vous sûr de vouloir réactiver ce serveur?",
    'server-summary-delete': "Supprimer le serveur",
    'server-summary-disable': "Désactiver le serveur",
    'server-summary-edit': "Modifier le serveur",
    'server-summary-gitlab-admin': "Administrateur de GitLab",
    'server-summary-gitlab-external-user': "Utilisateur externe de GitLab",
    'server-summary-gitlab-regular-user': "Utilisateur régulier de GitLab",
    'server-summary-member-$name': (name) => {
        return `Server: ${name}`;
    },
    'server-summary-name': "Identifiant",
    'server-summary-new-user': "Nouvel utilisateur",
    'server-summary-new-users': "Nouveaux utilisateurs",
    'server-summary-oauth-app-id': "ID de l'application",
    'server-summary-oauth-app-key': "Clé d'application",
    'server-summary-oauth-app-secret': "Secret d'application",
    'server-summary-oauth-application-id': "ID de l'application",
    'server-summary-oauth-application-secret': "Secret d'application",
    'server-summary-oauth-callback-url': "URL callback",
    'server-summary-oauth-client-id': "ID du client",
    'server-summary-oauth-client-secret': "Secret du client",
    'server-summary-oauth-deauthorize-callback-url': "URL callback de la deautorisation",
    'server-summary-oauth-gitlab-url': "URL du serveur GitLab",
    'server-summary-oauth-redirect-uri': "URI de redirection",
    'server-summary-oauth-redirect-url': "URL de redirection",
    'server-summary-oauth-site-url': "URL du site",
    'server-summary-privacy-policy-url': "URL de la politique de confidentialité",
    'server-summary-reactivate': "Réactiver le serveur",
    'server-summary-return': "Retour à la liste des serveurs",
    'server-summary-role-none': "Ne pas attribuer de rôle aux nouveaux utilisateurs",
    'server-summary-roles': "Attribution de rôle",
    'server-summary-save': "Enregistrer le serveur",
    'server-summary-system-address-missing': "L'adresse du système n'a pas été définie",
    'server-summary-terms-and-conditions-url': "URL des termes et conditions",
    'server-summary-test-oauth': "Tester l'intégration OAuth",
    'server-summary-title': "Nom",
    'server-summary-type': "Type de serveur",
    'server-summary-user-automatic-approval': "Approuver les nouveaux utilisateurs automatiquement",
    'server-summary-user-import-disabled': "Ne pas enregistrer de nouveaux utilisateurs",
    'server-summary-user-import-gitlab-admin-disabled': "Ne pas importer les administrateurs de GitLab",
    'server-summary-user-import-gitlab-external-user-disabled': "Ne pas importer les utilisateurs externes de GitLab",
    'server-summary-user-import-gitlab-user-disabled': "Ne pas importer les utilisateurs de GitLab",
    'server-summary-user-type-admin': "Administrateur",
    'server-summary-user-type-guest': "Invité",
    'server-summary-user-type-moderator': "Modérateur",
    'server-summary-user-type-regular': "Utilisateur régulier",
    'server-summary-whitelist': "Liste blanche d'adresses électroniques",

    'server-type-dropbox': "Dropbox",
    'server-type-facebook': "Facebook",
    'server-type-github': "GitHub",
    'server-type-gitlab': "GitLab",
    'server-type-google': "Google",
    'server-type-windows': "Windows Live",

    'settings-background-image': "Image de fond",
    'settings-cancel': "Annuler",
    'settings-company-name': "Nom de la compagnie",
    'settings-edit': "Modifier paramètres",
    'settings-input-languages': "Langues d'entrée",
    'settings-push-relay': "Relais de notifications push",
    'settings-save': "Enregistrer paramètres",
    'settings-site-address': "Adresse",
    'settings-site-description': "Description",
    'settings-site-title': "Nom du site",
    'settings-title': "Paramètres",

    'sign-in-$title': (title) => {
        let text = `Connexion`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': "Demande d'accès rejetée",
    'sign-in-error-account-disabled': "Le compte est actuellement désactivé",
    'sign-in-error-existing-users-only': "Seul le personnel autorisé peut accéder à ce système",
    'sign-in-error-restricted-area': "L'utilisateur n'est pas un administrateur",
    'sign-in-oauth': "Se connecter via OAuth",
    'sign-in-password': "Mot de passe:",
    'sign-in-problem-incorrect-username-password': "Nom d'utilisateur ou mot de passe incorrect",
    'sign-in-problem-no-support-for-username-password': "Le système n'accepte pas le mot de passe",
    'sign-in-problem-unexpected-error': "Erreur inattendue rencontrée",
    'sign-in-submit': "Se connecter",
    'sign-in-username': "Nom d'utilisateur:",

    'sign-off-menu-sign-off': "Se déconnecter",

    'spreadsheet-list-add': "Ajouter un nouveau lien",
    'spreadsheet-list-cancel': "Annuler",
    'spreadsheet-list-column-filename': "Nom de fichier",
    'spreadsheet-list-column-last-modified': "Modification",
    'spreadsheet-list-column-sheets': "Feuilles",
    'spreadsheet-list-column-url': "URL",
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, "ce lien", "ces 2 liens");
        return `Êtes-vous sûr de vouloir désactiver ${spreadsheets}?`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, "ce lien", "ces 2 liens");
        return `Êtes-vous sûr de vouloir réactiver ${spreadsheets}?`;
    },
    'spreadsheet-list-edit': "Editer la liste de liens",
    'spreadsheet-list-save': "Enregistrer la liste de liens",
    'spreadsheet-list-status-deleted': "Supprimé",
    'spreadsheet-list-status-disabled': "Désactivé",
    'spreadsheet-list-title': "Fichiers Excel",

    'spreadsheet-summary-$title': (title) => {
        let text = 'Fichier Excel';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': "Ajouter un nouveau lien",
    'spreadsheet-summary-cancel': "Annuler",
    'spreadsheet-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer ce lien?",
    'spreadsheet-summary-confirm-disable': "Êtes-vous sûr de vouloir désactiver ce lien?",
    'spreadsheet-summary-confirm-reactivate': "Êtes-vous sûr de vouloir réactiver ce lien?",
    'spreadsheet-summary-delete': "Supprimer le lien",
    'spreadsheet-summary-description': "Description",
    'spreadsheet-summary-disable': "Désactiver le lien",
    'spreadsheet-summary-edit': "Modifier le lien",
    'spreadsheet-summary-filename': "Nom de fichier",
    'spreadsheet-summary-hidden': "Recherche",
    'spreadsheet-summary-hidden-false': "Apparaît dans les résultats de recherche",
    'spreadsheet-summary-hidden-true': "Caché de la recherche",
    'spreadsheet-summary-name': "Identifiant",
    'spreadsheet-summary-reactivate': "Réactiver le lien",
    'spreadsheet-summary-return': "Retour à la liste des liens",
    'spreadsheet-summary-save': "Enregistrer le lien",
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Feuille ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': "Titre",
    'spreadsheet-summary-url': "URL",

    'task-$seconds': (seconds) => {
        return (seconds === 1) ? `1 seconde` : `${seconds} secondes`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, "1 commentaires sur un commit", "2 commentaires sur un commit");
        return `Importé ${comments} from “${repo}”`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, "1 événement", "2 événements");
        return `Importé ${events} from “${repo}”`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, "1 commentaire sur un problème", "2 commentaires sur un problème");
        return `Importé ${comments} from “${repo}”`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, "1 commentaire sur une demande de fusion", "2 commentaires sur une demande de fusion");
        return `Importé ${comments} from “${repo}”`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, "1 dépôt", "2 dépôts");
        return `Importé ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, "1 utilisateur", "2 utilisateurs");
        return `Importé ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, "1 commit", "2 commits");
        return `Importé une poussée avec ${commits} de la “${branch}” de “${repo}”`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Importation de commentaires sur un commit à partir de “${repo}”`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Importation d'événements à partir “${repo}”`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Importation de commentaires sur un problème à partir “${repo}”`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Importation de commentaire sur une demande de fusion à partir “${repo}”`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Importation de pousses à parti “${repo}”`;
    },
    'task-importing-repos': "Importation de dépôts",
    'task-importing-users': "Importation de utilisateurs",
    'task-installed-$count-hooks': (count) => {
        let hooks = cardinal(count, "1 hook", "2 hooks");
        return `Installée ${hooks}`;
    },
    'task-installing-hooks': "Installation de hooks",
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, "1 hook", "2 hooks");
        return `Désinstallé ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, "1 dépôt", "2 dépôts");
        return `Supprimé ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, "1 utilisateur", "2 utilisateurs");
        return `Supprimé ${users}`;
    },
    'task-removing-hooks': "Désinstallation de hooks",
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, "1 dépôt", "2 dépôts");
        return `Actualisé ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, "1 utilisateur", "2 utilisateurs");
        return `Actualisé ${users}`;
    },

    'text-field-placeholder-none': "Aucun",

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, " et ", tooltip ];
    },
    'tooltip-more': "Plus",

    'tz-name-abidjan': "Abidjan",
    'tz-name-accra': "Accra",
    'tz-name-acre': "Acre",
    'tz-name-act': "Territoire de la capitale australienne",
    'tz-name-adak': "Adak",
    'tz-name-addis-ababa': "Addis Ababa",
    'tz-name-adelaide': "Adélaïde",
    'tz-name-aden': "Aden",
    'tz-name-africa': "Afrique",
    'tz-name-alaska': "Alaska",
    'tz-name-aleutian': "Aléoutien",
    'tz-name-algiers': "Alger",
    'tz-name-almaty': "Almaty",
    'tz-name-america': "Amérique",
    'tz-name-amman': "Amman",
    'tz-name-amsterdam': "Amsterdam",
    'tz-name-anadyr': "Anadyr",
    'tz-name-anchorage': "Ancrage",
    'tz-name-andorra': "Andorre",
    'tz-name-anguilla': "Anguilla",
    'tz-name-antananarivo': "Antananarivo",
    'tz-name-antarctica': "Antarctique",
    'tz-name-antigua': "Antigua",
    'tz-name-apia': "Apia",
    'tz-name-aqtau': "Aqtau",
    'tz-name-aqtobe': "Aqtobe",
    'tz-name-araguaina': "Araguaina",
    'tz-name-arctic': "Arctique",
    'tz-name-argentina': "Argentine",
    'tz-name-arizona': "Arizona",
    'tz-name-aruba': "Aruba",
    'tz-name-ashgabat': "Ashgabat",
    'tz-name-ashkhabad': "Ashkhabad",
    'tz-name-asia': "Asie",
    'tz-name-asmara': "Asmara",
    'tz-name-asmera': "Asmera",
    'tz-name-astrakhan': "Astrakan",
    'tz-name-asuncion': "Asuncion",
    'tz-name-athens': "Athènes",
    'tz-name-atikokan': "Atikokan",
    'tz-name-atka': "Atka",
    'tz-name-atlantic': "Atlantique",
    'tz-name-atyrau': "Atyrau",
    'tz-name-auckland': "Auckland",
    'tz-name-australia': "Australie",
    'tz-name-azores': "Açores",
    'tz-name-baghdad': "Bagdad",
    'tz-name-bahia': "Bahia",
    'tz-name-bahia-banderas': "Bahia Banderas",
    'tz-name-bahrain': "Bahrein",
    'tz-name-baja-norte': "Baja Norte",
    'tz-name-baja-sur': "Baja Sur",
    'tz-name-baku': "Bakou",
    'tz-name-bamako': "Bamako",
    'tz-name-bangkok': "Bangkok",
    'tz-name-bangui': "Bangui",
    'tz-name-banjul': "Banjul",
    'tz-name-barbados': "Barbade",
    'tz-name-barnaul': "Barnaul",
    'tz-name-beirut': "Beyrouth",
    'tz-name-belem': "Belem",
    'tz-name-belfast': "Belfast",
    'tz-name-belgrade': "Belgrade",
    'tz-name-belize': "Belize",
    'tz-name-berlin': "Berlin",
    'tz-name-bermuda': "Bermudes",
    'tz-name-beulah': "Beulah",
    'tz-name-bishkek': "Bichkek",
    'tz-name-bissau': "Bissau",
    'tz-name-blanc-sablon': "Blanc-Sablon",
    'tz-name-blantyre': "Blantyre",
    'tz-name-boa-vista': "Boa Vista",
    'tz-name-bogota': "Bogota",
    'tz-name-boise': "Boise",
    'tz-name-bougainville': "Bougainville",
    'tz-name-bratislava': "Bratislava",
    'tz-name-brazil': "Brésil",
    'tz-name-brazzaville': "Brazzaville",
    'tz-name-brisbane': "Brisbane",
    'tz-name-broken-hill': "Colline cassée",
    'tz-name-brunei': "Brunei",
    'tz-name-brussels': "Bruxelles",
    'tz-name-bucharest': "Bucarest",
    'tz-name-budapest': "Budapest",
    'tz-name-buenos-aires': "Buenos Aires",
    'tz-name-bujumbura': "Bujumbura",
    'tz-name-busingen': "Busingen",
    'tz-name-cairo': "Caire",
    'tz-name-calcutta': "Calcutta",
    'tz-name-cambridge-bay': "Cambridge Bay",
    'tz-name-campo-grande': "Campo Grande",
    'tz-name-canada': "Canada",
    'tz-name-canary': "Îles Canaries",
    'tz-name-canberra': "Canberra",
    'tz-name-cancun': "Cancun",
    'tz-name-cape-verde': "Cap-Vert",
    'tz-name-caracas': "Caracas",
    'tz-name-casablanca': "Casablanca",
    'tz-name-casey': "Casey",
    'tz-name-catamarca': "Catamarca",
    'tz-name-cayenne': "Cayenne",
    'tz-name-cayman': "Cayman",
    'tz-name-center': "Centre",
    'tz-name-central': "Central",
    'tz-name-ceuta': "Ceuta",
    'tz-name-chagos': "Chagos",
    'tz-name-chatham': "Chatham",
    'tz-name-chicago': "Chicago",
    'tz-name-chihuahua': "Chihuahua",
    'tz-name-chile': "Chili",
    'tz-name-chisinau': "Chisinau",
    'tz-name-chita': "Chita",
    'tz-name-choibalsan': "Choibalsan",
    'tz-name-chongqing': "Chongqing",
    'tz-name-christmas': "L'île de noël",
    'tz-name-chungking': "Chongqing",
    'tz-name-chuuk': "Chuuk",
    'tz-name-cocos': "Îles Cocos",
    'tz-name-colombo': "Colombo",
    'tz-name-comod-rivadavia': "Comodoro Rivadavia",
    'tz-name-comoro': "Comoro",
    'tz-name-conakry': "Conakry",
    'tz-name-continental': "Continental",
    'tz-name-copenhagen': "Copenhague",
    'tz-name-coral-harbour': "Coral Harbour",
    'tz-name-cordoba': "Cordoba",
    'tz-name-costa-rica': "Costa Rica",
    'tz-name-creston': "Creston",
    'tz-name-cuiaba': "Cuiaba",
    'tz-name-curacao': "Curacao",
    'tz-name-currie': "Currie",
    'tz-name-dacca': "Dacca",
    'tz-name-dakar': "Dakar",
    'tz-name-damascus': "Damas",
    'tz-name-danmarkshavn': "Danmarkshavn",
    'tz-name-dar-es-salaam': "Dar es Salaam",
    'tz-name-darwin': "Darwin",
    'tz-name-davis': "Davis",
    'tz-name-dawson': "Dawson",
    'tz-name-dawson-creek': "Dawson Creek",
    'tz-name-de-noronha': "De Noronha",
    'tz-name-denver': "Denver",
    'tz-name-detroit': "Detroit",
    'tz-name-dhaka': "Dhaka",
    'tz-name-dili': "Dili",
    'tz-name-djibouti': "Djibouti",
    'tz-name-dominica': "Dominique",
    'tz-name-douala': "Douala",
    'tz-name-dubai': "Dubai",
    'tz-name-dublin': "Dublin",
    'tz-name-dumont-d-urville': "Dumont d’Urville",
    'tz-name-dushanbe': "Douchanbé",
    'tz-name-east': "Est",
    'tz-name-east-indiana': "Est de l'Indiana",
    'tz-name-easter': "Île de Pâques",
    'tz-name-easter-island': "Île de Pâques",
    'tz-name-eastern': "Est",
    'tz-name-edmonton': "Edmonton",
    'tz-name-efate': "Efate",
    'tz-name-eirunepe': "Eirunepe",
    'tz-name-el-aaiun': "El Aaiun",
    'tz-name-el-salvador': "Le Salvador",
    'tz-name-enderbury': "Enderbury",
    'tz-name-ensenada': "Ensenada",
    'tz-name-eucla': "Eucla",
    'tz-name-europe': "Europe",
    'tz-name-faeroe': "Îles Féroé",
    'tz-name-fakaofo': "Fakaofo",
    'tz-name-famagusta': "Famagouste",
    'tz-name-faroe': "Féroé",
    'tz-name-fiji': "Fidji",
    'tz-name-fort-nelson': "Fort Nelson",
    'tz-name-fort-wayne': "Fort Wayne",
    'tz-name-fortaleza': "Fortaleza",
    'tz-name-freetown': "Freetown",
    'tz-name-funafuti': "Funafuti",
    'tz-name-gaborone': "Gaborone",
    'tz-name-galapagos': "Galapagos",
    'tz-name-gambier': "Gambier",
    'tz-name-gaza': "Gaza",
    'tz-name-general': "Général",
    'tz-name-gibraltar': "Gibraltar",
    'tz-name-glace-bay': "Glace Bay",
    'tz-name-godthab': "Godthab",
    'tz-name-goose-bay': "Goose Bay",
    'tz-name-grand-turk': "Grand turc",
    'tz-name-grenada': "Grenade",
    'tz-name-guadalcanal': "Guadalcanal",
    'tz-name-guadeloupe': "Guadeloupe",
    'tz-name-guam': "Guam",
    'tz-name-guatemala': "Guatemala",
    'tz-name-guayaquil': "Guayaquil",
    'tz-name-guernsey': "Guernesey",
    'tz-name-guyana': "Guyane",
    'tz-name-halifax': "Halifax",
    'tz-name-harare': "Harare",
    'tz-name-harbin': "Harbin",
    'tz-name-havana': "Havane",
    'tz-name-hawaii': "Hawaii",
    'tz-name-hebron': "Hébron",
    'tz-name-helsinki': "Helsinki",
    'tz-name-hermosillo': "Hermosillo",
    'tz-name-ho-chi-minh': "Ho Chi Minh",
    'tz-name-hobart': "Hobart",
    'tz-name-hong-kong': "Hong Kong",
    'tz-name-honolulu': "Honolulu",
    'tz-name-hovd': "Hovd",
    'tz-name-indian': "Océan Indien",
    'tz-name-indiana': "Indiana",
    'tz-name-indiana-starke': "Indiana-Starke",
    'tz-name-indianapolis': "Indianapolis",
    'tz-name-inuvik': "Inuvik",
    'tz-name-iqaluit': "Iqaluit",
    'tz-name-irkutsk': "Irkoutsk",
    'tz-name-isle-of-man': "Île de man",
    'tz-name-istanbul': "Istanbul",
    'tz-name-jakarta': "Jakarta",
    'tz-name-jamaica': "Jamaïque",
    'tz-name-jan-mayen': "Jan Mayen",
    'tz-name-jayapura': "Jayapura",
    'tz-name-jersey': "Jersey",
    'tz-name-jerusalem': "Jérusalem",
    'tz-name-johannesburg': "Johannesburg",
    'tz-name-johnston': "Johnston",
    'tz-name-juba': "Juba",
    'tz-name-jujuy': "Jujuy",
    'tz-name-juneau': "Juneau",
    'tz-name-kabul': "Kaboul",
    'tz-name-kaliningrad': "Kaliningrad",
    'tz-name-kamchatka': "Kamchatka",
    'tz-name-kampala': "Kampala",
    'tz-name-karachi': "Karachi",
    'tz-name-kashgar': "Kashgar",
    'tz-name-kathmandu': "Katmandou",
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
    'tz-name-kuwait': "Koweit",
    'tz-name-kwajalein': "Kwajalein",
    'tz-name-la-paz': "La Paz",
    'tz-name-la-rioja': "La Rioja",
    'tz-name-lagos': "Lagos",
    'tz-name-lhi': "Lord Howe Island",
    'tz-name-libreville': "Libreville",
    'tz-name-lima': "Lima",
    'tz-name-lindeman': "Lindeman",
    'tz-name-lisbon': "Lisbonne",
    'tz-name-ljubljana': "Ljubljana",
    'tz-name-lome': "Lomé",
    'tz-name-london': "Londres",
    'tz-name-longyearbyen': "Longyearbyen",
    'tz-name-lord-howe': "Lord Howe",
    'tz-name-los-angeles': "Los Angeles",
    'tz-name-louisville': "Louisville",
    'tz-name-lower-princes': "Lower Prince’s Quarter",
    'tz-name-luanda': "Luanda",
    'tz-name-lubumbashi': "Lubumbashi",
    'tz-name-lusaka': "Lusaka",
    'tz-name-luxembourg': "Luxembourg",
    'tz-name-macao': "Macao",
    'tz-name-macau': "Macao",
    'tz-name-maceio': "Maceio",
    'tz-name-macquarie': "Macquarie",
    'tz-name-madeira': "Madère",
    'tz-name-madrid': "Madrid",
    'tz-name-magadan': "Magadan",
    'tz-name-mahe': "Mahe",
    'tz-name-majuro': "Majuro",
    'tz-name-makassar': "Makassar",
    'tz-name-malabo': "Malabo",
    'tz-name-maldives': "Maldives",
    'tz-name-malta': "Malte",
    'tz-name-managua': "Managua",
    'tz-name-manaus': "Manaus",
    'tz-name-manila': "Manille",
    'tz-name-maputo': "Maputo",
    'tz-name-marengo': "Marengo",
    'tz-name-mariehamn': "Mariehamn",
    'tz-name-marigot': "Marigot",
    'tz-name-marquesas': "Marquises",
    'tz-name-martinique': "Martinique",
    'tz-name-maseru': "Maseru",
    'tz-name-matamoros': "Matamoros",
    'tz-name-mauritius': "Maurice",
    'tz-name-mawson': "Mawson",
    'tz-name-mayotte': "Mayotte",
    'tz-name-mazatlan': "Mazatlan",
    'tz-name-mbabane': "Mbabane",
    'tz-name-mc-murdo': "McMurdo",
    'tz-name-melbourne': "Melbourne",
    'tz-name-mendoza': "Mendoza",
    'tz-name-menominee': "Menominee",
    'tz-name-merida': "Mérida",
    'tz-name-metlakatla': "Metlakatla",
    'tz-name-mexico': "Mexique",
    'tz-name-mexico-city': "Mexico",
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
    'tz-name-montreal': "Montréal",
    'tz-name-montserrat': "Montserrat",
    'tz-name-moscow': "Moscou",
    'tz-name-mountain': "Montagne",
    'tz-name-muscat': "Muscat",
    'tz-name-nairobi': "Nairobi",
    'tz-name-nassau': "Nassau",
    'tz-name-nauru': "Nauru",
    'tz-name-ndjamena': "Ndjamena",
    'tz-name-new-salem': "New Salem",
    'tz-name-new-york': "New York",
    'tz-name-newfoundland': "Terre-Neuve",
    'tz-name-niamey': "Niamey",
    'tz-name-nicosia': "Nicosie",
    'tz-name-nipigon': "Nipigon",
    'tz-name-niue': "Niue",
    'tz-name-nome': "Nome",
    'tz-name-norfolk': "Norfolk",
    'tz-name-noronha': "Noronha",
    'tz-name-north': "Nord",
    'tz-name-north-dakota': "Dakota du nord",
    'tz-name-nouakchott': "Nouakchott",
    'tz-name-noumea': "Nouméa",
    'tz-name-novokuznetsk': "Novokuznetsk",
    'tz-name-novosibirsk': "Novosibirsk",
    'tz-name-nsw': "Nouvelle Galles du Sud",
    'tz-name-ojinaga': "Ojinaga",
    'tz-name-omsk': "Omsk",
    'tz-name-oral': "Oral",
    'tz-name-oslo': "Oslo",
    'tz-name-ouagadougou': "Ouagadougou",
    'tz-name-pacific': "Pacifique",
    'tz-name-pacific-new': "Pacifique-Nouveau",
    'tz-name-pago-pago': "Pago Pago",
    'tz-name-palau': "Palau",
    'tz-name-palmer': "Palmer",
    'tz-name-panama': "Panama",
    'tz-name-pangnirtung': "Pangnirtung",
    'tz-name-paramaribo': "Paramaribo",
    'tz-name-paris': "Paris",
    'tz-name-perth': "Perth",
    'tz-name-petersburg': "Pétersbourg",
    'tz-name-phnom-penh': "Phnom Penh",
    'tz-name-phoenix': "Phoenix",
    'tz-name-pitcairn': "Pitcairn",
    'tz-name-podgorica': "Podgorica",
    'tz-name-pohnpei': "Pohnpei",
    'tz-name-ponape': "Ponape",
    'tz-name-pontianak': "Pontianak",
    'tz-name-port-au-prince': "Port-au-Prince",
    'tz-name-port-moresby': "Port Moresby",
    'tz-name-port-of-spain': "Port d'Espagne",
    'tz-name-porto-acre': "Porto Acre",
    'tz-name-porto-novo': "Porto-Novo",
    'tz-name-porto-velho': "Porto Velho",
    'tz-name-prague': "Prague",
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
    'tz-name-reunion': "Réunion",
    'tz-name-reykjavik': "Reykjavik",
    'tz-name-riga': "Riga",
    'tz-name-rio-branco': "Rio Branco",
    'tz-name-rio-gallegos': "Rio Gallegos",
    'tz-name-riyadh': "Riyad",
    'tz-name-rome': "Rome",
    'tz-name-rosario': "Rosario",
    'tz-name-rothera': "Rothera",
    'tz-name-saigon': "Saigon",
    'tz-name-saipan': "Saipan",
    'tz-name-sakhalin': "Sakhaline",
    'tz-name-salta': "Salta",
    'tz-name-samara': "Samara",
    'tz-name-samarkand': "Samarkand",
    'tz-name-samoa': "Samoa",
    'tz-name-san-juan': "San Juan",
    'tz-name-san-luis': "San Luis",
    'tz-name-san-marino': "Saint Marin",
    'tz-name-santa-isabel': "Santa Isabel",
    'tz-name-santarem': "Santarem",
    'tz-name-santiago': "Santiago",
    'tz-name-santo-domingo': "Santo Domingo",
    'tz-name-sao-paulo': "Sao Paulo",
    'tz-name-sao-tome': "Sao Tomé",
    'tz-name-sarajevo': "Sarajevo",
    'tz-name-saratov': "Saratov",
    'tz-name-saskatchewan': "Saskatchewan",
    'tz-name-scoresbysund': "Scoresbysund",
    'tz-name-seoul': "Séoul",
    'tz-name-shanghai': "Shanghai",
    'tz-name-shiprock': "Shiprock",
    'tz-name-simferopol': "Simferopol",
    'tz-name-singapore': "Singapour",
    'tz-name-sitka': "Sitka",
    'tz-name-skopje': "Skopje",
    'tz-name-sofia': "Sofia",
    'tz-name-south': "Sud",
    'tz-name-south-georgia': "Géorgie du Sud",
    'tz-name-south-pole': "Pôle Sud",
    'tz-name-srednekolymsk': "Srednekolymsk",
    'tz-name-st-barthelemy': "St Barthélemy",
    'tz-name-st-helena': "Sainte Hélène",
    'tz-name-st-johns': "St. John's",
    'tz-name-st-kitts': "St Kitts",
    'tz-name-st-lucia': "Sainte Lucie",
    'tz-name-st-thomas': "St Thomas",
    'tz-name-st-vincent': "St Vincent",
    'tz-name-stanley': "Stanley",
    'tz-name-stockholm': "Stockholm",
    'tz-name-swift-current': "Swift Current",
    'tz-name-sydney': "Sydney",
    'tz-name-syowa': "Syowa",
    'tz-name-tahiti': "Tahiti",
    'tz-name-taipei': "Taipei",
    'tz-name-tallinn': "Tallinn",
    'tz-name-tarawa': "Tarawa",
    'tz-name-tashkent': "Tachkent",
    'tz-name-tasmania': "Tasmanie",
    'tz-name-tbilisi': "Tbilissi",
    'tz-name-tegucigalpa': "Tegucigalpa",
    'tz-name-tehran': "Téhéran",
    'tz-name-tel-aviv': "Tel Aviv",
    'tz-name-tell-city': "Tell City",
    'tz-name-thimbu': "Thimbu",
    'tz-name-thimphu': "Thimphu",
    'tz-name-thule': "Thulé",
    'tz-name-thunder-bay': "Thunder Bay",
    'tz-name-tijuana': "Tijuana",
    'tz-name-timbuktu': "Tombouctou",
    'tz-name-tirane': "Tirane",
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
    'tz-name-tunis': "Tunis",
    'tz-name-ujung-pandang': "Ujung Pandang",
    'tz-name-ulaanbaatar': "Ulaanbaatar",
    'tz-name-ulan-bator': "Ulan Bator",
    'tz-name-ulyanovsk': "Ulyanovsk",
    'tz-name-urumqi': "Urumqi",
    'tz-name-us': "États Unis",
    'tz-name-ushuaia': "Ushuaia",
    'tz-name-ust-nera': "Ust-Nera",
    'tz-name-uzhgorod': "Uzhgorod",
    'tz-name-vaduz': "Vaduz",
    'tz-name-vancouver': "Vancouver",
    'tz-name-vatican': "Vatican",
    'tz-name-vevay': "Vevay",
    'tz-name-victoria': "Victoria",
    'tz-name-vienna': "Vienne",
    'tz-name-vientiane': "Vientiane",
    'tz-name-vilnius': "Vilnius",
    'tz-name-vincennes': "Vincennes",
    'tz-name-virgin': "Îles Vierges",
    'tz-name-vladivostok': "Vladivostok",
    'tz-name-volgograd': "Volgograd",
    'tz-name-vostok': "Vostok",
    'tz-name-wake': "Wake Island",
    'tz-name-wallis': "Wallis",
    'tz-name-warsaw': "Varsovie",
    'tz-name-west': "Ouest",
    'tz-name-whitehorse': "Cheval Blanc",
    'tz-name-winamac': "Winamac",
    'tz-name-windhoek': "Windhoek",
    'tz-name-winnipeg': "Winnipeg",
    'tz-name-yakutat': "Yakutat",
    'tz-name-yakutsk': "Yakutsk",
    'tz-name-yancowinna': "Yancowinna",
    'tz-name-yangon': "Yangon",
    'tz-name-yap': "Yap",
    'tz-name-yekaterinburg': "Iekaterinbourg",
    'tz-name-yellowknife': "Yellowknife",
    'tz-name-yerevan': "Erevan",
    'tz-name-yukon': "Yukon",
    'tz-name-zagreb': "Zagreb",
    'tz-name-zaporozhye': "Zaporozhye",
    'tz-name-zurich': "Zurich",

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, "1 fichier", "2 fichiers");
        return `Téléchargement de ${files}, ${size} restant`;
    },

    'user-list-add': "Ajouter un nouvel utilisateur",
    'user-list-approve-all': "Approuver toutes les demandes",
    'user-list-cancel': "Annuler",
    'user-list-column-email': "Email",
    'user-list-column-last-modified': "Modification",
    'user-list-column-name': "Nom",
    'user-list-column-projects': "Projets",
    'user-list-column-roles': "Rôles",
    'user-list-column-type': "Type",
    'user-list-column-username': "Nom d'utilisateur",
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, "cet utilisateur", "ces 2 utilisateurs");
        return `Êtes-vous sûr de vouloir désactiver ${accounts}?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, "cet utilisateur", "ces 2 utilisateurs");
        return `Êtes-vous sûr de vouloir réactiver ${accounts}?`;
    },
    'user-list-edit': "Modifier la liste des utilisateurs",
    'user-list-reject-all': "Rejeter toutes les demandes",
    'user-list-save': "Enregistrer la liste des utilisateurs",
    'user-list-status-deleted': "Supprimé",
    'user-list-status-disabled': "Compte désactivé",
    'user-list-status-pending': "En attente d'approbation",
    'user-list-title': "Utilisateurs",
    'user-list-type-admin': "Administrateur",
    'user-list-type-guest': "Invité",
    'user-list-type-moderator': "Modérateur",
    'user-list-type-regular': "Utilisateur régulier",
    'user-summary-$name': (name) => {
        let text = "Utilisateur";
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': "Ajouter un nouvel utilisateur",
    'user-summary-cancel': "Annuler",
    'user-summary-confirm-delete': "Êtes-vous sûr de vouloir supprimer cet utilisateur?",
    'user-summary-confirm-disable': "Êtes-vous sûr de vouloir désactiver cet utilisateur?",
    'user-summary-confirm-reactivate': "Êtes-vous sûr de vouloir réactiver cet utilisateur?",
    'user-summary-delete': "Supprimer l'utilisateur",
    'user-summary-disable': "Désactiver l'utilisateur",
    'user-summary-edit': "Modifier l'utilisateur",
    'user-summary-email': "Adresse email",
    'user-summary-github': "URL du profil GitHub",
    'user-summary-gitlab': "URL du profil GitLab",
    'user-summary-ichat': "Nom d'utilisateur iChat",
    'user-summary-linkedin': "URL du profil Linkedin",
    'user-summary-member-$name': (name) => {
        let text = "Membre";
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': "Modifier le membre",
    'user-summary-member-return': "Retour à la liste des membres",
    'user-summary-member-save': "Enregistrer le membre",
    'user-summary-name': "Nom",
    'user-summary-phone': "Numéro de téléphone",
    'user-summary-profile-image': "Image de profil",
    'user-summary-reactivate': "Réactiver l'utilisateur",
    'user-summary-remove-membership': "Supprimer l'utilisateur du projet",
    'user-summary-restore-membership': "Ajouter l'utilisateur au projet",
    'user-summary-return': "Retour à la liste des utilisateurs",
    'user-summary-role-none': "Aucun",
    'user-summary-roles': "Rôles",
    'user-summary-save': "Enregistrer l'utilisateur",
    'user-summary-skype': "Nom d'utilisateur Skype",
    'user-summary-slack': "Identifiant d'utilisateur Slack",
    'user-summary-slack-team': "Identifiant de l'équipe Slack",
    'user-summary-social-links': "Liens sociaux",
    'user-summary-stackoverflow': "URL du profil Stack Overflow",
    'user-summary-statistics': "Activités",
    'user-summary-twitter': "Nom d'utilisateur Twitter",
    'user-summary-type': "Type d'utilisateur",
    'user-summary-type-admin': "Administrateur",
    'user-summary-type-guest': "Invité",
    'user-summary-type-moderator': "Modérateur",
    'user-summary-type-regular': "Utilisateur régulier",
    'user-summary-username': "Nom d'utilisateur",

    'user-tooltip-$count': (count) => {
        return cardinal(count, "1 utilisateur", "2 utilisateurs");
    },

    'validation-duplicate-project-name': "Un projet avec cet identifiant existe déjà",
    'validation-duplicate-role-name': "Un rôle avec cet identifiant existe déjà",
    'validation-duplicate-server-name': "Un serveur avec cet identifiant existe déjà",
    'validation-duplicate-source-name': "Une source avec cet identifiant existe déjà",
    'validation-duplicate-spreadsheet-name': "Un lien avec cet identifiant existe déjà",
    'validation-duplicate-user-name': "Un utilisateur avec ce nom existe déjà",
    'validation-illegal-project-name': "L'identifiant du projet ne peut pas être «global», «admin», «public», ou «srv»",
    'validation-invalid-timezone': "Fuseau horaire invalide",
    'validation-localhost-is-wrong': "«localhost» n'est pas valide",
    'validation-password-for-admin-only': "Seuls les administrateurs peuvent se connecter en utilisant un mot de passe",
    'validation-required': "Requis",
    'validation-used-by-trambar': "Utilisé par Trambar",

    'website-summary-cancel': "Annuler",
    'website-summary-domain-names': "Noms de domaine",
    'website-summary-edit': "Modifier le site web",
    'website-summary-save': "Enregistrer le site web",
    'website-summary-template': "Modèle",
    'website-summary-template-disabled': "Désactivé",
    'website-summary-template-generic': "Modèle générique",
    'website-summary-timezone': "Fuseau horaire",
    'website-summary-title': "Site web",
    'website-summary-traffic-report-time': "Heure de publication du rapport de circulation",
    'website-summary-versions': "Versions",

    'welcome': "Bienvenue!",

    'wiki-list-cancel': "Annuler",
    'wiki-list-column-last-modified': "Modification",
    'wiki-list-column-public': "Publique",
    'wiki-list-column-repo': "Dépôt",
    'wiki-list-column-title': "Titre",
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, "cette page", "ces 2 pages");
        return `Êtes-vous sûr de vouloir désélectionner ${pages}?`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, "cette page", "ces 2 pages");
        return `Êtes-vous sûr de vouloir rendre ${pages} publique?`;
    },
    'wiki-list-edit': "Editer la liste de pages",
    'wiki-list-public-always': "toujours",
    'wiki-list-public-no': "non",
    'wiki-list-public-referenced': "référencée",
    'wiki-list-save': "Enregistrer la liste de pages",
    'wiki-list-title': "Wiki GitLab",

    'wiki-summary-$title': (title) => {
        let text = "Wiki GitLab";
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': "Annuler",
    'wiki-summary-confirm-deselect': "Êtes-vous sûr de vouloir désélectionner cette page?",
    'wiki-summary-confirm-select': "Êtes-vous sûr de vouloir rendre cette page publique?",
    'wiki-summary-deselect': "Désélectionner la page",
    'wiki-summary-edit': "Modifier la page",
    'wiki-summary-hidden': "Recherche",
    'wiki-summary-hidden-false': "Apparaît dans les résultats de recherche",
    'wiki-summary-hidden-true': "Caché de la recherche",
    'wiki-summary-page-contents': "Contenu",
    'wiki-summary-public': "Publique",
    'wiki-summary-public-always': "Toujours",
    'wiki-summary-public-no': "Non",
    'wiki-summary-public-referenced': "Oui (référencée par une autre page publique)",
    'wiki-summary-repo': "Identifiant du dépôt",
    'wiki-summary-return': "Retour à la liste des pages",
    'wiki-summary-save': "Enregistrer la page",
    'wiki-summary-select': "Sélectionner la page",
    'wiki-summary-slug': "Slug",
    'wiki-summary-title': "Titre",
};

export {
    phrases,
};
