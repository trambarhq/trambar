import 'moment/locale/nb';
import { cardinal } from 'common/locale/grammars/norwegian.mjs';

const phrases = {
  'action-badge-add': 'legge til',
  'action-badge-approve': 'godkjenne',
  'action-badge-archive': 'arkiverer',
  'action-badge-deselect': 'avmarker',
  'action-badge-disable': 'deaktivere',
  'action-badge-reactivate': 'reaktivere',
  'action-badge-remove': 'fjerne',
  'action-badge-restore': 'gjenopprette',
  'action-badge-select': 'velge',

  'activity-chart-legend-branch': 'Nye brancher',
  'activity-chart-legend-issue': 'Problemer',
  'activity-chart-legend-member': 'Medlemskapsendringer',
  'activity-chart-legend-merge': 'Merger',
  'activity-chart-legend-merge-request': 'Merge-requester',
  'activity-chart-legend-milestone': 'Milepæler',
  'activity-chart-legend-post': 'Innlegg',
  'activity-chart-legend-push': 'Pusher',
  'activity-chart-legend-repo': 'Repo endringer',
  'activity-chart-legend-snapshot': 'Nettstedsrevisjoner',
  'activity-chart-legend-survey': 'Undersøkelser',
  'activity-chart-legend-tag': 'Tagger',
  'activity-chart-legend-task-list': 'Oppgavelister',
  'activity-chart-legend-website-traffic': 'Trafikkmeldinger',
  'activity-chart-legend-wiki': 'Wiki redigeringer',

  'activity-tooltip-$count': (count) => {
    return cardinal(count, '1 historie', '2 historier');
  },
  'activity-tooltip-$count-branch': (count) => {
    return cardinal(count, '1 branch', '2 brancher');
  },
  'activity-tooltip-$count-issue': (count) => {
    return cardinal(count, '1 problem', '2 problemer');
  },
  'activity-tooltip-$count-member': (count) => {
    return cardinal(count, '1 medlemskapsendring', '2 medlemskapsendringer');
  },
  'activity-tooltip-$count-merge': (count) => {
    return cardinal(count, '1 merge', '2 merger');
  },
  'activity-tooltip-$count-merge-request': (count) => {
    return cardinal(count, '1 merge-request', '2 merge-requester');
  },
  'activity-tooltip-$count-milestone': (count) => {
    return cardinal(count, '1 Milepæl', '2 milepæler');
  },
  'activity-tooltip-$count-post': (count) => {
    return cardinal(count, '1 innlegg', '2 innlegg');
  },
  'activity-tooltip-$count-push': (count) => {
    return cardinal(count, '1 push', '2 pusher');
  },
  'activity-tooltip-$count-repo': (count) => {
    return cardinal(count, '1 repo endring', '2 repo endringer');
  },
  'activity-tooltip-$count-snapshot': (count) => {
    return cardinal(count, '1 nettstedrevisjon', '2 nettstedrevisjoner');
  },
  'activity-tooltip-$count-survey': (count) => {
    return cardinal(count, '1 undersøkelse', '2 undersøkelser');
  },
  'activity-tooltip-$count-tag': (count) => {
    return cardinal(count, '1 tagg', '2 tagger');
  },
  'activity-tooltip-$count-task-list': (count) => {
    return cardinal(count, '1 oppgaveliste', '2 oppgavelister');
  },
  'activity-tooltip-$count-website-traffic': (count) => {
    return cardinal(count, '1 trafikkmelding', '2 trafikkmeldinger');
  },
  'activity-tooltip-$count-wiki': (count) => {
    return cardinal(count, '1 wiki redigering', '2 wiki redigeringer');
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

  'image-preview-close': 'Lukk',
  'image-preview-dropbox': 'Dropbox',
  'image-preview-onedrive': 'OneDrive',

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
  'member-list-column-date-range': 'Aktiv periode',
  'member-list-column-email': 'E-post',
  'member-list-column-last-modified': 'Sist endret',
  'member-list-column-last-month': 'Forrige måned',
  'member-list-column-name': 'Navn',
  'member-list-column-roles': 'Roller',
  'member-list-column-this-month': 'Denne måneden',
  'member-list-column-to-date': 'Til dags dato',
  'member-list-column-type': 'Type',
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
  'nav-rest-source-new': 'Ny datakilde',
  'nav-rest-sources': 'REST datakilder',
  'nav-role-new': 'Ny rolle',
  'nav-roles': 'Roller',
  'nav-server-new': 'Ny server',
  'nav-servers': 'Servere',
  'nav-settings': 'Innstillinger',
  'nav-spreadsheet-new': 'Ny fil',
  'nav-spreadsheets': 'Excel-filer',
  'nav-user-new': 'Ny bruker',
  'nav-users': 'Brukere',
  'nav-website': 'Nettsted',
  'nav-wiki': 'GitLab wiki',

  'project-list-add': 'Legg til nytt prosjekt',
  'project-list-cancel': 'Avbryt',
  'project-list-column-date-range': 'Aktiv periode',
  'project-list-column-last-modified': 'Sist endret',
  'project-list-column-last-month': 'Forrige måned',
  'project-list-column-repositories': 'Repoer',
  'project-list-column-this-month': 'Denne måneden',
  'project-list-column-title': 'Navn',
  'project-list-column-to-date': 'Til dags dato',
  'project-list-column-users': 'Brukere',
  'project-list-confirm-archive-$count': (count) => {
    let projects = cardinal(count, 'det valgte prosjektet', 'disse 2 prosjektene');
    return `Er du sikker på at du vil arkivere ${projects}?`;
  },
  'project-list-confirm-restore-$count': (count) => {
    let projects = cardinal(count, 'det valgte prosjektet', 'disse 2 prosjektene');
    return `Er du sikker på at du vil gjenopprette ${projects}?`;
  },
  'project-list-edit': 'Rediger prosjektliste',
  'project-list-save': 'Lagre prosjektliste',
  'project-list-status-archived': 'Arkivert',
  'project-list-status-deleted': 'Slettet',
  'project-list-title': 'Prosjekter',

  'project-summary-$title': (title) => {
    let text = 'Prosjekt';
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
  'repo-list-column-date-range': 'Aktiv periode',
  'repo-list-column-issue-tracker': 'Feilrapporteringssystem',
  'repo-list-column-last-modified': 'Sist endret',
  'repo-list-column-last-month': 'Forrige måned',
  'repo-list-column-server': 'Server',
  'repo-list-column-this-month': 'Denne måneden',
  'repo-list-column-title': 'Navn',
  'repo-list-column-to-date': 'Til dags dato',
  'repo-list-confirm-remove-$count': (count) => {
    let repositories = cardinal(count, 'denne repoen', 'disse 2 repoene');
    return `Er du sikker på at du vil fjerne ${repositories} fra prosjektet?`;
  },
  'repo-list-edit': 'Rediger repo listen',
  'repo-list-issue-tracker-enabled-false': '',
  'repo-list-issue-tracker-enabled-true': 'Aktivert',
  'repo-list-save': 'Lagre repo listen',
  'repo-list-title': 'Repoer',

  'repo-summary-$title': (title) => {
    let text = `Repo`;
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
    return cardinal(count, '1 repo', '2 repoer');
  },

  'rest-list-add': 'Legg til ny datakilde',
  'rest-list-cancel': 'Avbryt',
  'rest-list-column-identifier': 'Identifikator',
  'rest-list-column-last-modified': 'Sist endret',
  'rest-list-column-type': 'Type',
  'rest-list-column-url': 'URL',
  'rest-list-confirm-disable-$count': (count) => {
    let sources = cardinal(count, 'denne kilden', 'disse 2 kildene');
    return `Er du sikker på at du vil deaktivere ${sources}?`;
  },
  'rest-list-confirm-reactivate-$count': (count) => {
    let sources = cardinal(count, 'denne kilden', 'disse 2 kildene');
    return `Er du sikker på at du vil aktivere ${sources} på nytt?`;
  },
  'rest-list-edit': 'Rediger kildelisten',
  'rest-list-save': 'Lagre kildelisten',
  'rest-list-status-deleted': 'Slettet',
  'rest-list-status-disabled': 'Deaktivert',
  'rest-list-title': 'REST datakilder',

  'rest-summary-$title': (title) => {
    let text = 'REST datakilde';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'rest-summary-add': 'Legg til ny datakilde',
  'rest-summary-cancel': 'Avbryt',
  'rest-summary-confirm-delete': 'Er du sikker på at du vil slette denne kilden?',
  'rest-summary-confirm-disable': 'Er du sikker på at du vil deaktivere denne kilden?',
  'rest-summary-confirm-reactivate': 'Er du sikker på at du vil aktivere denne kilden på nytt?',
  'rest-summary-delete': 'Slett kilden',
  'rest-summary-description': 'Beskrivelse',
  'rest-summary-disable': 'Deaktiver kilden',
  'rest-summary-edit': 'Rediger kilden',
  'rest-summary-max-age': 'Maks alder',
  'rest-summary-name': 'Identifikator',
  'rest-summary-reactivate': 'Reaktiver kilden',
  'rest-summary-return': 'Gå tilbake til kildelisten',
  'rest-summary-save': 'Lagre kilden',
  'rest-summary-type': 'Type',
  'rest-summary-url': 'URL',

  'rest-type-generic': 'Generisk',
  'rest-type-wordpress': 'WordPress',

  'role-list-add': 'Legg til ny rolle',
  'role-list-cancel': 'Avbryt',
  'role-list-column-last-modified': 'Sist endret',
  'role-list-column-title': 'Navn',
  'role-list-column-users': 'Brukere',
  'role-list-confirm-disable-$count': (count) => {
    let roles = cardinal(count, 'denne rollen', 'disse 2 rollene');
    return `Er du sikker på at du vil slette ${roles}?`;
  },
  'role-list-confirm-reactivate-$count': (count) => {
    let roles = cardinal(count, 'denne rollen', 'disse 2 rollene');
    return `Er du sikker på at du vil reaktivere ${roles}?`;
  },
  'role-list-edit': 'Rediger rollelisten',
  'role-list-save': 'Lagre rollelisten',
  'role-list-status-deleted': 'Slettet',
  'role-list-status-disabled': 'Deaktivert',
  'role-list-title': 'Roller',

  'role-summary-$title': (title) => {
    let text = 'Rolle';
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
  'role-summary-disable': 'Deaktiver rollen',
  'role-summary-edit': 'Rediger rollen',
  'role-summary-name': 'Identifier',
  'role-summary-rating': 'Historie prioritet',
  'role-summary-rating-high': 'Høy',
  'role-summary-rating-low': 'Lav',
  'role-summary-rating-normal': 'Normal',
  'role-summary-rating-very-high': 'Veldig høy',
  'role-summary-rating-very-low': 'Veldig lav',
  'role-summary-reactivate': 'Reaktiver rollen',
  'role-summary-return': 'Gå tilbake til rollelisten',
  'role-summary-save': 'Lagre rollen',
  'role-summary-title': 'Navn',
  'role-summary-users': 'Brukere',

  'role-tooltip-$count-others': (count) => {
    return `${count} andre`;
  },

  'server-list-add': 'Legg til ny server',
  'server-list-api-access-false': '',
  'server-list-api-access-true': 'Fikk',
  'server-list-cancel': 'Avbryt',
  'server-list-column-api-access': 'API-tilgang﻿',
  'server-list-column-last-modified': 'Sist endret',
  'server-list-column-oauth': 'OAuth-autentisering',
  'server-list-column-title': 'Navn',
  'server-list-column-type': 'Type',
  'server-list-column-users': 'Brukere',
  'server-list-confirm-disable-$count': (count) => {
    let servers = cardinal(count, 'denne serveren', 'disse 2 serverene');
    return `Er du sikker på at du vil slette ${servers}?`;
  },
  'server-list-confirm-reactivate-$count': (count) => {
    let servers = cardinal(count, 'denne serveren', 'disse 2 serverene');
    return `Er du sikker på at du vil reaktivere ${servers}?`;
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
  'server-summary-oauth-deauthorize-callback-url': 'Callback URL av opphevelse',
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
  'server-summary-whitelist': 'E-postadresse hviteliste',

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
    let text = `Logg inn`;
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

  'spreadsheet-list-add': 'Legg til ny lenke',
  'spreadsheet-list-cancel': 'Avbryt',
  'spreadsheet-list-column-filename': 'Filnavn',
  'spreadsheet-list-column-last-modified': 'Sist endret',
  'spreadsheet-list-column-sheets': 'Ark',
  'spreadsheet-list-column-url': 'URL',
  'spreadsheet-list-confirm-disable-$count': (count) => {
    let spreadsheets = cardinal(count, 'denne lenken', 'disse 2 lenkene');
    return `Er du sikker på at du vil deaktivere ${spreadsheets}?`;
  },
  'spreadsheet-list-confirm-reactivate-$count': (count) => {
    let spreadsheets = cardinal(count, 'denne lenken', 'disse 2 lenkene');
    return `Er du sikker på at du vil aktivere ${spreadsheets} på nytt?`;
  },
  'spreadsheet-list-edit': 'Rediger lenkeliste',
  'spreadsheet-list-save': 'Lagre lenkeliste',
  'spreadsheet-list-status-deleted': 'Slettet',
  'spreadsheet-list-status-disabled': 'Deaktivert',
  'spreadsheet-list-title': 'Excel-filer',

  'spreadsheet-summary-$title': (title) => {
    let text = 'Excel-fil';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'spreadsheet-summary-add': 'Legg til ny lenke',
  'spreadsheet-summary-cancel': 'Avbryt',
  'spreadsheet-summary-confirm-delete': 'Er du sikker på at du vil slette denne lenken?',
  'spreadsheet-summary-confirm-disable': 'Er du sikker på at du vil deaktivere denne lenken?',
  'spreadsheet-summary-confirm-reactivate': 'Er du sikker på at du vil aktivere denne lenken på nytt?',
  'spreadsheet-summary-delete': 'Slett lenken',
  'spreadsheet-summary-description': 'Beskrivelse',
  'spreadsheet-summary-disable': 'Deaktiver lenken',
  'spreadsheet-summary-edit': 'Rediger lenken',
  'spreadsheet-summary-filename': 'Filnavn',
  'spreadsheet-summary-hidden': 'Søk',
  'spreadsheet-summary-hidden-false': 'Vises i søkeresultatene',
  'spreadsheet-summary-hidden-true': 'Skjult for søk',
  'spreadsheet-summary-name': 'Identifikator',
  'spreadsheet-summary-reactivate': 'Reaktivere lenken',
  'spreadsheet-summary-return': 'Gå tilbake til lenkelisten',
  'spreadsheet-summary-save': 'Lagre lenken',
  'spreadsheet-summary-sheet-$number-$name': (number, name) => {
    let text = `Ark ${number}`;
    if (name) {
      text += `: ${name}`;
    }
    return text;
  },
  'spreadsheet-summary-title': 'Tittel',
  'spreadsheet-summary-url': 'URL',

  'task-$seconds': (seconds) => {
    return (seconds === 1) ? `1 sekund` : `${seconds} sekunder`;
  },
  'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 commit kommentar', '2 commit kommentarer');
    return `Importert ${comments} fra “${repo}”`;
  },
  'task-imported-$count-events-from-$repo': (count, repo) => {
    let events = cardinal(count, '1 hendelse', '2 hendelser');
    return `Importert ${events} fra “${repo}”`;
  },
  'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 issue kommentar', '2 issue kommentarer');
    return `Importert ${comments} fra “${repo}”`;
  },
  'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 merge-request kommentar', '2 merge-request kommentarer');
    return `Importert ${comments} fra “${repo}”`;
  },
  'task-imported-$count-repos': (count) => {
    let repos = cardinal(count, '1 repo', '2 repoer');
    return `Importert ${repos}`;
  },
  'task-imported-$count-users': (count) => {
    let users = cardinal(count, '1 bruker', '2 brukere');
    return `Importert ${users}`;
  },
  'task-imported-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wikiside', '2 wikisider');
    return `Importert ${wikis}`;
  },
  'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
    let commits = cardinal(count, '1 commit', '2 commiter');
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
  'task-importing-wikis': 'Importerer wikisider',
  'task-installed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 krok', '2 kroker');
    return `Installert ${hooks}`;
  },
  'task-installing-hooks': 'Installere kroker',
  'task-removed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 krok', '2 kroker');
    return `Avinstallert ${hooks}`;
  },
  'task-removed-$count-repos': (count) => {
    let repos = cardinal(count, '1 repo', '2 repoer');
    return `Fjernet ${repos}`;
  },
  'task-removed-$count-users': (count) => {
    let users = cardinal(count, '1 bruker', '2 brukere');
    return `Fjernet ${users}`;
  },
  'task-removed-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wikiside', '2 wikisider');
    return `Fjernet ${wikis}`;
  },
  'task-removing-hooks': 'Avinstallere kroker',
  'task-updated-$count-repos': (count) => {
    let repos = cardinal(count, '1 repo', '2 repoer');
    return `Oppdatert ${repos}`;
  },
  'task-updated-$count-users': (count) => {
    let users = cardinal(count, '1 bruker', '2 brukere');
    return `Oppdatert ${users}`;
  },
  'task-updated-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wikiside', '2 wikisider');
    return `Oppdatert ${wikis}`;
  },

  'text-field-placeholder-none': 'ingen',

  'tooltip-$first-and-$tooltip': (first, tooltip) => {
    return [ first, ' og ', tooltip ];
  },
  'tooltip-more': 'Flere',

  'tz-name-abidjan': 'Abidjan',
  'tz-name-accra': 'Accra',
  'tz-name-acre': 'Acre',
  'tz-name-act': 'Australian Capital Territory',
  'tz-name-adak': 'Adak',
  'tz-name-addis-ababa': 'Addis Abeba',
  'tz-name-adelaide': 'Adelaide',
  'tz-name-aden': 'Aden',
  'tz-name-africa': 'Afrika',
  'tz-name-alaska': 'Alaska',
  'tz-name-aleutian': 'Aleutian',
  'tz-name-algiers': 'Alger',
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
  'tz-name-aqtau': 'Aktau',
  'tz-name-aqtobe': 'Aqtobe',
  'tz-name-araguaina': 'Araguaina',
  'tz-name-arctic': 'Arktis',
  'tz-name-argentina': 'Argentina',
  'tz-name-arizona': 'Arizona',
  'tz-name-aruba': 'Aruba',
  'tz-name-ashgabat': 'Ashgabat',
  'tz-name-ashkhabad': 'Asjkhabad',
  'tz-name-asia': 'Asia',
  'tz-name-asmara': 'Asmara',
  'tz-name-asmera': 'Asmera',
  'tz-name-astrakhan': 'Astrakhan',
  'tz-name-asuncion': 'Asuncion',
  'tz-name-athens': 'Aten',
  'tz-name-atikokan': 'Atikokan',
  'tz-name-atka': 'Atka',
  'tz-name-atlantic': 'Atlantic',
  'tz-name-atyrau': 'Atyrau',
  'tz-name-auckland': 'Auckland',
  'tz-name-australia': 'Australia',
  'tz-name-azores': 'Azorene',
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
  'tz-name-belgrade': 'Beograd',
  'tz-name-belize': 'Belize',
  'tz-name-berlin': 'Berlin',
  'tz-name-bermuda': 'Bermuda',
  'tz-name-beulah': 'Beulah',
  'tz-name-bishkek': 'Bishkek',
  'tz-name-bissau': 'Bissau',
  'tz-name-blanc-sablon': 'Blanc-Sablon',
  'tz-name-blantyre': 'Blantyre',
  'tz-name-boa-vista': 'Boa Vista',
  'tz-name-bogota': 'Bogota',
  'tz-name-boise': 'Boise',
  'tz-name-bougainville': 'Bougainville',
  'tz-name-bratislava': 'Bratislava',
  'tz-name-brazil': 'Brasil',
  'tz-name-brazzaville': 'Brazzaville',
  'tz-name-brisbane': 'Brisbane',
  'tz-name-broken-hill': 'Broken Hill',
  'tz-name-brunei': 'Brunei',
  'tz-name-brussels': 'Brussel',
  'tz-name-bucharest': 'Bucuresti',
  'tz-name-budapest': 'Budapest',
  'tz-name-buenos-aires': 'Buenos Aires',
  'tz-name-bujumbura': 'Bujumbura',
  'tz-name-busingen': 'Busingen',
  'tz-name-cairo': 'Kairo',
  'tz-name-calcutta': 'Calcutta',
  'tz-name-cambridge-bay': 'Cambridge Bay',
  'tz-name-campo-grande': 'Campo Grande',
  'tz-name-canada': 'Canada',
  'tz-name-canary': 'Kanariøyene',
  'tz-name-canberra': 'Canberra',
  'tz-name-cancun': 'Cancun',
  'tz-name-cape-verde': 'Kapp Verde',
  'tz-name-caracas': 'Caracas',
  'tz-name-casablanca': 'Casablanca',
  'tz-name-casey': 'Casey',
  'tz-name-catamarca': 'Catamarca',
  'tz-name-cayenne': 'Cayenne',
  'tz-name-cayman': 'Cayman',
  'tz-name-center': 'Senter',
  'tz-name-central': 'Sentral',
  'tz-name-ceuta': 'Ceuta',
  'tz-name-chagos': 'Chagos',
  'tz-name-chatham': 'Chatham',
  'tz-name-chicago': 'Chicago',
  'tz-name-chihuahua': 'Chihuahua',
  'tz-name-chile': 'Chile',
  'tz-name-chisinau': 'Chisinau',
  'tz-name-chita': 'Chita',
  'tz-name-choibalsan': 'Choibalsan',
  'tz-name-chongqing': 'Chongqing',
  'tz-name-christmas': 'Juløya',
  'tz-name-chungking': 'Chongqing',
  'tz-name-chuuk': 'Chuuk',
  'tz-name-cocos': 'Kokosøyene',
  'tz-name-colombo': 'Colombo',
  'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
  'tz-name-comoro': 'Comoro',
  'tz-name-conakry': 'Conakry',
  'tz-name-continental': 'Continental',
  'tz-name-copenhagen': 'København',
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
  'tz-name-danmarkshavn': 'Danmarks',
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
  'tz-name-djibouti': 'Djibouti',
  'tz-name-dominica': 'Dominica',
  'tz-name-douala': 'Douala',
  'tz-name-dubai': 'Dubai',
  'tz-name-dublin': 'Dublin',
  'tz-name-dumont-d-urville': 'Dumont d’Urville',
  'tz-name-dushanbe': 'Dushanbe',
  'tz-name-east': 'Øst',
  'tz-name-east-indiana': 'Øst-Indiana',
  'tz-name-easter': 'Påskeøya',
  'tz-name-easter-island': 'Påskeøya',
  'tz-name-eastern': 'Østlig',
  'tz-name-edmonton': 'Edmonton',
  'tz-name-efate': 'Efate',
  'tz-name-eirunepe': 'Eirunepe',
  'tz-name-el-aaiun': 'El Aaiun',
  'tz-name-el-salvador': 'El Salvador',
  'tz-name-enderbury': 'Enderbury',
  'tz-name-ensenada': 'Ensenada',
  'tz-name-eucla': 'Eucla',
  'tz-name-europe': 'Europa',
  'tz-name-faeroe': 'Færøyene',
  'tz-name-fakaofo': 'Fakaofo',
  'tz-name-famagusta': 'Famagusta',
  'tz-name-faroe': 'Faroe',
  'tz-name-fiji': 'Fiji',
  'tz-name-fort-nelson': 'Fort Nelson',
  'tz-name-fort-wayne': 'Fort Wayne',
  'tz-name-fortaleza': 'Fortaleza',
  'tz-name-freetown': 'Freetown',
  'tz-name-funafuti': 'Funafuti',
  'tz-name-gaborone': 'Gaborone',
  'tz-name-galapagos': 'Galapagos',
  'tz-name-gambier': 'Gambier',
  'tz-name-gaza': 'Gaza',
  'tz-name-general': 'Generell',
  'tz-name-gibraltar': 'Gibraltar',
  'tz-name-glace-bay': 'Glace Bay',
  'tz-name-godthab': 'Godthåb',
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
  'tz-name-havana': 'Havana',
  'tz-name-hawaii': 'Hawaii',
  'tz-name-hebron': 'Hebron',
  'tz-name-helsinki': 'Helsinki',
  'tz-name-hermosillo': 'Hermosillo',
  'tz-name-ho-chi-minh': 'Ho Chi Minh',
  'tz-name-hobart': 'Hobart',
  'tz-name-hong-kong': 'Hong Kong',
  'tz-name-honolulu': 'Honolulu',
  'tz-name-hovd': 'Hovd',
  'tz-name-indian': 'Indiske hav',
  'tz-name-indiana': 'Indiana',
  'tz-name-indiana-starke': 'Indiana-Starke',
  'tz-name-indianapolis': 'Indianapolis',
  'tz-name-inuvik': 'Inuvik',
  'tz-name-iqaluit': 'Iqaluit',
  'tz-name-irkutsk': 'Irkutsk',
  'tz-name-isle-of-man': 'Isle of Man',
  'tz-name-istanbul': 'Istanbul',
  'tz-name-jakarta': 'Jakarta',
  'tz-name-jamaica': 'Jamaica',
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
  'tz-name-kamchatka': 'Kamchatka',
  'tz-name-kampala': 'Kampala',
  'tz-name-karachi': 'Karachi',
  'tz-name-kashgar': 'Kashgar',
  'tz-name-kathmandu': 'Kathmandu',
  'tz-name-katmandu': 'Katmandu',
  'tz-name-kentucky': 'Kentucky',
  'tz-name-kerguelen': 'Kerguelen',
  'tz-name-khandyga': 'Khandyga',
  'tz-name-khartoum': 'Khartoum',
  'tz-name-kiev': 'Kiev',
  'tz-name-kigali': 'Kigali',
  'tz-name-kinshasa': 'Kinshasa',
  'tz-name-kiritimati': 'Kiritimati',
  'tz-name-kirov': 'Kirov',
  'tz-name-knox': 'Knox',
  'tz-name-knox-in': 'Knox, Indiana',
  'tz-name-kolkata': 'Kolkata',
  'tz-name-kosrae': 'Kosrae',
  'tz-name-kralendijk': 'Kralendijk',
  'tz-name-krasnoyarsk': 'Krasnoyarsk',
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
  'tz-name-lisbon': 'Lisboa',
  'tz-name-ljubljana': 'Ljubljana',
  'tz-name-lome': 'Lome',
  'tz-name-london': 'London',
  'tz-name-longyearbyen': 'Longyearbyen',
  'tz-name-lord-howe': 'Lord Howe',
  'tz-name-los-angeles': 'Los Angeles',
  'tz-name-louisville': 'Louisville',
  'tz-name-lower-princes': 'Lower Prince’s Quarter',
  'tz-name-luanda': 'Luanda',
  'tz-name-lubumbashi': 'Lubumbashi',
  'tz-name-lusaka': 'Lusaka',
  'tz-name-luxembourg': 'Luxembourg',
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
  'tz-name-maldives': 'Maldivene',
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
  'tz-name-mexico': 'Mexico',
  'tz-name-mexico-city': 'Mexico City',
  'tz-name-michigan': 'Michigan',
  'tz-name-midway': 'Midway',
  'tz-name-minsk': 'Minsk',
  'tz-name-miquelon': 'Miquelon',
  'tz-name-mogadishu': 'Mogadishu',
  'tz-name-monaco': 'Monaco',
  'tz-name-moncton': 'Moncton',
  'tz-name-monrovia': 'Monrovia',
  'tz-name-monterrey': 'Monterrey',
  'tz-name-montevideo': 'Montevideo',
  'tz-name-monticello': 'Monticello',
  'tz-name-montreal': 'Montreal',
  'tz-name-montserrat': 'Montserrat',
  'tz-name-moscow': 'Moskva',
  'tz-name-mountain': 'Fjell',
  'tz-name-muscat': 'Muscat',
  'tz-name-nairobi': 'Nairobi',
  'tz-name-nassau': 'Nassau',
  'tz-name-nauru': 'Nauru',
  'tz-name-ndjamena': 'Ndjamena',
  'tz-name-new-salem': 'New Salem',
  'tz-name-new-york': 'New York',
  'tz-name-newfoundland': 'Newfoundland',
  'tz-name-niamey': 'Niamey',
  'tz-name-nicosia': 'Nikosia',
  'tz-name-nipigon': 'Nipigon',
  'tz-name-niue': 'Niue',
  'tz-name-nome': 'Nome',
  'tz-name-norfolk': 'Norfolk',
  'tz-name-noronha': 'Noronha',
  'tz-name-north': 'Nord',
  'tz-name-north-dakota': 'Norddakota',
  'tz-name-nouakchott': 'Nouakchott',
  'tz-name-noumea': 'Noumea',
  'tz-name-novokuznetsk': 'Novokuznetsk',
  'tz-name-novosibirsk': 'Novosibirsk',
  'tz-name-nsw': 'New South Wales',
  'tz-name-ojinaga': 'Ojinaga',
  'tz-name-omsk': 'Omsk',
  'tz-name-oral': 'Oral',
  'tz-name-oslo': 'Oslo',
  'tz-name-ouagadougou': 'Ouagadougou',
  'tz-name-pacific': 'Pacific',
  'tz-name-pacific-new': 'Pacific-Ny',
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
  'tz-name-phoenix': 'Phoenix',
  'tz-name-pitcairn': 'Pitcairn',
  'tz-name-podgorica': 'Podgorica',
  'tz-name-pohnpei': 'Pohnpei',
  'tz-name-ponape': 'Ponape',
  'tz-name-pontianak': 'Pontianak',
  'tz-name-port-au-prince': 'Port-au-Prince',
  'tz-name-port-moresby': 'Port Moresby',
  'tz-name-port-of-spain': 'Port of Spain',
  'tz-name-porto-acre': 'Porto Acre',
  'tz-name-porto-novo': 'Porto-Novo',
  'tz-name-porto-velho': 'Porto Velho',
  'tz-name-prague': 'Praha',
  'tz-name-puerto-rico': 'Puerto Rico',
  'tz-name-punta-arenas': 'Punta Arenas',
  'tz-name-pyongyang': 'Pyongyang',
  'tz-name-qatar': 'Qatar',
  'tz-name-qostanay': 'Qostanay',
  'tz-name-queensland': 'Queensland',
  'tz-name-qyzylorda': 'Qyzylorda',
  'tz-name-rainy-river': 'Rainy River',
  'tz-name-rangoon': 'Rangoon',
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
  'tz-name-riyadh': 'Riyadh',
  'tz-name-rome': 'Roma',
  'tz-name-rosario': 'Rosario',
  'tz-name-rothera': 'Rothera',
  'tz-name-saigon': 'Saigon',
  'tz-name-saipan': 'Saipan',
  'tz-name-sakhalin': 'Sakhalin',
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
  'tz-name-sao-paulo': 'São Paulo',
  'tz-name-sao-tome': 'São Tomé',
  'tz-name-sarajevo': 'Sarajevo',
  'tz-name-saratov': 'Saratov',
  'tz-name-saskatchewan': 'Saskatchewan',
  'tz-name-scoresbysund': 'Scoresbysund',
  'tz-name-seoul': 'Seoul',
  'tz-name-shanghai': 'Shanghai',
  'tz-name-shiprock': 'Shiprock',
  'tz-name-simferopol': 'Simferopol',
  'tz-name-singapore': 'Singapore',
  'tz-name-sitka': 'Sitka',
  'tz-name-skopje': 'Skopje',
  'tz-name-sofia': 'Sofia',
  'tz-name-south': 'Sør',
  'tz-name-south-georgia': 'Sør-Georgia',
  'tz-name-south-pole': 'Sydpol',
  'tz-name-srednekolymsk': 'Srednekolymsk',
  'tz-name-st-barthelemy': 'St Barthelemy',
  'tz-name-st-helena': 'St. Helena',
  'tz-name-st-johns': 'St Johns',
  'tz-name-st-kitts': 'St Kitts',
  'tz-name-st-lucia': 'St Lucia',
  'tz-name-st-thomas': 'St. Thomas',
  'tz-name-st-vincent': 'St Vincent',
  'tz-name-stanley': 'Stanley',
  'tz-name-stockholm': 'Stockholm',
  'tz-name-swift-current': 'Swift Current',
  'tz-name-sydney': 'Sydney',
  'tz-name-syowa': 'Syowa',
  'tz-name-tahiti': 'Tahiti',
  'tz-name-taipei': 'Taipei',
  'tz-name-tallinn': 'Tallinn',
  'tz-name-tarawa': 'Tarawa',
  'tz-name-tashkent': 'Tasjkent',
  'tz-name-tasmania': 'Tasmania',
  'tz-name-tbilisi': 'Tbilisi',
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
  'tz-name-tirane': 'Tirana',
  'tz-name-tiraspol': 'Tiraspol',
  'tz-name-tokyo': 'Tokyo',
  'tz-name-tomsk': 'Tomsk',
  'tz-name-tongatapu': 'Tongatapu',
  'tz-name-toronto': 'Toronto',
  'tz-name-tortola': 'Tortola',
  'tz-name-tripoli': 'Tripoli',
  'tz-name-troll': 'Troll',
  'tz-name-truk': 'Truk',
  'tz-name-tucuman': 'Tucuman',
  'tz-name-tunis': 'Tunis',
  'tz-name-ujung-pandang': 'Ujung Pandang',
  'tz-name-ulaanbaatar': 'Ulaanbaatar',
  'tz-name-ulan-bator': 'Ulan Bator',
  'tz-name-ulyanovsk': 'Ulyanovsk',
  'tz-name-urumqi': 'Urumqi',
  'tz-name-us': 'USA',
  'tz-name-ushuaia': 'Ushuaia',
  'tz-name-ust-nera': 'Ust-Nera',
  'tz-name-uzhgorod': 'Uzhgorod',
  'tz-name-vaduz': 'Vaduz',
  'tz-name-vancouver': 'Vancouver',
  'tz-name-vatican': 'Vatikanet',
  'tz-name-vevay': 'Vevay',
  'tz-name-victoria': 'Victoria',
  'tz-name-vienna': 'Wien',
  'tz-name-vientiane': 'Vientiane',
  'tz-name-vilnius': 'Vilnius',
  'tz-name-vincennes': 'Vincennes',
  'tz-name-virgin': 'Jomfruøyene',
  'tz-name-vladivostok': 'Vladivostok',
  'tz-name-volgograd': 'Volgograd',
  'tz-name-vostok': 'Vostok',
  'tz-name-wake': 'Wake Island',
  'tz-name-wallis': 'Wallis',
  'tz-name-warsaw': 'Warszawa',
  'tz-name-west': 'Vest',
  'tz-name-whitehorse': 'Whitehorse',
  'tz-name-winamac': 'Winamac',
  'tz-name-windhoek': 'Windhoek',
  'tz-name-winnipeg': 'Winnipeg',
  'tz-name-yakutat': 'Yakutat',
  'tz-name-yakutsk': 'Yakutsk',
  'tz-name-yancowinna': 'Yancowinna',
  'tz-name-yangon': 'Yangon',
  'tz-name-yap': 'Yap',
  'tz-name-yekaterinburg': 'Jekaterinburg',
  'tz-name-yellowknife': 'Yellowknife',
  'tz-name-yerevan': 'Yerevan',
  'tz-name-yukon': 'Yukon',
  'tz-name-zagreb': 'Zagreb',
  'tz-name-zaporozhye': 'Zaporozhye',
  'tz-name-zurich': 'Zürich',

  'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
    let files = cardinal(count, '1 fil', '2 filer');
    return `Laster opp ${files}, ${size} gjenværende`;
  },

  'user-list-add': 'Legg til ny bruker',
  'user-list-approve-all': 'Godkjenn alle forespørsler',
  'user-list-cancel': 'Avbryt',
  'user-list-column-email': 'E-post',
  'user-list-column-last-modified': 'Sist endret',
  'user-list-column-name': 'Navn',
  'user-list-column-projects': 'Prosjekter',
  'user-list-column-roles': 'Roller',
  'user-list-column-type': 'Type',
  'user-list-column-username': 'Brukernavn',
  'user-list-confirm-disable-$count': (count) => {
    let accounts = cardinal(count, 'denne brukerkontoen', 'disse 2 brukerkontoene');
    return `Er du sikker på at du vil slette ${accounts}?`;
  },
  'user-list-confirm-reactivate-$count': (count) => {
    let accounts = cardinal(count, 'denne brukerkontoen', 'disse 2 brukerkontoene');
    return `Er du sikker på at du vil reaktivere ${accounts}?`;
  },
  'user-list-edit': 'Rediger brukerlisten',
  'user-list-reject-all': 'Avvis alle forespørsler',
  'user-list-save': 'Lagre brukerlisten',
  'user-list-status-deleted': 'Slettet',
  'user-list-status-disabled': 'Konto deaktivert',
  'user-list-status-pending': 'Venter på godkjenning',
  'user-list-title': 'Brukere',
  'user-list-type-admin': 'Administrator',
  'user-list-type-guest': 'Gjest',
  'user-list-type-moderator': 'Moderator',
  'user-list-type-regular': 'Vanlig bruker',
  'user-summary-$name': (name) => {
    let text = 'Bruker';
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
    let text = 'Medlem';
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
  'user-summary-reactivate': 'Reaktiver brukerkontoen',
  'user-summary-remove-membership': 'Fjern brukeren fra prosjektet',
  'user-summary-restore-membership': 'Legg brukeren til prosjektet',
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
    return cardinal(count, '1 bruker', '2 brukere');
  },

  'validation-duplicate-project-name': 'Et prosjekt med den identifikatoren eksisterer allerede',
  'validation-duplicate-role-name': 'En rolle med den identifikatoren eksisterer allerede',
  'validation-duplicate-server-name': 'En server med den identifikatoren eksisterer allerede',
  'validation-duplicate-source-name': 'En kilde med den identifikatoren finnes allerede',
  'validation-duplicate-spreadsheet-name': 'En lenke med den identifikatoren finnes allerede',
  'validation-duplicate-user-name': 'En bruker med det navnet eksisterer allerede',
  'validation-illegal-project-name': 'Prosjektidentifikator kan ikke være "global", "admin", "public" eller "srv"',
  'validation-invalid-timezone': 'Ugyldig tidssone',
  'validation-localhost-is-wrong': '"localhost" er ikke gyldig',
  'validation-password-for-admin-only': 'Bare administratorer kan logge på med passord',
  'validation-required': 'Påkrevd',
  'validation-used-by-trambar': 'Brukt av Trambar',

  'website-summary-cancel': 'Avbryt',
  'website-summary-domain-names': 'Domenenavn',
  'website-summary-edit': 'Rediger nettside',
  'website-summary-save': 'Lagre nettside',
  'website-summary-template': 'Mal',
  'website-summary-template-disabled': 'Deaktivert',
  'website-summary-template-generic': 'Generisk mal',
  'website-summary-timezone': 'Tidssone',
  'website-summary-title': 'Nettsted',
  'website-summary-traffic-report-time': 'Publikasjonstid for trafikkrapport',
  'website-summary-versions': 'Versjoner',

  'welcome': 'Velkommen!',

  'wiki-list-cancel': 'Avbryt',
  'wiki-list-column-last-modified': 'Sist endret',
  'wiki-list-column-public': 'Offentlig',
  'wiki-list-column-repo': 'Repo',
  'wiki-list-column-title': 'Tittel',
  'wiki-list-confirm-deselect-$count': (count) => {
    let pages = cardinal(count, 'denne siden', 'disse 2 sidene');
    return `Er du sikker på at du vil fjerne markeringen av ${page}?`;
  },
  'wiki-list-confirm-select-$count': (count) => {
    let pages = cardinal(count, 'denne siden', 'disse 2 sidene');
    let e = (count === 1) ? '' : 'e';
    return `Er du sikker på at du vil gjøre ${pages} offentlig${e}?`;
  },
  'wiki-list-edit': 'Rediger sideliste',
  'wiki-list-public-always': 'alltid',
  'wiki-list-public-no': 'nei',
  'wiki-list-public-referenced': 'referert',
  'wiki-list-save': 'Lagre sidelisten',
  'wiki-list-title': 'GitLab wiki',

  'wiki-summary-$title': (title) => {
    let text = 'GitLab wiki';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'wiki-summary-cancel': 'Avbryt',
  'wiki-summary-confirm-deselect': 'Er du sikker på at du vil fjerne markeringen av denne siden?',
  'wiki-summary-confirm-select': 'Er du sikker på at du vil gjøre denne siden offentlig?',
  'wiki-summary-deselect': 'Fjern markeringen av siden',
  'wiki-summary-edit': 'Rediger siden',
  'wiki-summary-hidden': 'Søk',
  'wiki-summary-hidden-false': 'Vises i søkeresultatene',
  'wiki-summary-hidden-true': 'Skjult for søk',
  'wiki-summary-page-contents': 'Innhold',
  'wiki-summary-public': 'Offentlig',
  'wiki-summary-public-always': 'Alltid',
  'wiki-summary-public-no': 'Nei',
  'wiki-summary-public-referenced': 'Ja (referert av en annen offentlig side)',
  'wiki-summary-repo': 'Repo-identifikator',
  'wiki-summary-return': 'Gå tilbake til sidelisten',
  'wiki-summary-save': 'Lagre siden',
  'wiki-summary-select': 'Velg siden',
  'wiki-summary-slug': 'Slug',
  'wiki-summary-title': 'Tittel',
};


export {
  phrases,
};
