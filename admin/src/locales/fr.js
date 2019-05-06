import 'moment/locale/fr';
import 'moment/locale/fr-ca';
import 'moment/locale/fr-ch';
import { cardinal } from 'common/locale/grammars/french.mjs';

const phrases = {
    'action-badge-add': "ajouter",
    'action-badge-approve': "approuver",
    'action-badge-archive': "archiver",
    'action-badge-disable': "désactiver",
    'action-badge-reactivate': "réactiver",
    'action-badge-remove': "supprimer",
    'action-badge-restore': "restaurer",

    'activity-chart-legend-branch': "Nouvelles branches",
    'activity-chart-legend-issue': "Problèmes",
    'activity-chart-legend-member': "Changement d'adhésion",
    'activity-chart-legend-merge': "Fusions de code",
    'activity-chart-legend-merge-request': "Demandes de fusion",
    'activity-chart-legend-milestone': "Jalons",
    'activity-chart-legend-post': "Messages",
    'activity-chart-legend-push': "Poussées de code",
    'activity-chart-legend-repo': "Modification de dépôt",
    'activity-chart-legend-survey': "Sondages",
    'activity-chart-legend-tag': "étiquettes",
    'activity-chart-legend-task-list': "Listes de tâches",
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
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, "1 sondage", "2 sondages");
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, "1 étiquette", "2 étiquettes");
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, "1 liste de tâches", "2 listes de tâches");
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
    'nav-role-new': "Nouveau rôle",
    'nav-roles': "Rôles",
    'nav-server-new': "Nouveau serveur",
    'nav-servers': "Serveurs",
    'nav-settings': "Paramètres",
    'nav-user-new': "Nouveau utilisateur",
    'nav-users': "Utilisateurs",

    'project-list-add': "Ajouter un nouveau projet",
    'project-list-cancel': "Annuler",
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

    'role-list-add': "Ajouter un nouveau rôle",
    'role-list-cancel': "Annuler",
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, "ce rôle", "ces 2 rôle");
        return `Êtes-vous sûr de vouloir désactiver ${roles}?`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, "ce rôle", "ces 2 rôle");
        return `Êtes-vous sûr de vouloir réactiver ${roles}?`
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
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, "ce serveur", "ces 2 serveurs");
        return `Êtes-vous sûr de vouloir désactiver ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, "ce serveur", "ces 2 serveurs");
        return `Êtes-vous sûr de vouloir réactiver ${servers}?`
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

    'table-heading-api-access': "Accès à l'API",
    'table-heading-date-range': "Période active",
    'table-heading-email': "Email",
    'table-heading-issue-tracker': "Suivi de problèmes",
    'table-heading-last-modified': "Modification",
    'table-heading-last-month': "Le mois dernier",
    'table-heading-name': "Nom",
    'table-heading-oauth': "Authentification OAuth",
    'table-heading-projects': "Projets",
    'table-heading-repositories': "Dépôts",
    'table-heading-roles': "Rôles",
    'table-heading-server': "Serveur",
    'table-heading-this-month': "Ce mois-ci",
    'table-heading-title': "Nom",
    'table-heading-to-date': "À ce jour",
    'table-heading-type': "Type",
    'table-heading-username': "Nom d'utilisateur",
    'table-heading-users': "Utilisateurs",

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

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, "1 fichier", "2 fichiers");
        return `Téléchargement de ${files}, ${size} restant`;
    },

    'user-list-add': "Ajouter un nouvel utilisateur",
    'user-list-approve-all': "Approuver toutes les demandes",
    'user-list-cancel': "Annuler",
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, "cet utilisateur", "ces 2 utilisateurs");
        return `Êtes-vous sûr de vouloir désactiver ${accounts}?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, "cet utilisateur", "ces 2 utilisateurs");
        return `Êtes-vous sûr de vouloir réactiver ${accounts}?`
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
    'validation-duplicate-user-name': "Un utilisateur avec ce nom existe déjà",
    'validation-illegal-project-name': "L'identifiant du projet ne peut pas être «global», «admin», «public», ou «srv»",
    'validation-localhost-is-wrong': "«localhost» n'est pas valide",
    'validation-password-for-admin-only': "Seuls les administrateurs peuvent se connecter en utilisant un mot de passe",
    'validation-required': "Requis",

    'welcome': "Bienvenue!",
};

export {
    phrases,
};
