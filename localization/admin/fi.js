import 'moment/locale/fi';
import { cardinal } from '../grammars/finnish.mjs';

const phrases = {
  'action-badge-add': 'lisätään',
  'action-badge-approve': 'hyväksytään',
  'action-badge-archive': 'arkistoidaan',
  'action-badge-deselect': 'poistetaan',
  'action-badge-disable': 'deaktivoidaan',
  'action-badge-reactivate': 'reaktivoidaan',
  'action-badge-remove': 'poistetaan',
  'action-badge-restore': 'palautetaan',
  'action-badge-select': 'valitaan',

  'activity-chart-legend-branch': 'Branchit',
  'activity-chart-legend-issue': 'Asiat',
  'activity-chart-legend-member': 'Jäsenmuutokset',
  'activity-chart-legend-merge': 'Yhdistämiset',
  'activity-chart-legend-merge-request': 'Yhdistämispyynnöt',
  'activity-chart-legend-milestone': 'Virstanpylväät',
  'activity-chart-legend-post': 'Viestejä',
  'activity-chart-legend-push': 'Työnnöt',
  'activity-chart-legend-repo': 'Muutokset arkistoon',
  'activity-chart-legend-snapshot': 'Verkkosivustojen versiot',
  'activity-chart-legend-survey': 'Kyselyt',
  'activity-chart-legend-tag': 'Tagit',
  'activity-chart-legend-task-list': 'Tehtäväluettelot',
  'activity-chart-legend-website-traffic': 'Liikenneraportit',
  'activity-chart-legend-wiki': 'Wiki-muokkaukset',

  'activity-tooltip-$count': (count) => {
    return cardinal(count, '1 tarina', '2 tarinaa');
  },
  'activity-tooltip-$count-branch': (count) => {
    return cardinal(count, '1 haara', '2 haaraa');
  },
  'activity-tooltip-$count-issue': (count) => {
    return cardinal(count, '1 asia', '2 asiaa');
  },
  'activity-tooltip-$count-member': (count) => {
    return cardinal(count, '1 jäsenmuutos', '2 jäsenmuutosta');
  },
  'activity-tooltip-$count-merge': (count) => {
    return cardinal(count, '1 yhdistäminen', '2 yhdistämistä');
  },
  'activity-tooltip-$count-merge-request': (count) => {
    return cardinal(count, '1 yhdistämisenpyyntö', '2 yhdistämispyyntöä');
  },
  'activity-tooltip-$count-milestone': (count) => {
    return cardinal(count, '1 virstanpylväs', '2 virstanpylvästä');
  },
  'activity-tooltip-$count-post': (count) => {
    return cardinal(count, '1 viesti', '2 viestiä');
  },
  'activity-tooltip-$count-push': (count) => {
    return cardinal(count, '1 työntö', '2 työntöä');
  },
  'activity-tooltip-$count-repo': (count) => {
    return cardinal(count, '1 muutos arkistoon', '2 muutosta arkistoon');
  },
  'activity-tooltip-$count-snapshot': (count) => {
    return cardinal(count, '1 verkkosivuston versio', '2 verkkosivuston versiota');
  },
  'activity-tooltip-$count-survey': (count) => {
    return cardinal(count, '1 kysely', '2 kyselystä');
  },
  'activity-tooltip-$count-tag': (count) => {
    return cardinal(count, '1 tagi', '2 tagia');
  },
  'activity-tooltip-$count-task-list': (count) => {
    return cardinal(count, '1 tehtäväluettelo', '2 tehtäväluetteloa');
  },
  'activity-tooltip-$count-website-traffic': (count) => {
    return cardinal(count, '1 liikenneraportti', '2 liikenneraporttia');
  },
  'activity-tooltip-$count-wiki': (count) => {
    return cardinal(count, '1 wiki muokkaus', '2 wiki muokkausta');
  },

  'app-name': 'Trambar',
  'app-title': 'Trambar - Hallintakonsoli',

  'confirmation-cancel': 'Peruutta',
  'confirmation-confirm': 'Vahvista',
  'confirmation-data-loss': 'Haluatko varmasti hylätä tekemäsi muutokset?',

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

  'image-album-cancel': 'Peruutta',
  'image-album-done': 'Sulje',
  'image-album-manage': 'Hallitse albumia',
  'image-album-remove': 'Poista valitut',
  'image-album-select': 'Käytä valittua',
  'image-album-upload': 'Lähetä tiedostoja',

  'image-cropping-cancel': 'Peruutta',
  'image-cropping-select': 'OK',

  'image-preview-close': 'Sulje',
  'image-preview-dropbox': 'Dropbox',
  'image-preview-onedrive': 'OneDrive',

  'image-selector-choose-from-album': 'Valitse albumista',
  'image-selector-crop-image': 'Säädä koko/sijainti',
  'image-selector-upload-file': 'Lataa kuva',

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
  'member-list-add': 'Lisää uusi käyttäjä',
  'member-list-approve-all': 'Hyväksy kaikki pyynnöt',
  'member-list-cancel': 'Peruutta',
  'member-list-column-date-range': 'Aktiivinen ajanjakso',
  'member-list-column-email': 'Sähköpostiosoite',
  'member-list-column-last-modified': 'Viimeksi muokattu',
  'member-list-column-last-month': 'Viime kuukausi',
  'member-list-column-name': 'Nimi',
  'member-list-column-roles': 'Roolit',
  'member-list-column-this-month': 'Tässä kuussa',
  'member-list-column-to-date': 'Tähän mennessä',
  'member-list-column-type': 'Tyyppi',
  'member-list-edit': 'Muokkaa jäsenluetteloa',
  'member-list-reject-all': 'Hylkää kaikki pyynnöt',
  'member-list-save': 'Tallenna jäsenluettelo',
  'member-list-status-non-member': 'Ei jäsen',
  'member-list-status-pending': 'Pyyntö odottaa',
  'member-list-title': 'Jäsenet',

  'nav-member-new': 'Uusi jäsen',
  'nav-members': 'Jäsenet',
  'nav-project-new': 'Uusi projekti',
  'nav-projects': 'Projektit',
  'nav-repositories': 'Arkistot',
  'nav-rest-source-new': 'Uusi tietolähde',
  'nav-rest-sources': 'REST-tietolähteet',
  'nav-role-new': 'Uusi rooli',
  'nav-roles': 'Roolit',
  'nav-server-new': 'Uusi palvelin',
  'nav-servers': 'Palvelimet',
  'nav-settings': 'Ssetukset',
  'nav-spreadsheet-new': 'Uusi tiedosto',
  'nav-spreadsheets': 'Excel-tiedostot',
  'nav-user-new': 'Uusi käyttäjä',
  'nav-users': 'Käyttäjät',
  'nav-website': 'Verkkosivusto',
  'nav-wiki': 'GitLab-wiki',

  'project-list-add': 'Lisää uusi projekti',
  'project-list-cancel': 'Peruutta',
  'project-list-column-date-range': 'Aktiivinen ajanjakso',
  'project-list-column-last-modified': 'Viimeksi muokattu',
  'project-list-column-last-month': 'Viime kuukausi',
  'project-list-column-repositories': 'Arkistot',
  'project-list-column-this-month': 'Tässä kuussa',
  'project-list-column-title': 'Nimi',
  'project-list-column-to-date': 'Tähän mennessä',
  'project-list-column-users': 'Käyttäjät',
  'project-list-confirm-archive-$count': (count) => {
    let projects = cardinal(count, 'valitun projektin', 'nämä 2 projektia');
    return `Haluatko varmasti arkistoida ${projects}?`;
  },
  'project-list-confirm-restore-$count': (count) => {
    let projects = cardinal(count, 'valitun projektin', 'nämä 2 projektia');
    return `Haluatko varmasti palauttaa ${projects}?`;
  },
  'project-list-edit': 'Muokkaa projektiluetteloa',
  'project-list-save': 'Tallenna projektiluettelo',
  'project-list-status-archived': 'Arkistoitu',
  'project-list-status-deleted': 'Poistettu',
  'project-list-title': 'Projektit',

  'project-summary-$title': (title) => {
    let text = 'Projekti';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'project-summary-access-control': 'Kulunvalvonta',
  'project-summary-access-control-member-only': 'Projektin sisältö rajoitetaan vain jäsenille',
  'project-summary-access-control-non-member-comment': 'Muut kuin jäsenet voivat kommentoida tarinoita',
  'project-summary-access-control-non-member-view': 'Muut kuin jäsenet voivat tarkastella sisältöä',
  'project-summary-add': 'Lisää uusi projekti',
  'project-summary-archive': 'Arkistoi projektin',
  'project-summary-cancel': 'Peruutta',
  'project-summary-confirm-archive': 'Haluatko varmasti arkistoida tämän projektin?',
  'project-summary-confirm-delete': 'Haluatko varmasti poistaa tämän projektin?',
  'project-summary-confirm-restore': 'Haluatko varmasti palauttaa tämän projektin?',
  'project-summary-delete': 'Poista projekti',
  'project-summary-description': 'Kuvaus',
  'project-summary-edit': 'Muokkaa projektia',
  'project-summary-emblem': 'Tunnuskuva',
  'project-summary-name': 'Tunniste',
  'project-summary-new-members': 'Uudet jäsenet',
  'project-summary-new-members-auto-accept-guest': 'Vieraskäyttäjät hyväksytään automaattisesti',
  'project-summary-new-members-auto-accept-user': 'Tavalliset käyttäjät hyväksytään automaattisesti',
  'project-summary-new-members-join-guest': 'Vieraskäyttäjät voivat pyytää liittyä projektiin',
  'project-summary-new-members-join-user': 'Tavalliset käyttäjät voivat pyytää liittyä projektiin',
  'project-summary-new-members-manual': 'Jäsenet lisätään manuaalisesti',
  'project-summary-other-actions': 'Muut toimet',
  'project-summary-restore': 'Palauta projekti',
  'project-summary-return': 'Palaa projektiluetteloon',
  'project-summary-save': 'Tallenna projekti',
  'project-summary-statistics': 'Toiminta',
  'project-summary-title': 'Nimi',

  'project-tooltip-$count-others': (count) => {
    return cardinal(count, '1 muu', '2 muuta');
  },

  'repo-list-cancel': 'Peruutta',
  'repo-list-column-date-range': 'Aktiivinen ajanjakso',
  'repo-list-column-issue-tracker': 'Raportointityökalu',
  'repo-list-column-last-modified': 'Viimeksi muokattu',
  'repo-list-column-last-month': 'Viime kuukausi',
  'repo-list-column-server': 'Palvelin',
  'repo-list-column-this-month': 'Tässä kuussa',
  'repo-list-column-title': 'Nimi',
  'repo-list-column-to-date': 'Tähän mennessä',
  'repo-list-confirm-remove-$count': (count) => {
    let repositories = cardinal(count, 'tämän arkiston', 'nämä 2 arkistoa');
    return `Haluatko varmasti poistaa ${repositories} projektista?`;
  },
  'repo-list-edit': 'Muokkaa arkistoluetteloa',
  'repo-list-issue-tracker-enabled-false': '',
  'repo-list-issue-tracker-enabled-true': 'Käytössä',
  'repo-list-save': 'Tallenna arkistoluetteloa',
  'repo-list-title': 'Arkistot',

  'repo-summary-$title': (title) => {
    let text = `Arkisto`;
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'repo-summary-cancel': 'Peruutta',
  'repo-summary-confirm-remove': 'Haluatko varmasti poistaa tämän arkiston projektista?',
  'repo-summary-confirm-restore': 'Haluatko varmasti lisätä tämän arkiston projektiin uudelleen?',
  'repo-summary-edit': 'Muokkaa arkistoa',
  'repo-summary-gitlab-name': 'GitLab-projektin nimi',
  'repo-summary-issue-tracker': 'Raportointityökalu',
  'repo-summary-issue-tracker-disabled': 'Deaktivoitu',
  'repo-summary-issue-tracker-enabled': 'Käytössä',
  'repo-summary-remove': 'Poista arkisto',
  'repo-summary-restore': 'Palauta arkisto',
  'repo-summary-return': 'Palaa arkistoluetteloon',
  'repo-summary-save': 'Tallenna arkisto',
  'repo-summary-statistics': 'Toiminta',
  'repo-summary-title': 'Nimi',

  'repository-tooltip-$count': (count) => {
    return cardinal(count, '1 arkisto', '2 arkistoa');
  },

  'rest-list-add': 'Lisää uusi tietolähde',
  'rest-list-cancel': 'Peruutta',
  'rest-list-column-identifier': 'Tunniste',
  'rest-list-column-last-modified': 'Viimeksi muokattu',
  'rest-list-column-type': 'Tyyppi',
  'rest-list-column-url': 'URL',
  'rest-list-confirm-disable-$count': (count) => {
    let sources = cardinal(count, 'tämän tietolähteen', 'nämä 2 tietolähdettä');
    return `Haluatko varmasti deaktivoida ${sources}?`;
  },
  'rest-list-confirm-reactivate-$count': (count) => {
    let sources = cardinal(count, 'tämän tietolähteen', 'nämä 2 tietolähdettä');
    return `Haluatko varmasti aktivoida ${sources} uudelleen?`;
  },
  'rest-list-edit': 'Muokkaa lähdeluetteloa',
  'rest-list-save': 'Tallenna lähdeluettelo',
  'rest-list-status-deleted': 'Poistettu',
  'rest-list-status-disabled': 'Deaktivoitu',
  'rest-list-title': 'REST-tietolähteet',

  'rest-summary-$title': (title) => {
    let text = 'REST-tietolähte';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'rest-summary-add': 'Lisää uusi tietolähde',
  'rest-summary-cancel': 'Peruutta',
  'rest-summary-confirm-delete': 'Haluatko varmasti poistaa tämän tietolähteen?',
  'rest-summary-confirm-disable': 'Haluatko varmasti deaktivoida tämän tietolähteen?',
  'rest-summary-confirm-reactivate': 'Haluatko varmasti aktivoida tämän tietolähteen uudelleen?',
  'rest-summary-delete': 'Poista tietolähde',
  'rest-summary-description': 'Kuvaus',
  'rest-summary-disable': 'Deaktivoi tietolähde',
  'rest-summary-edit': 'Muokkaa tietolähde',
  'rest-summary-max-age': 'Enimmäisikä',
  'rest-summary-name': 'Tunniste',
  'rest-summary-reactivate': 'Reaktivoi tietolähde',
  'rest-summary-return': 'Palaa lähdeluetteloon',
  'rest-summary-save': 'Tallenna tietolähde',
  'rest-summary-type': 'Typpi',
  'rest-summary-url': 'URL',

  'rest-type-generic': 'Yleinen',
  'rest-type-wordpress': 'WordPress',

  'role-list-add': 'Lisää uusi rooli',
  'role-list-cancel': 'Peruutta',
  'role-list-column-last-modified': 'Viimeksi muokattu',
  'role-list-column-title': 'Nimi',
  'role-list-column-users': 'Käyttäjät',
  'role-list-confirm-disable-$count': (count) => {
    let roles = cardinal(count, 'tämän roolin', 'nämä 2 roolia');
    return `Haluatko varmasti deaktivoida ${roles}?`;
  },
  'role-list-confirm-reactivate-$count': (count) => {
    let roles = cardinal(count, 'tämän roolin', 'nämä 2 roolia');
    return `Haluatko varmasti reaktivoida ${roles}?`;
  },
  'role-list-edit': 'Muokkaa rooliluetteloa',
  'role-list-save': 'Tallenna rooliluettelo',
  'role-list-status-deleted': 'Poistettu',
  'role-list-status-disabled': 'Deaktivoitu',
  'role-list-title': 'Roolit',

  'role-summary-$title': (title) => {
    let text = 'Rooli';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'role-summary-add': 'Lisää uusi rooli',
  'role-summary-cancel': 'Peruutta',
  'role-summary-confirm-delete': 'Haluatko varmasti poistaa tämän roolin?',
  'role-summary-confirm-disable': 'Haluatko varmasti deaktivoida tämän roolin?',
  'role-summary-confirm-reactivate': 'Haluatko varmasti reaktivoida tämän roolin?',
  'role-summary-delete': 'Poista rooli',
  'role-summary-description': 'Kuvaus',
  'role-summary-disable': 'Deaktivoi roolin',
  'role-summary-edit': 'Muokkaa roolia',
  'role-summary-name': 'Tunniste',
  'role-summary-rating': 'Tarinan prioriteetti',
  'role-summary-rating-high': 'Korkea',
  'role-summary-rating-low': 'Matala',
  'role-summary-rating-normal': 'Normaali',
  'role-summary-rating-very-high': 'Erittäin korkea',
  'role-summary-rating-very-low': 'Erittäin matala',
  'role-summary-reactivate': 'Reaktivoi roolin',
  'role-summary-return': 'Palaa rooliluetteloon',
  'role-summary-save': 'Tallenna roolin',
  'role-summary-title': 'Nimi',
  'role-summary-users': 'Käyttäjät',

  'role-tooltip-$count-others': (count) => {
    return cardinal(count, '1 muu', '2 muuta');
  },

  'server-list-add': 'Lisää uusi palvelin',
  'server-list-api-access-false': '',
  'server-list-api-access-true': 'Hankittu',
  'server-list-cancel': 'Peruutta',
  'server-list-column-api-access': 'API-käyttöoikeus',
  'server-list-column-last-modified': 'Viimeksi muokattu',
  'server-list-column-oauth': 'OAuth-todennus',
  'server-list-column-title': 'Nimi',
  'server-list-column-type': 'Tyyppi',
  'server-list-column-users': 'Käyttäjät',
  'server-list-confirm-disable-$count': (count) => {
    let servers = cardinal(count, 'tämän palvelin', 'nämä 2 palvelinta');
    return `Haluatko varmasti deaktivoida ${servers}?`;
  },
  'server-list-confirm-reactivate-$count': (count) => {
    let servers = cardinal(count, 'tämän palvelin', 'nämä 2 palvelinta');
    return `Haluatko varmasti reaktivoida ${servers}?`;
  },
  'server-list-edit': 'Muokkaa palvelinluetteloa',
  'server-list-oauth-false': '',
  'server-list-oauth-true': 'Käytössä',
  'server-list-save': 'Tallenna palvelinluetteloa',
  'server-list-status-deleted': 'Poistettu',
  'server-list-status-disabled': 'Deaktivoitu',
  'server-list-title': 'Palvelimet',

  'server-summary-acquire': 'Hanki API-käyttöoikeus',
  'server-summary-activities': 'Toiminta',
  'server-summary-add': 'Lisää uusi palvelin',
  'server-summary-api-access': 'API-käyttöoikeus',
  'server-summary-api-access-acquired': 'Ylläpitäjän käyttöoikeudet hankittu',
  'server-summary-api-access-not-applicable': 'Ei sovellettavissa',
  'server-summary-api-access-pending': 'Odotetaan käyttäjän toimia',
  'server-summary-cancel': 'Peruutta',
  'server-summary-confirm-delete': 'Haluatko varmasti poistaa tämän palvelin?',
  'server-summary-confirm-disable': 'Haluatko varmasti deaktivoida tämän palvelin?',
  'server-summary-confirm-reactivate': 'Haluatko varmasti reaktivoida tämän palvelin',
  'server-summary-delete': 'Poista palvelin',
  'server-summary-disable': 'Deaktivoi palvelin',
  'server-summary-edit': 'Muokkaa palvelinta',
  'server-summary-gitlab-admin': 'GitLab-järjestelmänvalvoja',
  'server-summary-gitlab-external-user': 'GitLab ulkoinen käyttäjä',
  'server-summary-gitlab-regular-user': 'GitLab tavallinen käyttäjä',
  'server-summary-member-$name': (name) => {
    return `Palvelin: ${name}`;
  },
  'server-summary-name': 'Tunniste',
  'server-summary-new-user': 'Uusi käyttäjä',
  'server-summary-new-users': 'Uudet käyttäjät',
  'server-summary-oauth-app-id': 'Sovellustunnus',
  'server-summary-oauth-app-key': 'Sovellusavain',
  'server-summary-oauth-app-secret': 'Sovellussalaisuus',
  'server-summary-oauth-application-id': 'Sovellustunnus',
  'server-summary-oauth-application-secret': 'Sovellussalaisuus',
  'server-summary-oauth-callback-url': 'Palautus-URL',
  'server-summary-oauth-client-id': 'Asiakastunnus',
  'server-summary-oauth-client-secret': 'Asiakkaan salaisuus',
  'server-summary-oauth-deauthorize-callback-url': 'Luvan peruutus-URL',
  'server-summary-oauth-gitlab-url': 'GitLab-URL',
  'server-summary-oauth-redirect-uri': 'Uudelleenohjaus-URI',
  'server-summary-oauth-redirect-url': 'Uudelleenohjaus-URL',
  'server-summary-oauth-site-url': 'Sivuston URL-osoite',
  'server-summary-privacy-policy-url': 'Tietosuojakäytännön URL',
  'server-summary-reactivate': 'Reaktivoi palvelin',
  'server-summary-return': 'Palaa palvelinluetteloon',
  'server-summary-role-none': 'Älä anna rooleja uusille käyttäjille',
  'server-summary-roles': 'Roolin osoittaminen',
  'server-summary-save': 'Tallenna palvelin',
  'server-summary-system-address-missing': 'Järjestelmän osoite ei ole asetettu',
  'server-summary-terms-and-conditions-url': 'Käyttöehdot URL',
  'server-summary-test-oauth': 'Testa OAuth-integraatio',
  'server-summary-title': 'Nimi',
  'server-summary-type': 'Palvelintyyppi',
  'server-summary-user-automatic-approval': 'Hyväksy uusia käyttäjiä automaattisesti',
  'server-summary-user-import-disabled': 'Älä rekisteröi uusia käyttäjiä',
  'server-summary-user-import-gitlab-admin-disabled': 'Älä tuota GitLab-järjestelmänvalvojia',
  'server-summary-user-import-gitlab-external-user-disabled': 'Älä tuota GitLabin ulkopuolisia käyttäjiä',
  'server-summary-user-import-gitlab-user-disabled': 'Älä tuota GitLab-käyttäjiä',
  'server-summary-user-type-admin': 'Järjestelmänvalvoja',
  'server-summary-user-type-guest': 'Vieraskäyttäjä',
  'server-summary-user-type-moderator': 'Sovittelija',
  'server-summary-user-type-regular': 'Tavallinen käyttäjä',
  'server-summary-whitelist': 'Sähköpostiosoitteen sallittujen luetteloiden luettelo',

  'server-type-dropbox': 'Dropbox',
  'server-type-facebook': 'Facebook',
  'server-type-github': 'GitHub',
  'server-type-gitlab': 'GitLab',
  'server-type-google': 'Google',
  'server-type-windows': 'Windows Live',

  'settings-background-image': 'Taustakuva',
  'settings-cancel': 'Peruutta',
  'settings-company-name': 'Yrityksen nimi',
  'settings-edit': 'Muokkaa asetuksia',
  'settings-input-languages': 'Tulkkauskielet',
  'settings-push-relay': 'Push-viestirele',
  'settings-save': 'Tallenna asetukset',
  'settings-site-address': 'Osoite',
  'settings-site-description': 'Kuvaus',
  'settings-site-title': 'Sivuston nimi',
  'settings-title': 'Asetukset',

  'sign-in-$title': (title) => {
    let text = `Kirjaudu sisään`;
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'sign-in-error-access-denied': 'Hakuhakemus hylättiin',
  'sign-in-error-account-disabled': 'Tili on tällä hetkellä poissa käytöstä',
  'sign-in-error-existing-users-only': 'Ainoastaan valtuutettu henkilöstö voi käyttää tätä järjestelmää',
  'sign-in-error-restricted-area': 'Käyttäjä ei ole järjestelmänvalvoja',
  'sign-in-oauth': 'Kirjaudu OAuthin kautta',
  'sign-in-password': 'Salasana:',
  'sign-in-problem-incorrect-username-password': 'Väärä käyttäjätunnus tai salasana',
  'sign-in-problem-no-support-for-username-password': 'Järjestelmä ei hyväksy salasanaa',
  'sign-in-problem-unexpected-error': 'Odottamaton virhe',
  'sign-in-submit': 'Kirjaudu sisään',
  'sign-in-username': 'Käyttäjätunnus:',

  'sign-off-menu-sign-off': 'Kirjaudu ulos',

  'spreadsheet-list-add': 'Lisää uusi linkki',
  'spreadsheet-list-cancel': 'Peruutta',
  'spreadsheet-list-column-filename': 'Tiedoston nimi',
  'spreadsheet-list-column-last-modified': 'Viimeksi muokattu',
  'spreadsheet-list-column-sheets': 'Arkkia',
  'spreadsheet-list-column-url': 'URL',
  'spreadsheet-list-confirm-disable-$count': (count) => {
    let spreadsheets = cardinal(count, 'tämän linkin', 'nämä linkit');
    return `Haluatko varmasti deaktivoida ${spreadsheets}?`;
  },
  'spreadsheet-list-confirm-reactivate-$count': (count) => {
    let spreadsheets = cardinal(count, 'tämän linkin', 'nämä linkit');
    return `Haluatko varmasti aktivoida ${spreadsheets} uudelleen?`;
  },
  'spreadsheet-list-edit': 'Muokkaa linkkiluetteloa',
  'spreadsheet-list-save': 'Tallenna linkkiluettelo',
  'spreadsheet-list-status-deleted': 'Poistettu',
  'spreadsheet-list-status-disabled': 'Deaktivoitu',
  'spreadsheet-list-title': 'Excel-tiedostot',

  'spreadsheet-summary-$title': (title) => {
    let text = 'Excel-tiedosto';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'spreadsheet-summary-add': 'Lisää uusi linkki',
  'spreadsheet-summary-cancel': 'Peruutta',
  'spreadsheet-summary-confirm-delete': 'Haluatko varmasti poistaa tämän linkin?',
  'spreadsheet-summary-confirm-disable': 'Haluatko varmasti deaktivoida tämän linkin?',
  'spreadsheet-summary-confirm-reactivate': 'Haluatko varmasti aktivoida tämän linkin uudelleen?',
  'spreadsheet-summary-delete': 'Poista linkki',
  'spreadsheet-summary-description': 'Kuvaus',
  'spreadsheet-summary-disable': 'Deaktivoi linkki',
  'spreadsheet-summary-edit': 'Muokkaa linkkiä',
  'spreadsheet-summary-filename': 'Tiedoston nimi',
  'spreadsheet-summary-hidden': 'Hakutoiminto',
  'spreadsheet-summary-hidden-false': 'Näkyy hakutuloksissa',
  'spreadsheet-summary-hidden-true': 'Piilotettu hakutoiminnolta',
  'spreadsheet-summary-name': 'Tunniste',
  'spreadsheet-summary-reactivate': 'Reaktivoi linkki',
  'spreadsheet-summary-return': 'Palaa linkkiluetteloon',
  'spreadsheet-summary-save': 'Tallenna linkki',
  'spreadsheet-summary-sheet-$number-$name': (number, name) => {
    let text = `Arkki ${number}`;
    if (name) {
      text += `: ${name}`;
    }
    return text;
  },
  'spreadsheet-summary-title': 'Otsikko',
  'spreadsheet-summary-url': 'URL',

  'task-$seconds': (seconds) => {
    return (seconds === 1) ? `1 sekunti` : `${seconds} sekuntia`;
  },
  'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 commitin kommentti', '2 commitin kommenttia');
    return `Tuotu ${comments} arkistosta “${repo}”`;
  },
  'task-imported-$count-events-from-$repo': (count, repo) => {
    let events = cardinal(count, '1 tapahtuma', '2 tapahtumat');
    return `Tuotu ${events} arkistosta “${repo}”`;
  },
  'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 asian kommentti', '2 asian kommenttia');
    return `Tuotu ${comments} arkistosta “${repo}”`;
  },
  'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 yhdistämispyynnön kommentti', '2 yhdistämispyynnön kommenttia');
    return `Tuotu ${comments} arkistosta “${repo}”`;
  },
  'task-imported-$count-repos': (count) => {
    let repos = cardinal(count, '1 arkisto', '2 arkistoa');
    return `Tuotu ${repos}`;
  },
  'task-imported-$count-users': (count) => {
    let users = cardinal(count, '1 käyttäjä', '2 käyttäjää');
    return `Tuotu ${users}`;
  },
  'task-imported-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wiki-sivu', '2 wiki-sivua');
    return `Tuotu ${wikis}`;
  },
  'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
    let commits = cardinal(count, '1 commiti', '2 commitia');
    return `Tuotu työntö jossa ${commits} haarasta “${branch}” arkiston “${repo}”`;
  },
  'task-importing-commit-comments-from-$repo': (repo) => {
    return `Tuoda commitin kommentteja arkistosta “${repo}”`;
  },
  'task-importing-events-from-$repo': (repo) => {
    return `Tuoda tapahtumia arkistosta “${repo}”`;
  },
  'task-importing-issue-comments-from-$repo': (repo) => {
    return `Tuoda asian kommentteja arkistosta “${repo}”`;
  },
  'task-importing-merge-request-comments-from-$repo': (repo) => {
    return `Tuoda yhdistämispyynnön kommentteja arkistosta “${repo}”`;
  },
  'task-importing-push-from-$repo': (repo) => {
    return `Tuoda työntöä arkistosta “${repo}”`;
  },
  'task-importing-repos': 'Tuodaan arkistot',
  'task-importing-users': 'Tuodaan käyttäjät',
  'task-importing-wikis': 'Tuodaan wiki-sivut',
  'task-installed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 koukku', '2 koukkua');
    return `Asennettu ${hooks}`;
  },
  'task-installing-hooks': 'Asentamalla koukut',
  'task-removed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 koukku', '2 koukkua');
    return `Poistetut ${hooks}`;
  },
  'task-removed-$count-repos': (count) => {
    let repos = cardinal(count, '1 arkisto', '2 arkistoa');
    return `Poistetut ${repos}`;
  },
  'task-removed-$count-users': (count) => {
    let users = cardinal(count, '1 käyttäjä', '2 käyttäjää');
    return `Poistetut ${users}`;
  },
  'task-removed-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wiki-sivu', '2 wiki-sivua');
    return `Poistetut ${wikis}`;
  },
  'task-removing-hooks': 'Poistamalla koukut',
  'task-updated-$count-repos': (count) => {
    let repos = cardinal(count, '1 arkisto', '2 arkistoa');
    return `Päivitetty ${repos}`;
  },
  'task-updated-$count-users': (count) => {
    let users = cardinal(count, '1 käyttäjä', '2 käyttäjää');
    return `Päivitetty ${users}`;
  },
  'task-updated-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 wiki-sivu', '2 wiki-sivua');
    return `Päivitetty ${wikis}`;
  },

  'text-field-placeholder-none': 'ei mitään',

  'tooltip-$first-and-$tooltip': (first, tooltip) => {
    return [ first, ' ja ', tooltip ];
  },
  'tooltip-more': 'Lisää',

  'tz-name-abidjan': 'Abidjan',
  'tz-name-accra': 'Accra',
  'tz-name-acre': 'Acre',
  'tz-name-act': 'Australian pääkaupunkialue',
  'tz-name-adak': 'Adak',
  'tz-name-addis-ababa': 'Addis Abeba',
  'tz-name-adelaide': 'Adelaide',
  'tz-name-aden': 'Aden',
  'tz-name-africa': 'Afrikka',
  'tz-name-alaska': 'Alaska',
  'tz-name-aleutian': 'Aleutin saaret',
  'tz-name-algiers': 'Alger',
  'tz-name-almaty': 'Almaty',
  'tz-name-america': 'Amerikka',
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
  'tz-name-arctic': 'Arktinen',
  'tz-name-argentina': 'Argentiina',
  'tz-name-arizona': 'Arizona',
  'tz-name-aruba': 'Aruba',
  'tz-name-ashgabat': 'Ashgabat',
  'tz-name-ashkhabad': 'Ashkhabad',
  'tz-name-asia': 'Aasia',
  'tz-name-asmara': 'Asmara',
  'tz-name-asmera': 'Asmera',
  'tz-name-astrakhan': 'Astrakaani',
  'tz-name-asuncion': 'Asuncion',
  'tz-name-athens': 'Ateena',
  'tz-name-atikokan': 'Atikokan',
  'tz-name-atka': 'Atka',
  'tz-name-atlantic': 'atlantin',
  'tz-name-atyrau': 'Atyrau',
  'tz-name-auckland': 'Auckland',
  'tz-name-australia': 'Australia',
  'tz-name-azores': 'Azorit',
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
  'tz-name-berlin': 'Berliini',
  'tz-name-bermuda': 'Bermuda',
  'tz-name-beulah': 'Beulah',
  'tz-name-bishkek': 'Bishkek',
  'tz-name-bissau': 'Bissau',
  'tz-name-blanc-sablon': 'Blanc Sablon',
  'tz-name-blantyre': 'Blantyre',
  'tz-name-boa-vista': 'Boa Vista',
  'tz-name-bogota': 'Bogota',
  'tz-name-boise': 'Boise',
  'tz-name-bougainville': 'Bougainville',
  'tz-name-bratislava': 'Bratislava',
  'tz-name-brazil': 'Brasilia',
  'tz-name-brazzaville': 'Brazzaville',
  'tz-name-brisbane': 'Brisbane',
  'tz-name-broken-hill': 'Broken Hill',
  'tz-name-brunei': 'Brunei',
  'tz-name-brussels': 'Bryssel',
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
  'tz-name-canary': 'Kanarian saaret',
  'tz-name-canberra': 'Canberra',
  'tz-name-cancun': 'Cancun',
  'tz-name-cape-verde': 'Kap Verde',
  'tz-name-caracas': 'Caracas',
  'tz-name-casablanca': 'Casablanca',
  'tz-name-casey': 'Casey',
  'tz-name-catamarca': 'Catamarca',
  'tz-name-cayenne': 'Cayenne',
  'tz-name-cayman': 'Kaimaani',
  'tz-name-center': 'Keskusta',
  'tz-name-central': 'Keskeinen',
  'tz-name-ceuta': 'Ceutan',
  'tz-name-chagos': 'Chagos',
  'tz-name-chatham': 'Chatham',
  'tz-name-chicago': 'Chicago',
  'tz-name-chihuahua': 'Chihuahua',
  'tz-name-chile': 'Chile',
  'tz-name-chisinau': 'Chisinau',
  'tz-name-chita': 'Chita',
  'tz-name-choibalsan': 'Choibalsan',
  'tz-name-chongqing': 'Chongqing',
  'tz-name-christmas': 'Joulusaari',
  'tz-name-chungking': 'Chungking',
  'tz-name-chuuk': 'Chuukin',
  'tz-name-cocos': 'Kookossaaret',
  'tz-name-colombo': 'Colombo',
  'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
  'tz-name-comoro': 'Comoro',
  'tz-name-conakry': 'Conakry',
  'tz-name-continental': 'Mannermainen',
  'tz-name-copenhagen': 'Kööpenhamina',
  'tz-name-coral-harbour': 'Coral Harbour',
  'tz-name-cordoba': 'Cordoba',
  'tz-name-costa-rica': 'Costa Rica',
  'tz-name-creston': 'Creston',
  'tz-name-cuiaba': 'Cuiaba',
  'tz-name-curacao': 'Curacao',
  'tz-name-currie': 'Currie',
  'tz-name-dacca': 'Dhaka',
  'tz-name-dakar': 'Dakar',
  'tz-name-damascus': 'Damaskos',
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
  'tz-name-djibouti': 'Djibouti',
  'tz-name-dominica': 'dominica',
  'tz-name-douala': 'Douala',
  'tz-name-dubai': 'Dubai',
  'tz-name-dublin': 'Dublin',
  'tz-name-dumont-d-urville': 'Dumont d’Urville',
  'tz-name-dushanbe': 'Dushanbe',
  'tz-name-east': 'Itään',
  'tz-name-east-indiana': 'Itä-Indiana',
  'tz-name-easter': 'Pääsiäissaari',
  'tz-name-easter-island': 'Pääsiäissaari',
  'tz-name-eastern': 'Itäinen',
  'tz-name-edmonton': 'Edmonton',
  'tz-name-efate': 'Efate',
  'tz-name-eirunepe': 'Eirunepe',
  'tz-name-el-aaiun': 'El Aaiun',
  'tz-name-el-salvador': 'El Salvador',
  'tz-name-enderbury': 'Enderbury',
  'tz-name-ensenada': 'Ensenada',
  'tz-name-eucla': 'Eucla',
  'tz-name-europe': 'Eurooppa',
  'tz-name-faeroe': 'Färsaaret',
  'tz-name-fakaofo': 'Fakaofo',
  'tz-name-famagusta': 'Famagusta',
  'tz-name-faroe': 'Färsaaret',
  'tz-name-fiji': 'Fidži',
  'tz-name-fort-nelson': 'Fort Nelson',
  'tz-name-fort-wayne': 'Fort Wayne',
  'tz-name-fortaleza': 'Fortaleza',
  'tz-name-freetown': 'Freetown',
  'tz-name-funafuti': 'Funafuti',
  'tz-name-gaborone': 'Gaborone',
  'tz-name-galapagos': 'Galapagos',
  'tz-name-gambier': 'Gambier',
  'tz-name-gaza': 'Gaza',
  'tz-name-general': 'Yleinen',
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
  'tz-name-havana': 'Havana',
  'tz-name-hawaii': 'Havaiji',
  'tz-name-hebron': 'Hebron',
  'tz-name-helsinki': 'Helsinki',
  'tz-name-hermosillo': 'Hermosillo',
  'tz-name-ho-chi-minh': 'Ho Chi Minh',
  'tz-name-hobart': 'Hobart',
  'tz-name-hong-kong': 'Hong Kong',
  'tz-name-honolulu': 'Honolulu',
  'tz-name-hovd': 'Hovd',
  'tz-name-indian': 'Intian valtameri',
  'tz-name-indiana': 'Indiana',
  'tz-name-indiana-starke': 'Indiana-Starke',
  'tz-name-indianapolis': 'Indianapolis',
  'tz-name-inuvik': 'Inuvik',
  'tz-name-iqaluit': 'Iqaluit',
  'tz-name-irkutsk': 'Irkutsk',
  'tz-name-isle-of-man': 'Mansaari',
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
  'tz-name-kamchatka': 'Kamchatka',
  'tz-name-kampala': 'Kampala',
  'tz-name-karachi': 'Karachi',
  'tz-name-kashgar': 'Kashgarin',
  'tz-name-kathmandu': 'Kathmandu',
  'tz-name-katmandu': 'Katmandu',
  'tz-name-kentucky': 'Kentucky',
  'tz-name-kerguelen': 'Kerguelen',
  'tz-name-khandyga': 'Handyga',
  'tz-name-khartoum': 'Khartum',
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
  'tz-name-krasnoyarsk': 'Krasnojarskin',
  'tz-name-kuala-lumpur': 'Kuala Lumpur',
  'tz-name-kuching': 'Kuching',
  'tz-name-kuwait': 'Kuwait',
  'tz-name-kwajalein': 'Kwajalein',
  'tz-name-la-paz': 'La Paz',
  'tz-name-la-rioja': 'La Rioja',
  'tz-name-lagos': 'Lagos',
  'tz-name-lhi': 'Lord Howe Island',
  'tz-name-libreville': 'Librevillessä',
  'tz-name-lima': 'Lima',
  'tz-name-lindeman': 'Lindeman',
  'tz-name-lisbon': 'Lissabon',
  'tz-name-ljubljana': 'Ljubljana',
  'tz-name-lome': 'Lome',
  'tz-name-london': 'Lontoo',
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
  'tz-name-macau': 'Macao',
  'tz-name-maceio': 'Maceio',
  'tz-name-macquarie': 'Macquarie',
  'tz-name-madeira': 'Madeira',
  'tz-name-madrid': 'Madrid',
  'tz-name-magadan': 'Magadanin',
  'tz-name-mahe': 'Mahe',
  'tz-name-majuro': 'Majuro',
  'tz-name-makassar': 'Makassar',
  'tz-name-malabo': 'Malabo',
  'tz-name-maldives': 'Malediivit',
  'tz-name-malta': 'Malta',
  'tz-name-managua': 'Managua',
  'tz-name-manaus': 'Manaus',
  'tz-name-manila': 'Manilla',
  'tz-name-maputo': 'Maputo',
  'tz-name-marengo': 'Marengo',
  'tz-name-mariehamn': 'Maarianhamina',
  'tz-name-marigot': 'Marigot',
  'tz-name-marquesas': 'Marquesas',
  'tz-name-martinique': 'Martinique',
  'tz-name-maseru': 'Maserussa',
  'tz-name-matamoros': 'Matamoros',
  'tz-name-mauritius': 'Mauritius',
  'tz-name-mawson': 'Mawson',
  'tz-name-mayotte': 'Mayotten',
  'tz-name-mazatlan': 'Mazatlan',
  'tz-name-mbabane': 'Mbabane',
  'tz-name-mc-murdo': 'McMurdo',
  'tz-name-melbourne': 'Melbourne',
  'tz-name-mendoza': 'Mendoza',
  'tz-name-menominee': 'Menominee',
  'tz-name-merida': 'Merida',
  'tz-name-metlakatla': 'Metlakatla',
  'tz-name-mexico': 'Meksiko',
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
  'tz-name-moscow': 'Moskova',
  'tz-name-mountain': 'Vuori',
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
  'tz-name-north': 'Pohjoinen',
  'tz-name-north-dakota': 'Pohjois-Dakota',
  'tz-name-nouakchott': 'Nouakchottin',
  'tz-name-noumea': 'Noumea',
  'tz-name-novokuznetsk': 'Novokuznetsk',
  'tz-name-novosibirsk': 'Novosibirsk',
  'tz-name-nsw': 'Uusi Etelä-Wales',
  'tz-name-ojinaga': 'Ojinaga',
  'tz-name-omsk': 'Omsk',
  'tz-name-oral': 'Uralsk',
  'tz-name-oslo': 'Oslo',
  'tz-name-ouagadougou': 'Ouagadougou',
  'tz-name-pacific': 'Tyynenmeren',
  'tz-name-pacific-new': 'Tyynenmeren-Uusi',
  'tz-name-pago-pago': 'Pago Pago',
  'tz-name-palau': 'Palau',
  'tz-name-palmer': 'Palmer',
  'tz-name-panama': 'Panama',
  'tz-name-pangnirtung': 'Pangnirtung',
  'tz-name-paramaribo': 'Paramaribo',
  'tz-name-paris': 'Pariisi',
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
  'tz-name-pyongyang': 'Pjongjang',
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
  'tz-name-resolute': 'Päättäväinen',
  'tz-name-reunion': 'Réunion',
  'tz-name-reykjavik': 'Reykjavik',
  'tz-name-riga': 'Riika',
  'tz-name-rio-branco': 'Rio Branco',
  'tz-name-rio-gallegos': 'Rio Gallegos',
  'tz-name-riyadh': 'Riad',
  'tz-name-rome': 'Rooma',
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
  'tz-name-sao-paulo': 'Sao Paulo',
  'tz-name-sao-tome': 'Sao Tome',
  'tz-name-sarajevo': 'Sarajevo',
  'tz-name-saratov': 'Saratov',
  'tz-name-saskatchewan': 'Saskatchewan',
  'tz-name-scoresbysund': 'Scoresbysund',
  'tz-name-seoul': 'Soul',
  'tz-name-shanghai': 'Shanghai',
  'tz-name-shiprock': 'Shiprock',
  'tz-name-simferopol': 'Simferopol',
  'tz-name-singapore': 'Singapore',
  'tz-name-sitka': 'Sitka',
  'tz-name-skopje': 'Skopje',
  'tz-name-sofia': 'Sofia',
  'tz-name-south': 'Etelä',
  'tz-name-south-georgia': 'Etelä-Georgia',
  'tz-name-south-pole': 'Etelänapa',
  'tz-name-srednekolymsk': 'Srednekolymsk',
  'tz-name-st-barthelemy': 'St Barthelemy',
  'tz-name-st-helena': 'St Helena',
  'tz-name-st-johns': 'St Johns',
  'tz-name-st-kitts': 'St Kitts',
  'tz-name-st-lucia': 'St Lucia',
  'tz-name-st-thomas': 'St Thomas',
  'tz-name-st-vincent': 'St Vincent',
  'tz-name-stanley': 'Stanley',
  'tz-name-stockholm': 'Tukholma',
  'tz-name-swift-current': 'Swift Current',
  'tz-name-sydney': 'Sydney',
  'tz-name-syowa': 'Syowa',
  'tz-name-tahiti': 'Tahiti',
  'tz-name-taipei': 'Taipei',
  'tz-name-tallinn': 'Tallinna',
  'tz-name-tarawa': 'Tarawa',
  'tz-name-tashkent': 'Tashkent',
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
  'tz-name-tirane': 'Tirane',
  'tz-name-tiraspol': 'Tiraspol',
  'tz-name-tokyo': 'Tokio',
  'tz-name-tomsk': 'Tomsk',
  'tz-name-tongatapu': 'Tongatapu',
  'tz-name-toronto': 'Toronto',
  'tz-name-tortola': 'Tortola',
  'tz-name-tripoli': 'Tripoli',
  'tz-name-troll': 'Peikko',
  'tz-name-truk': 'Truk',
  'tz-name-tucuman': 'Tucuman',
  'tz-name-tunis': 'Tunis',
  'tz-name-ujung-pandang': 'Ujung Pandang',
  'tz-name-ulaanbaatar': 'Ulaanbaatar',
  'tz-name-ulan-bator': 'Ulan Bator',
  'tz-name-ulyanovsk': 'Ulyanovsk',
  'tz-name-urumqi': 'Urumqi',
  'tz-name-us': 'Yhdysvallat',
  'tz-name-ushuaia': 'Ushuaia',
  'tz-name-ust-nera': 'Ust-Nera',
  'tz-name-uzhgorod': 'Uzhgorod',
  'tz-name-vaduz': 'Vaduz',
  'tz-name-vancouver': 'Vancouver',
  'tz-name-vatican': 'Vatikaani',
  'tz-name-vevay': 'Vevay',
  'tz-name-victoria': 'Victoria',
  'tz-name-vienna': 'Wien',
  'tz-name-vientiane': 'Vientiane',
  'tz-name-vilnius': 'Vilna',
  'tz-name-vincennes': 'Vincennes',
  'tz-name-virgin': 'Neitsytsaaret',
  'tz-name-vladivostok': 'Vladivostok',
  'tz-name-volgograd': 'Volgograd',
  'tz-name-vostok': 'Vostok',
  'tz-name-wake': 'Wake Island',
  'tz-name-wallis': 'Wallis',
  'tz-name-warsaw': 'Varsova',
  'tz-name-west': 'Länsi',
  'tz-name-whitehorse': 'Whitehorse',
  'tz-name-winamac': 'Winamac',
  'tz-name-windhoek': 'Windhoek',
  'tz-name-winnipeg': 'Winnipeg',
  'tz-name-yakutat': 'Yakutat',
  'tz-name-yakutsk': 'Jakutsk',
  'tz-name-yancowinna': 'Yancowinna',
  'tz-name-yangon': 'Yangon',
  'tz-name-yap': 'Yap',
  'tz-name-yekaterinburg': 'Jekaterinburg',
  'tz-name-yellowknife': 'Yellowknife',
  'tz-name-yerevan': 'Jerevan',
  'tz-name-yukon': 'Yukon',
  'tz-name-zagreb': 'Zagreb',
  'tz-name-zaporozhye': 'Zaporozhye',
  'tz-name-zurich': 'Zurich',

  'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
    let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
    return `Lataaminen ${files}, ${size} jäljellä`;
  },

  'user-list-add': 'Lisää uusi käyttäjä',
  'user-list-approve-all': 'Hyväksy kaikki pyynnöt',
  'user-list-cancel': 'Peruutta',

  'user-list-column-email': 'E-mail',
  'user-list-column-last-modified': 'Last modified',
  'user-list-column-name': 'Name',
  'user-list-column-projects': 'Projects',
  'user-list-column-roles': 'Roles',
  'user-list-column-type': 'Type',

  'user-list-column-email': 'Sähköpostiosoite',
  'user-list-column-last-modified': 'Viimeksi muokattu',
  'user-list-column-name': 'Nimi',
  'user-list-column-projects': 'Projektit',
  'user-list-column-roles': 'Roolit',
  'user-list-column-type': 'Tyyppi',
  'user-list-column-username': 'Käyttäjänimi',
  'user-list-confirm-disable-$count': (count) => {
    let accounts = cardinal(count, 'tämän käyttäjätili', 'nämä 2 käyttäjätilejä');
    return `Haluatko varmasti deaktivoida ${accounts}?`;
  },
  'user-list-confirm-reactivate-$count': (count) => {
    let accounts = cardinal(count, 'tämän käyttäjätili', 'nämä 2 käyttäjätilejä');
    return `Haluatko varmasti reaktivoida ${accounts}?`;
  },
  'user-list-edit': 'Muokkaa käyttäjäluetteloa',
  'user-list-reject-all': 'Hylkää kaikki pyynnöt',
  'user-list-save': 'Tallenna käyttäjäluettelo',
  'user-list-status-deleted': 'Poistettu',
  'user-list-status-disabled': 'Tili deaktivoitu',
  'user-list-status-pending': 'Hyväksyntä vireillä',
  'user-list-title': 'Käyttäjät',
  'user-list-type-admin': 'Järjestelmänvalvoja',
  'user-list-type-guest': 'Vieraskäyttäjä',
  'user-list-type-moderator': 'Sovittelija',
  'user-list-type-regular': 'Tavallinen käyttäjä',
  'user-summary-$name': (name) => {
    let text = 'Käyttäjä';
    if (name) {
      text += `: ${name}`;
    }
    return text;
  },
  'user-summary-add': 'Lisää uusi käyttäjä',
  'user-summary-cancel': 'Peruutta',
  'user-summary-confirm-delete': 'Haluatko varmasti poistaa tämän käyttäjätili?',
  'user-summary-confirm-disable': 'Haluatko varmasti deaktivoida tämän käyttäjätili?',
  'user-summary-confirm-reactivate': 'Haluatko varmasti reaktivoida tämän käyttäjätili?',
  'user-summary-delete': 'Poista käyttäjätili',
  'user-summary-disable': 'Deaktivoi käyttäjätili',
  'user-summary-edit': 'Muokkaa käyttäjää',
  'user-summary-email': 'Sähköpostiosoite',
  'user-summary-github': 'GitHub-profiilin URL-osoite',
  'user-summary-gitlab': 'GitLab-profiilin URL-osoite',
  'user-summary-ichat': 'iChat-käyttäjänimi',
  'user-summary-linkedin': 'LinkedIn-profiilin URL-osoite',
  'user-summary-member-$name': (name) => {
    let text = 'Jäsen';
    if (name) {
      text += `: ${name}`;
    }
    return text;
  },
  'user-summary-member-edit': 'Muokkaa jäsentä',
  'user-summary-member-return': 'Palaa jäsenluetteloon',
  'user-summary-member-save': 'Tallenna jäsen',
  'user-summary-name': 'Nimi',
  'user-summary-phone': 'Puhelinnumero',
  'user-summary-profile-image': 'Profiilikuva',
  'user-summary-reactivate': 'Reaktivoi käyttäjätili',
  'user-summary-remove-membership': 'Poista käyttäjä projektista',
  'user-summary-restore-membership': 'Lisää käyttäjä projektiin',
  'user-summary-return': 'Palaa käyttäjäluetteloon',
  'user-summary-role-none': 'Ei mitään',
  'user-summary-roles': 'Roolit',
  'user-summary-save': 'Tallenna käyttäjä',
  'user-summary-skype': 'Skype-käyttäjänimi',
  'user-summary-slack': 'Slack-käyttäjätunniste',
  'user-summary-slack-team': 'Slack-ryhmätunniste',
  'user-summary-social-links': 'Social links',
  'user-summary-stackoverflow': 'StackOverflow-profiilin URL-osoite',
  'user-summary-statistics': 'Toiminta',
  'user-summary-twitter': 'Twitter-käyttäjänimi',
  'user-summary-type': 'Käyttäjätyyppi',
  'user-summary-type-admin': 'Järjestelmänvalvoja',
  'user-summary-type-guest': 'Vieraskäyttäjä',
  'user-summary-type-moderator': 'Sovittelija',
  'user-summary-type-regular': 'Tavallinen käyttäjä',
  'user-summary-username': 'Käyttäjänimi',

  'user-tooltip-$count': (count) => {
    return cardinal(count, '1 käyttäjä', '2 käyttäjää');
  },

  'validation-duplicate-project-name': 'Projekti, jolla on sama tunniste, on jo olemassa',
  'validation-duplicate-role-name': 'Rooli, jolla on sama tunniste, on jo olemassa',
  'validation-duplicate-server-name': 'Palvelin, jolla on sama tunniste, on jo olemassa',
  'validation-duplicate-source-name': 'Lähde, jolla on tämä tunniste, on jo olemassa',
  'validation-duplicate-spreadsheet-name': 'Linkki, jolla on tämä tunniste, on jo olemassa',
  'validation-duplicate-user-name': 'Käyttäjä, jolla on kyseinen tunniste, on jo olemassa',
  'validation-illegal-project-name': 'Projektin tunniste ei voi olla “global”, “admin”, “public” tai “srv”',
  'validation-invalid-timezone': 'Virheellinen aikavyöhyke',
  'validation-localhost-is-wrong': '"localhost" ei ole kelvollinen',
  'validation-password-for-admin-only': 'Vain järjestelmänvalvojat voivat kirjautua salasanalla',
  'validation-required': 'Edellytetään',
  'validation-used-by-trambar': 'Trambar käyttämä',

  'website-summary-cancel': 'Peruutta',
  'website-summary-domain-names': 'Domain-nimet',
  'website-summary-edit': 'Muokkaa sivustoa',
  'website-summary-save': 'Tallenna sivusto',
  'website-summary-template': 'Sivuston malli',
  'website-summary-template-disabled': 'Deaktivoitu',
  'website-summary-template-generic': 'Yleinen malli',
  'website-summary-timezone': 'Aikavyöhyke',
  'website-summary-title': 'Verkkosivusto',
  'website-summary-traffic-report-time': 'Liikenneraportin julkaisuaika',
  'website-summary-versions': 'Versiot',

  'welcome': 'Tervetuloa!',

  'wiki-list-cancel': 'Peruutta',
  'wiki-list-column-last-modified': 'Viimeksi muokattu',
  'wiki-list-column-public': 'Julkinen',
  'wiki-list-column-repo': 'Arkisto',
  'wiki-list-column-title': 'Otsikko',
  'wiki-list-confirm-deselect-$count': (count) => {
    let pages = cardinal(count, 'tämän sivun', 'näiden 2 sivun');
    return `Haluatko varmasti poistaa ${pages} valinnan?`;
  },
  'wiki-list-confirm-select-$count': (count) => {
    let pages = cardinal(count, 'tämän sivun', 'nämä 2 sivua');
    return `Haluatko varmasti julkaista ${pages}?`;
  },
  'wiki-list-edit': 'Muokkaa sivuluetteloa',
  'wiki-list-public-always': 'aina',
  'wiki-list-public-no': 'ei',
  'wiki-list-public-referenced': 'viittaa',
  'wiki-list-save': 'Tallenna sivuluettelo',
  'wiki-list-title': 'GitLab-wiki',

  'wiki-summary-$title': (title) => {
    let text = 'GitLab-wiki';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'wiki-summary-cancel': 'Peruutta',
  'wiki-summary-confirm-deselect': 'Haluatko varmasti poistaa tämän sivun valinnan?',
  'wiki-summary-confirm-select': 'Haluatko varmasti julkaista tämän sivun?',
  'wiki-summary-deselect': 'Poista sivun valinta',
  'wiki-summary-edit': 'Muokkaa sivua',
  'wiki-summary-hidden': 'Hakutoiminto',
  'wiki-summary-hidden-false': 'Näkyy hakutuloksissa',
  'wiki-summary-hidden-true': 'Piilotettu hakutoiminnolta',
  'wiki-summary-page-contents': 'Sisällys',
  'wiki-summary-public': 'Julkinen',
  'wiki-summary-public-always': 'Aina',
  'wiki-summary-public-no': 'Ei',
  'wiki-summary-public-referenced': 'Kyllä (viittaa toinen julkinen sivu)',
  'wiki-summary-repo': 'Arkiston tunniste',
  'wiki-summary-return': 'Palaa sivuluetteloon',
  'wiki-summary-save': 'Tallenna sivu',
  'wiki-summary-select': 'Valitse sivu',
  'wiki-summary-slug': 'Slug',
  'wiki-summary-title': 'Otsikko',
};

export {
  phrases,
};
