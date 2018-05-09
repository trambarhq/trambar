require('moment/locale/nb');

module.exports = function(localeCode) {
    return {
        'action-badge-add': 'legge til',
        'action-badge-approve': 'godkjenne',
        'action-badge-archive': 'arkiverer',
        'action-badge-disable': 'deaktivere',
        'action-badge-reactivate': 'reaktivere',
        'action-badge-remove': 'fjerne',
        'action-badge-restore': 'gjenopprette',

        'activity-chart-legend-branch': 'Nye brancher',
        'activity-chart-legend-issue': 'Problemer',
        'activity-chart-legend-member': 'Medlemskapsendringer',
        'activity-chart-legend-merge': 'Merger',
        'activity-chart-legend-merge-request': 'Merge-requester',
        'activity-chart-legend-milestone': 'Milepæler',
        'activity-chart-legend-post': 'Innlegg',
        'activity-chart-legend-push': 'Pusher',
        'activity-chart-legend-repo': 'Repo endringer',
        'activity-chart-legend-survey': 'Undersøkelser',
        'activity-chart-legend-task-list': 'Oppgavelister',
        'activity-chart-legend-wiki': 'Wiki redigeringer',

        'activity-tooltip-$count': (count) => {
            return (count === 1) ? `1 historie` : `${count} historier`;
        },
        'activity-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} brancher`;
        },
        'activity-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 problem` : `${count} problemer`;
        },
        'activity-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 medlemskapsendring` : `${count} medlemskapsendringer`;
        },
        'activity-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merger`;
        },
        'activity-tooltip-$count-merge-request': (count) => {
            return (count === 1) ? `1 merge-request` : `${count} merge-requester`;
        },
        'activity-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 Milepæl` : `${count} milepæler`;
        },
        'activity-tooltip-$count-post': (count) => {
            return (count === 1) ? `1 innlegg` : `${count} innlegg`;
        },
        'activity-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pusher`;
        },
        'activity-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 repo endring` : `${count} repo endringer`;
        },
        'activity-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 undersøkelse` : `${count} undersøkelser`;
        },
        'activity-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 oppgaveliste` : `${count} oppgavelister`;
        },
        'activity-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki redigering` : `${count} wiki redigeringer`;
        },

        'app-name': 'Trambar',
        'app-title': 'Trambar - Administrativ konsoll',

        'confirmation-cancel': 'Avbryt',
        'confirmation-confirm': 'Bekreft',
        'confirmation-data-loss': 'Er du sikker på at du vil overgi endringer du har gjort?',

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

        'image-album-cancel': 'Avbryt',
        'image-album-done': 'Gjort',
        'image-album-manage': 'Endr album',
        'image-album-remove': 'Fjern valgte',
        'image-album-select': 'Bruk valgt',
        'image-album-upload': 'Last opp filer',

        'image-cropping-cancel': 'Avbryt',
        'image-cropping-select': 'OK',

        'image-selector-choose-from-album': 'Velg fra album',
        'image-selector-crop-image': 'Juste størrelse/posisjon',
        'image-selector-upload-file': 'Last opp bilde',

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
        'member-list-add': 'Legg til ny bruker',
        'member-list-approve-all': 'Godkjenn alle forespørsler',
        'member-list-cancel': 'Avbryt',
        'member-list-edit': 'Rediger medlemsliste',
        'member-list-reject-all': 'Avvis alle forespørsler',
        'member-list-save': 'Lagre medlemsliste',
        'member-list-status-non-member': 'Ikke et medlem',
        'member-list-status-pending': 'Forespørsel venter',
        'member-list-title': 'Medlemmer',

        'nav-member-new': 'Nytt medlemm',
        'nav-members': 'Medlemmer',
        'nav-project-new': 'Nytt prosjekt',
        'nav-projects': 'Prosjekter',
        'nav-repositories': 'Repoer',
        'nav-role-new': 'Ny rolle',
        'nav-roles': 'Roller',
        'nav-server-new': 'Ny server',
        'nav-servers': 'Servere',
        'nav-settings': 'Innstillinger',
        'nav-user-new': 'Ny bruker',
        'nav-users': 'Brukere',

        'project-list-add': 'Legg til nytt prosjekt',
        'project-list-cancel': 'Avbryt',
        'project-list-confirm-archive-$count': (count) => {
            var projects = (count === 1) ? 'det valgte prosjektet' : `de valgte prosjektene`;
            return `Er du sikker på at du vil arkivere ${projects}?`
        },
        'project-list-confirm-restore-$count': (count) => {
            var projects = (count === 1) ? 'det valgte prosjektet' : `de valgte prosjektene`;
            return `Er du sikker på at du vil gjenopprette ${projects}?`
        },
        'project-list-deleted': 'Slettet',
        'project-list-edit': 'Rediger prosjektliste',
        'project-list-save': 'Lagre prosjektliste',
        'project-list-status-archived': 'Arkivert',
        'project-list-status-deleted': 'Slettet',
        'project-list-title': 'Prosjekter',

        'project-summary-$title': (title) => {
            var text = 'Prosjekt';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'project-summary-access-control': 'Adgangskontroll',
        'project-summary-access-control-member-only': 'Prosjektinnhold er kun begrenset til medlemmer',
        'project-summary-access-control-non-member-comment': 'Ikke-medlemmer kan kommentere historier',
        'project-summary-access-control-non-member-view': 'Ikke-medlemmer kan se innholdet',
        'project-summary-add': 'Legg til nytt prosjekt',
        'project-summary-archive': 'Arkiver prosjektet',
        'project-summary-cancel': 'Avbryt',
        'project-summary-confirm-archive': 'Er du sikker på at du vil arkivere dette prosjektet?',
        'project-summary-confirm-delete': 'Er du sikker på at du vil slette dette prosjektet?',
        'project-summary-confirm-restore': 'Er du sikker på at du vil gjenopprette dette prosjektet?',
        'project-summary-delete': 'Slett prosjektet',
        'project-summary-description': 'Beskrivelse',
        'project-summary-edit': 'Rediger prosjektet',
        'project-summary-emblem': 'Emblem',
        'project-summary-name': 'Identifier',
        'project-summary-new-members': 'Nye medlemmer',
        'project-summary-new-members-auto-accept-guest': 'Gjester aksepteres automatisk',
        'project-summary-new-members-auto-accept-user': 'Vanlige brukere aksepteres automatisk',
        'project-summary-new-members-join-guest': 'Gjestene kan be om å bli med på prosjektet',
        'project-summary-new-members-join-user': 'Vanlige brukere kan be om å bli med på prosjektet',
        'project-summary-new-members-manual': 'Medlemmene legges til manuelt',
        'project-summary-other-actions': 'Andre handlinger',
        'project-summary-restore': 'Gjenopprett prosjektet',
        'project-summary-return': 'Gå tilbake til prosjektlisten',
        'project-summary-save': 'Lagre prosjektet',
        'project-summary-statistics': 'Aktiviteter',
        'project-summary-title': 'Navn',

        'project-tooltip-$count-others': (count) => {
            return `${count} andre`;
        },

        'repo-list-cancel': 'Avbryt',
        'repo-list-confirm-remove-$count': (count) => {
            var repositories = (count === 1) ? `denne repoen` : `disse repoene`;
            return `Er du sikker på at du vil fjerne ${repositories} fra prosjektet?`;
        },
        'repo-list-edit': 'Rediger repo listen',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Aktivert',
        'repo-list-save': 'Lagre repo listen',
        'repo-list-title': 'Repoer',

        'repo-summary-$title': (title) => {
            var text = `Repo`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'repo-summary-cancel': 'Avbryt',
        'repo-summary-confirm-remove': 'Er du sikker på at du vil fjerne denne repoen fra prosjektet?',
        'repo-summary-confirm-restore': 'Er du sikker på at du vil legge til denne repoen til prosjektet igjen?',
        'repo-summary-edit': 'Rediger repoen',
        'repo-summary-gitlab-name': 'GitLab prosjektnavn',
        'repo-summary-issue-tracker': 'Feilrapporteringssystem',
        'repo-summary-issue-tracker-disabled': 'Deaktivert',
        'repo-summary-issue-tracker-enabled': 'Aktivert',
        'repo-summary-remove': 'Fjern repoen',
        'repo-summary-restore': 'Gjenopprett repoen',
        'repo-summary-return': 'Gå tilbake til repo listen',
        'repo-summary-save': 'Lagre repo',
        'repo-summary-statistics': 'Aktiviteter',
        'repo-summary-title': 'Navn',

        'repository-tooltip-$count': (count) => {
            return (count === 1) ? `1 repo` : `${count} repoer`;
        },

        'role-list-add': 'Legg til ny rolle',
        'role-list-cancel': 'Avbryt',
        'role-list-confirm-disable-$count': (count) => {
            var roles = (count === 1) ? `denne rollen` : `disse ${count} rollene`;
            return `Er du sikker på at du vil slette ${roles}?`
        },
        'role-list-confirm-reactivate-$count': (count) => {
            var roles = (count === 1) ? `denne rollen` : `disse ${count} rollene`;
            return `Er du sikker på at du vil reaktivere ${roles}?`
        },
        'role-list-edit': 'Rediger rollelisten',
        'role-list-save': 'Lagre rollelisten',
        'role-list-status-deleted': 'Slettet',
        'role-list-status-disabled': 'Deaktivert',
        'role-list-title': 'Roller',

        'role-summary-$title': (title) => {
            var text = 'Rolle';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'role-summary-add': 'Legg til ny rolle',
        'role-summary-cancel': 'Avbryt',
        'role-summary-confirm-delete': 'Er du sikker på at du vil slette denne rollen?',
        'role-summary-confirm-disable': 'Er du sikker på at du vil deaktivere denne rollen?',
        'role-summary-confirm-reactivate': 'Er du sikker på at du vil reaktivere denne rollen?',
        'role-summary-delete': 'Slett rollen',
        'role-summary-description': 'Beskrivelse',
        'role-summary-disable': 'Deaktiver rolle',
        'role-summary-edit': 'Rediger rolle',
        'role-summary-name': 'Identifier',
        'role-summary-rating': 'Historie prioritet',
        'role-summary-rating-high': 'Høy',
        'role-summary-rating-low': 'Lav',
        'role-summary-rating-normal': 'Normal',
        'role-summary-rating-very-high': 'Veldig høy',
        'role-summary-rating-very-low': 'Veldig lav',
        'role-summary-reactivate': 'Reaktiver rolle',
        'role-summary-return': 'Gå tilbake til rollelisten',
        'role-summary-save': 'Lagre rolle',
        'role-summary-title': 'Navn',
        'role-summary-users': 'Brukere',

        'role-tooltip-$count-others': (count) => {
            return `${count} andre`;
        },

        'server-list-add': 'Legg til ny server',
        'server-list-api-access-false': '',
        'server-list-api-access-true': 'Fikk',
        'server-list-cancel': 'Avbryt',
        'server-list-confirm-disable-$count': (count) => {
            var servers = (count === 1) ? `denne serveren` : `disse ${count} serverene`;
            return `Er du sikker på at du vil slette ${servers}?`
        },
        'server-list-confirm-reactivate-$count': (count) => {
            var servers = (count === 1) ? `denne serveren` : `disse ${count} serverene`;
            return `Er du sikker på at du vil reaktivere ${servers}?`
        },
        'server-list-edit': 'Rediger serverlisten',
        'server-list-oauth-false': '',
        'server-list-oauth-true': 'Aktivert',
        'server-list-save': 'Lagre serverlisten',
        'server-list-status-deleted': 'Slettet',
        'server-list-status-disabled': 'Deaktivert',
        'server-list-title': 'Servere',

        'server-summary-acquire': 'Få tilgang til API',
        'server-summary-activities': 'Aktiviteter',
        'server-summary-add': 'Legg til ny server',
        'server-summary-api-access': 'API-tilgang',
        'server-summary-api-access-acquired': 'Administrativ tilgang ervervet',
        'server-summary-api-access-not-applicable': 'Ikke aktuelt',
        'server-summary-api-access-pending': 'Venter på brukerhandling',
        'server-summary-cancel': 'Avbryt',
        'server-summary-confirm-delete': 'Er du sikker på at du vil slette denne serveren?',
        'server-summary-confirm-disable': 'Er du sikker på at du vil deaktivere denne serveren?',
        'server-summary-confirm-reactivate': 'Er du sikker på at du vil reaktivere denne serveren?',
        'server-summary-delete': 'Slett serveren',
        'server-summary-disable': 'Deaktiver serveren',
        'server-summary-edit': 'Rediger serveren',
        'server-summary-gitlab-admin': 'GitLab administrator',
        'server-summary-gitlab-external-user': 'GitLab ekstern bruker',
        'server-summary-gitlab-regular-user': 'GitLab vanlig bruker',
        'server-summary-member-$name': (name) => {
            return `Server: ${name}`;
        },
        'server-summary-name': 'Identifier',
        'server-summary-new-user': 'Ny bruker',
        'server-summary-new-users': 'Nye brukere',
        'server-summary-oauth-app-id': 'App-ID',
        'server-summary-oauth-app-key': 'App-nøkkel',
        'server-summary-oauth-app-secret': 'App-hemmelighet',
        'server-summary-oauth-application-id': 'Applikasjon-ID',
        'server-summary-oauth-application-secret': 'Applikasjon-hemmelighet',
        'server-summary-oauth-callback-url': 'Callback URL',
        'server-summary-oauth-client-id': 'Klient-ID',
        'server-summary-oauth-client-secret': 'Klienthemmelighet',
        'server-summary-oauth-gitlab-url': 'GitLab URL',
        'server-summary-oauth-redirect-uri': 'Redirect URI',
        'server-summary-oauth-redirect-url': 'Redirect URL',
        'server-summary-oauth-site-url': 'Nettstedets URL',
        'server-summary-privacy-policy-url': 'Privacy policy URL',
        'server-summary-reactivate': 'Reaktiver serveren',
        'server-summary-return': 'Gå tilbake til serverlisten',
        'server-summary-role-none': 'Ikke tilordne noen roller til nye brukere',
        'server-summary-roles': 'Rolleoppgave',
        'server-summary-save': 'Lagre serveren',
        'server-summary-system-address-missing': 'Systemadressen er ikke angitt',
        'server-summary-terms-and-conditions-url': 'Vilkår og betingelser URL',
        'server-summary-test-oauth': 'Test OAuth-integrasjon',
        'server-summary-title': 'Navn',
        'server-summary-type': 'Server type',
        'server-summary-user-automatic-approval': 'Godkjenn nye brukere automatisk',
        'server-summary-user-import-disabled': 'Ikke registrer nye brukere',
        'server-summary-user-import-gitlab-admin-disabled': 'Ikke importer GitLab-administratorer',
        'server-summary-user-import-gitlab-external-user-disabled': 'Ikke importer GitLab eksterne brukere',
        'server-summary-user-import-gitlab-user-disabled': 'Ikke importer GitLab-brukere',
        'server-summary-user-type-admin': 'Administrator',
        'server-summary-user-type-guest': 'Gjest',
        'server-summary-user-type-moderator': 'Moderator',
        'server-summary-user-type-regular': 'Vanlig bruker',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-background-image': 'Bakgrunnsbilde',
        'settings-cancel': 'Avbryt',
        'settings-company-name': 'Selskapsnavn',
        'settings-edit': 'Rediger innstillinger',
        'settings-input-languages': 'Inndataspråk',
        'settings-push-relay': 'Push notification relé',
        'settings-save': 'Lagre innstillinger',
        'settings-site-address': 'Adresse',
        'settings-site-description': 'Beskrivelse',
        'settings-site-title': 'Side navn',
        'settings-title': 'Innstillinger',

        'sign-in-$title': (title) => {
            var text = `Logg inn`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'sign-in-error-access-denied': 'Forespørsel om tilgang avvist',
        'sign-in-error-account-disabled': 'Kontoen er for øyeblikket deaktivert',
        'sign-in-error-existing-users-only': 'Kun autorisert personell kan få tilgang til dette systemet',
        'sign-in-error-restricted-area': 'Brukeren er ikke administrator',
        'sign-in-oauth': 'Logg inn via OAuth',
        'sign-in-password': 'Passord:',
        'sign-in-problem-incorrect-username-password': 'Feil brukernavn eller passord',
        'sign-in-problem-no-support-for-username-password': 'Systemet godtar ikke passord',
        'sign-in-problem-unexpected-error': 'Uventet feil oppstått',
        'sign-in-submit': 'Logg inn',
        'sign-in-username': 'Brukernavn:',

        'sign-off-menu-sign-off': 'Logg ut',

        'table-heading-api-access': 'API-tilgang﻿',
        'table-heading-date-range': 'Aktiv periode',
        'table-heading-email': 'E-post',
        'table-heading-issue-tracker': 'Feilrapporteringssystem',
        'table-heading-last-modified': 'Sist endret',
        'table-heading-last-month': 'Forrige måned',
        'table-heading-name': 'Navn',
        'table-heading-oauth': 'OAuth-autentisering',
        'table-heading-projects': 'Prosjekter',
        'table-heading-repositories': 'Repositories',
        'table-heading-roles': 'Roller',
        'table-heading-server': 'Server',
        'table-heading-this-month': 'Denne måneden',
        'table-heading-title': 'Navn',
        'table-heading-to-date': 'Til dags dato',
        'table-heading-type': 'Type',
        'table-heading-username': 'Brukernavn',
        'table-heading-users': 'Brukere',

        'task-$seconds': (seconds) => {
            return (seconds === 1) ? `1 sekund` : `${seconds} sekunder`;
        },
        'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 commit kommentar` : `${count} commit kommentarer`;
            return `Importert ${comments} fra “${repo}”`;
        },
        'task-imported-$count-events-from-$repo': (count, repo) => {
            var events = (count === 1) ? `1 hendelse` : `${count} hendelser`;
            return `Importert ${events} fra “${repo}”`;
        },
        'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 issue kommentar` : `${count} issue kommentarer`;
            return `Importert ${comments} fra “${repo}”`;
        },
        'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 merge-request kommentar` : `${count} merge-request kommentarer`;
            return `Importert ${comments} fra “${repo}”`;
        },
        'task-imported-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repo` : `${count} repoer`;
            return `Importert ${repos}`;
        },
        'task-imported-$count-users': (count) => {
            var users = (count === 1) ? `1 bruker` : `${count} brukere`;
            return `Importert ${users}`;
        },
        'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
            var commits = (count === 1) ? `1 commit` : `${count} commiter`;
            return `Importert en push med ${commits} fra “${branch}” av “${repo}”`;
        },
        'task-importing-commit-comments-from-$repo': (repo) => {
            return `Importerer commit kommentare fra “${repo}”`;
        },
        'task-importing-events-from-$repo': (repo) => {
            return `Importerer hendelser fra “${repo}”`;
        },
        'task-importing-issue-comments-from-$repo': (repo) => {
            return `Importerer problem kommentare fra “${repo}”`;
        },
        'task-importing-merge-request-comments-from-$repo': (repo) => {
            return `Importerer merge-request kommentare fra “${repo}”`;
        },
        'task-importing-push-from-$repo': (repo) => {
            return `Importerer push fra “${repo}”`;
        },
        'task-importing-repos': 'Importerer repoer',
        'task-importing-users': 'Importerer brukere',
        'task-installed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 krok` : `${count} kroker`;
            return `Installert ${hooks}`;
        },
        'task-installing-hooks': 'Installere kroker',
        'task-removed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 krok` : `${count} kroker`;
            return `Fjernet ${hooks}`;
        },
        'task-removed-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repo` : `${count} repoer`;
            return `Fjernet ${repos}`;
        },
        'task-removed-$count-users': (count) => {
            var users = (count === 1) ? `1 bruker` : `${count} brukere`;
            return `Fjernet ${users}`;
        },
        'task-removing-hooks': 'Avinstallere kroker',
        'task-updated-$count-repos': (count) => {
            var repos = (count === 1) ? `1 repo` : `${count} repoer`;
            return `Oppdatert ${repos}`;
        },
        'task-updated-$count-users': (count) => {
            var users = (count === 1) ? `1 bruker` : `${count} brukere`;
            return `Oppdatert ${users}`;
        },

        'text-field-placeholder-none': 'ingen',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' og ', tooltip ];
        },
        'tooltip-more': 'Flere',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `Laster opp ${files}, ${size} gjenværende`;
        },

        'user-list-add': 'Legg til ny bruker',
        'user-list-approve-all': 'Godkjenn alle forespørsler',
        'user-list-cancel': 'Avbryt',
        'user-list-confirm-disable-$count': (count) => {
            var accounts = (count === 1) ? `denne brukerkontoen` : `disse ${count} brukerkontoene`;
            return `Er du sikker på at du vil slette ${accounts}?`
        },
        'user-list-confirm-reactivate-$count': (count) => {
            var accounts = (count === 1) ? `denne brukerkontoen` : `disse ${count} brukerkontoene`;
            return `Er du sikker på at du vil reaktivere ${accounts}?`
        },
        'user-list-edit': 'Rediger brukerlisten',
        'user-list-reject-all': 'Reject all requests',
        'user-list-save': 'Lagre brukerlisten',
        'user-list-status-deleted': 'Slettet',
        'user-list-status-disabled': 'Account disabled',
        'user-list-status-pending': 'Approval pending',
        'user-list-title': 'Brukere',
        'user-list-type-admin': 'Administrator',
        'user-list-type-guest': 'Gjest',
        'user-list-type-moderator': 'Moderator',
        'user-list-type-regular': 'Vanlig bruker',
        'user-summary-$name': (name) => {
            var text = 'Bruker';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-add': 'Legg til ny bruker',
        'user-summary-cancel': 'Avbryt',
        'user-summary-confirm-delete': 'Er du sikker på at du vil slette denne brukerkontoen?',
        'user-summary-confirm-disable': 'Er du sikker på at du vil deaktivere denne brukerkontoen?',
        'user-summary-confirm-reactivate': 'Er du sikker på at du vil reaktivere denne brukerkontoen?',
        'user-summary-delete': 'Slett brukerkontoen',
        'user-summary-disable': 'Deaktiver brukerkontoen',
        'user-summary-edit': 'Rediger brukeren',
        'user-summary-email': 'E-post',
        'user-summary-github': 'GitHub profil URL',
        'user-summary-gitlab': 'GitLab profil URL',
        'user-summary-ichat': 'iChat brukernavn',
        'user-summary-linkedin': 'Linkedin profil URL',
        'user-summary-member-$name': (name) => {
            var text = 'Medlem';
            if (name) {
                text += `: ${name}`;
            }
            return text;
        },
        'user-summary-member-edit': 'Rediger medlemmet',
        'user-summary-member-return': 'Gå tilbake til medlemslisten',
        'user-summary-member-save': 'Lagre medlemmet',
        'user-summary-name': 'Navn',
        'user-summary-phone': 'Telefonnummer',
        'user-summary-profile-image': 'Profilbilde',
        'user-summary-reactivate': 'Reaktiver brukerkonto',
        'user-summary-return': 'Gå tilbake til brukerlisten',
        'user-summary-role-none': 'Ingen',
        'user-summary-roles': 'Roller',
        'user-summary-save': 'Lagre brukeren',
        'user-summary-skype': 'Skype brukernavn',
        'user-summary-slack': 'Slack bruker-id',
        'user-summary-slack-team': 'Slack team-id',
        'user-summary-social-links': 'Sosiale lenker',
        'user-summary-stackoverflow': 'Stack Overflow profil URL',
        'user-summary-statistics': 'Aktiviteter',
        'user-summary-twitter': 'Twitter brukernavn',
        'user-summary-type': 'Brukertype',
        'user-summary-type-admin': 'Administrator',
        'user-summary-type-guest': 'Gjest',
        'user-summary-type-moderator': 'Moderator',
        'user-summary-type-regular': 'Vanlig bruker',
        'user-summary-username': 'Brukernavn',

        'user-tooltip-$count': (count) => {
            return (count === 1) ? `1 bruker` : `${count} brukere`;
        },

        'validation-duplicate-project-name': 'Et prosjekt med den identifikatoren eksisterer allerede',
        'validation-duplicate-role-name': 'En rolle med den identifikatoren eksisterer allerede',
        'validation-duplicate-server-name': 'En server med den identifikatoren eksisterer allerede',
        'validation-duplicate-user-name': 'En bruker med det navnet eksisterer allerede',
        'validation-illegal-project-name': 'Prosjektidentifikator kan ikke være "global", "admin", "public" eller "srv"',
        'validation-localhost-is-wrong': '"localhost" er ikke gyldig',
        'validation-password-for-admin-only': 'Bare administratorer kan logge på med passord',
        'validation-required': 'Påkrevd',

        'welcome': 'Velkommen!',
    };
};
