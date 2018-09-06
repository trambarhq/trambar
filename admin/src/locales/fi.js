import 'moment/locale/fi';
import { cardinal } from 'locale/grammars/finnish';

let phrases = {
    'action-badge-add': 'lisätään',
    'action-badge-approve': 'hyväksytään',
    'action-badge-archive': 'arkistoidaan',
    'action-badge-disable': 'deaktivoidaan',
    'action-badge-reactivate': 'reaktivoidaan',
    'action-badge-remove': 'poistetaan',
    'action-badge-restore': 'palautetaan',

    'activity-chart-legend-branch': 'Branchit',
    'activity-chart-legend-issue': 'Asiat',
    'activity-chart-legend-member': 'Jäsenmuutokset',
    'activity-chart-legend-merge': 'Yhdistämiset',
    'activity-chart-legend-merge-request': 'Yhdistämispyynnöt',
    'activity-chart-legend-milestone': 'Virstanpylväät',
    'activity-chart-legend-post': 'Viestejä',
    'activity-chart-legend-push': 'Työnnöt',
    'activity-chart-legend-repo': 'Muutokset arkistoon',
    'activity-chart-legend-survey': 'Kyselyt',
    'activity-chart-legend-tag': 'Tagit',
    'activity-chart-legend-task-list': 'Tehtäväluettelot',
    'activity-chart-legend-wiki': 'Wiki-muokkaukset',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, 'tarina', 'tarinaa');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, 'haara', 'haaraa');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, 'asia', 'asiaa');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, 'jäsenmuutos', 'jäsenmuutosta');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, 'yhdistäminen', 'yhdistämistä');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, 'yhdistämisenpyyntö', 'yhdistämispyyntöä');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, 'virstanpylväs', 'virstanpylvästä');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, 'viesti', 'viestiä');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, 'työntö', 'työntöä');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, 'muutos arkistoon', 'muutosta arkistoon');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, 'kysely', 'kyselystä');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, 'tagi', 'tagia');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, 'tehtäväluettelo', 'tehtäväluetteloa');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, 'wiki muokkaus', 'wiki muokkausta');
    },

    'app-name': 'Trambar',
    'app-title': 'Trambar - Hallintakonsoli',

    'confirmation-cancel': 'Peruutta',
    'confirmation-confirm': 'Vahvista',
    'confirmation-data-loss': 'Haluatko letmasti hylätä tekemäsi muutokset?',

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
    'nav-role-new': 'Uusi rooli',
    'nav-roles': 'Roolit',
    'nav-server-new': 'Uusi palvelin',
    'nav-servers': 'Palvelimet',
    'nav-settings': 'Ssetukset',
    'nav-user-new': 'Uusi käyttäjä',
    'nav-users': 'Käyttäjät',

    'project-list-add': 'Lisää uusi projekti',
    'project-list-cancel': 'Peruutta',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'valitun projektin', [ 'nämä', 'projektia' ], true);
        return `Haluatko letmasti arkistoida ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'valitun projektin', [ 'nämä', 'projektia' ], true);
        return `Haluatko letmasti palauttaa ${projects}?`;
    },
    'project-list-deleted': 'Poistettu',
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
    'project-summary-confirm-archive': 'Haluatko letmasti arkistoida tämän projektin?',
    'project-summary-confirm-delete': 'Haluatko letmasti poistaa tämän projektin?',
    'project-summary-confirm-restore': 'Haluatko letmasti palauttaa tämän projektin?',
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
        return cardinal(count, 'muu', 'muuta');
    },

    'repo-list-cancel': 'Peruutta',
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, 'tämän arkiston', [ 'nämä', 'arkistoa' ], true);
        return `Haluatko letmasti poistaa ${repositories} projektista?`;
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
    'repo-summary-confirm-remove': 'Haluatko letmasti poistaa tämän arkiston projektista?',
    'repo-summary-confirm-restore': 'Haluatko letmasti lisätä tämän arkiston projektiin uudelleen?',
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
        return cardinal(count, 'arkisto', 'arkistoa');
    },

    'role-list-add': 'Lisää uusi rooli',
    'role-list-cancel': 'Peruutta',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'tämän roolin', [ 'nämä', 'roolia' ], true);
        return `Haluatko letmasti deaktivoida ${roles}?`
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'tämän roolin', [ 'nämä', 'roolia' ], true);
        return `Haluatko letmasti reaktivoida ${roles}?`
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
    'role-summary-confirm-delete': 'Haluatko letmasti poistaa tämän roolin?',
    'role-summary-confirm-disable': 'Haluatko letmasti deaktivoida tämän roolin?',
    'role-summary-confirm-reactivate': 'Haluatko letmasti reaktivoida tämän roolin?',
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
        return cardinal(count, 'muu', 'muuta');
    },

    'server-list-add': 'Lisää uusi palvelin',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Hankittu',
    'server-list-cancel': 'Peruutta',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'tämän palvelin', [ 'nämä', 'palvelinta' ], true);
        return `Haluatko letmasti deaktivoida ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'tämän palvelin', [ 'nämä', 'palvelinta' ], true);
        return `Haluatko letmasti reaktivoida ${servers}?`
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
    'server-summary-confirm-delete': 'Haluatko letmasti poistaa tämän palvelin?',
    'server-summary-confirm-disable': 'Haluatko letmasti deaktivoida tämän palvelin?',
    'server-summary-confirm-reactivate': 'Haluatko letmasti reaktivoida tämän palvelin',
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

    'table-heading-api-access': 'API-käyttöoikeus',
    'table-heading-date-range': 'Aktiivinen ajanjakso',
    'table-heading-email': 'Sähköpostiosoite',
    'table-heading-issue-tracker': 'Raportointityökalu',
    'table-heading-last-modified': 'Viimeksi muokattu',
    'table-heading-last-month': 'Viime kuukausi',
    'table-heading-name': 'Nimi',
    'table-heading-oauth': 'OAuth-todennus',
    'table-heading-projects': 'Projektit',
    'table-heading-repositories': 'Arkistot',
    'table-heading-roles': 'Roolit',
    'table-heading-server': 'Palvelin',
    'table-heading-this-month': 'Tässä kuussa',
    'table-heading-title': 'Nimi',
    'table-heading-to-date': 'Tähän mennessä',
    'table-heading-type': 'Tyyppi',
    'table-heading-username': 'Käyttäjätunnus',
    'table-heading-users': 'Käyttäjät',

    'task-$seconds': (seconds) => {
        return (seconds === 1) ? `1 sekunti` : `${seconds} sekuntia`;
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'commitin kommentti', 'commitin kommenttia');
        return `Tuotu ${comments} arkistosta “${repo}”`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, 'tapahtuma', 'tapahtumat');
        return `Tuotu ${events} arkistosta “${repo}”`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'asian kommentti', 'asian kommenttia');
        return `Tuotu ${comments} arkistosta “${repo}”`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'yhdistämispyynnön kommentti', 'yhdistämispyynnön kommenttia');
        return `Tuotu ${comments} arkistosta “${repo}”`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, 'arkisto', 'arkistoa');
        return `Tuotu ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, 'käyttäjä', 'käyttäjää');
        return `Tuotu ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, 'commiti', 'commitia');
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
    'task-installed-$count-hooks': (count) => {
        let hooks = cardinal(count, 'koukku', 'koukkua');
        return `Asennettu ${hooks}`;
    },
    'task-installing-hooks': 'Asentamalla koukut',
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, 'koukku', 'koukkua');
        return `Poistetut ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, 'arkisto', 'arkistoa');
        return `Poistetut ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, 'käyttäjä', 'käyttäjää');
        return `Poistetut ${users}`;
    },
    'task-removing-hooks': 'Poistamalla koukut',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, 'arkisto', 'arkistoa');
        return `Päivitetty ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, 'käyttäjä', 'käyttäjää');
        return `Päivitetty ${users}`;
    },

    'text-field-placeholder-none': 'ei mitään',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' ja ', tooltip ];
    },
    'tooltip-more': 'Lisää',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, 'tiedosto', 'tiedostoa');
        return `Lataaminen ${files}, ${size} jäljellä`;
    },

    'user-list-add': 'Lisää uusi käyttäjä',
    'user-list-approve-all': 'Hyväksy kaikki pyynnöt',
    'user-list-cancel': 'Peruutta',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'tämän käyttäjätili', [ 'nämä', 'käyttäjätilejä' ], true);
        return `Haluatko letmasti deaktivoida ${accounts}?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'tämän käyttäjätili', [ 'nämä', 'käyttäjätilejä' ], true);
        return `Haluatko letmasti reaktivoida ${accounts}?`
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
    'user-summary-confirm-delete': 'Haluatko letmasti poistaa tämän käyttäjätili?',
    'user-summary-confirm-disable': 'Haluatko letmasti deaktivoida tämän käyttäjätili?',
    'user-summary-confirm-reactivate': 'Haluatko letmasti reaktivoida tämän käyttäjätili?',
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
        return cardinal(count, 'käyttäjä', 'käyttäjää');
    },

    'validation-duplicate-project-name': 'Projekti, jolla on sama tunniste, on jo olemassa',
    'validation-duplicate-role-name': 'Rooli, jolla on sama tunniste, on jo olemassa',
    'validation-duplicate-server-name': 'Palvelin, jolla on sama tunniste, on jo olemassa',
    'validation-duplicate-user-name': 'Käyttäjä, jolla on kyseinen tunniste, on jo olemassa',
    'validation-illegal-project-name': 'Projektin tunniste ei voi olla “global”, “admin”, “public” tai “srv”',
    'validation-localhost-is-wrong': '"localhost" ei ole kelvollinen',
    'validation-password-for-admin-only': 'Vain järjestelmänvalvojat voivat kirjautua salasanalla',
    'validation-required': 'Edellytetään',

    'welcome': 'Tervetuloa!',
};

export {
    phrases,
};
