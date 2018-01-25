require('moment/locale/fi');

module.exports = function(localeCode) {
    return {
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
        'activity-chart-legend-merge': 'Merges',
        'activity-chart-legend-merge-request': 'Merge requests',
        'activity-chart-legend-milestone': 'Virstanpylväät',
        'activity-chart-legend-post': 'Viestejä',
        'activity-chart-legend-push': 'Pushes',
        'activity-chart-legend-repo': 'Muutokset arkistoon',
        'activity-chart-legend-survey': 'Kyselyt',
        'activity-chart-legend-task-list': 'Tehtäväluettelot',
        'activity-chart-legend-wiki': 'Wiki-muokkaukset',

        'activity-tooltip-$count': (count) => {
            return (count === 1) ? `1 tarina` : `${count} tarinaa`;
        },
        'activity-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} branchia`;
        },
        'activity-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 asia` : `${count} asiaa`;
        },
        'activity-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 jäsenmuutos` : `${count} jäsenmuutoksia`;
        },
        'activity-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merges`;
        },
        'activity-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 virstanpylväs` : `${count} virstanpylväitä`;
        },
        'activity-tooltip-$count-post': (count) => {
            return (count === 1) ? `1 viesti` : `${count} viestiä`;
        },
        'activity-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pushes`;
        },
        'activity-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 muutos arkistoon` : `${count} muutosta arkistoon`;
        },
        'activity-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 kysely` : `${count} kyselystä`;
        },
        'activity-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 tehtäväluettelo` : `${count} tehtäväluetteloa`;
        },
        'activity-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki muokkaa` : `${count} wiki muokkausta`;
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

        'project-list-$title-with-$name': (title, name) => {
            if (title) {
                return `${title} (${name})`;
            } else {
                return name;
            }
        },
        'project-list-add': 'Lisää uusi projekti',
        'project-list-cancel': 'Peruutta',
        'project-list-confirm-archive-$count': (count) => {
            var projects = (count === 1) ? 'valitun projektin' : `nämä ${count} projektia`;
            return `Haluatko varmasti arkistoida ${projects}?`;
        },
        'project-list-confirm-restore-$count': (count) => {
            var projects = (count === 1) ? 'valitun projektin' : `nämä ${count} projektia`;
            return `Haluatko varmasti palauttaa ${projects}?`;
        },
        'project-list-deleted': 'Poistettu',
        'project-list-edit': 'Muokkaa projektiluetteloa',
        'project-list-save': 'Tallenna projektiluettelo',
        'project-list-status-archived': 'Arkistoitu',
        'project-list-status-deleted': 'Poistettu',
        'project-list-title': 'Projektit',

        'project-summary-$title': (title) => {
            var text = 'Projekti';
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
            return (count === 1) ? `1 muu` : `${count} muuta`;
        },

        'repo-list-cancel': 'Peruutta',
        'repo-list-confirm-remove-$count': (count) => {
            var repositories = (count === 1) ? `tämän arkiston` : `nämä ${count} arkistoa`;
            return `Haluatko varmasti poistaa ${repositories} projektista?`;
        },
        'repo-list-edit': 'Muokkaa arkistoluetteloa',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Käytössä',
        'repo-list-save': 'Tallenna arkistoluetteloa',
        'repo-list-title': 'Arkistot',

        'repo-summary-$title': (title) => {
            var text = `Arkisto`;
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
            return (count === 1) ? `1 arkisto` : `${count} arkistoa`;
        },

        'role-list-add': 'Lisää uusi rooli',
        'role-list-cancel': 'Peruutta',
        'role-list-confirm-disable-$count': (count) => {
            var roles = (count === 1) ? `tämän roolin` : `nämä ${count} roolia`;
            return `Haluatko varmasti deaktivoida ${roles}?`
        },
        'role-list-confirm-reactivate-$count': (count) => {
            var roles = (count === 1) ? `tämän roolin` : `nämä ${count} roolia`;
            return `Haluatko varmasti reaktivoida ${roles}?`
        },
        'role-list-edit': 'Muokkaa rooliluetteloa',
        'role-list-save': 'Tallenna rooliluettelo',
        'role-list-status-deleted': 'Poistettu',
        'role-list-status-disabled': 'Deaktivoitu',
        'role-list-title': 'Roolit',

        'role-summary-$title': (title) => {
            var text = 'Rooli';
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
        'role-summary-reactivate': 'Reaktivoi roolin',
        'role-summary-return': 'Palaa rooliluetteloon',
        'role-summary-save': 'Tallenna roolin',
        'role-summary-title': 'Nimi',
        'role-summary-users': 'Käyttäjät',

        'role-tooltip-$count-others': (count) => {
            return (count === 1) ? `1 muu` : `${count} muuta`;
        },

        'server-list-add': 'Lisää uusi palvelin',
        'server-list-api-access-false': '',
        'server-list-api-access-true': 'Hankittu',
        'server-list-cancel': 'Peruutta',
        'server-list-confirm-disable-$count': (count) => {
            var servers = (count === 1) ? `tämän palvelin` : `nämä ${count} palvelinta`;
            return `Haluatko varmasti deaktivoida ${servers}?`
        },
        'server-list-confirm-reactivate-$count': (count) => {
            var servers = (count === 1) ? `tämän palvelin` : `nämä ${count} palvelinta`;
            return `Haluatko varmasti reaktivoida ${servers}?`
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
        'server-summary-gitlab-admin': 'Gitlab-järjestelmänvalvoja',
        'server-summary-gitlab-external-user': 'Gitlab ulkoinen käyttäjä',
        'server-summary-gitlab-regular-user': 'Gitlab tavallinen käyttäjä',
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
        'server-summary-oauth-gitlab-url': 'GitLab-URL',
        'server-summary-oauth-redirect-uri': 'Uudelleenohjaus-URI',
        'server-summary-oauth-redirect-url': 'Uudelleenohjaus-URL',
        'server-summary-oauth-site-url': 'Sivuston URL-osoite',
        'server-summary-reactivate': 'Reaktivoi palvelin',
        'server-summary-return': 'Palaa palvelinluetteloon',
        'server-summary-role-none': 'Älä anna rooleja uusille käyttäjille',
        'server-summary-roles': 'Roolin osoittaminen',
        'server-summary-save': 'Tallenna palvelin',
        'server-summary-system-address-missing': 'Järjestelmän osoite ei ole asetettu',
        'server-summary-test-oauth': 'Testa OAuth-integraatio',
        'server-summary-title': 'Nimi',
        'server-summary-type': 'Palvelintyyppi',
        'server-summary-user-automatic-approval': 'Hyväksy uusia käyttäjiä automaattisesti',
        'server-summary-user-import-disabled': 'Älä rekisteröi uusia käyttäjiä',
        'server-summary-user-import-gitlab-admin-disabled': 'Älä tuota Gitlab-järjestelmänvalvojia',
        'server-summary-user-import-gitlab-external-user-disabled': 'Älä tuota Gitlabin ulkopuolisia käyttäjiä',
        'server-summary-user-import-gitlab-user-disabled': 'Älä tuota Gitlab-käyttäjiä',
        'server-summary-user-type-admin': 'Järjestelmänvalvoja',
        'server-summary-user-type-guest': 'Vieraskäyttäjä',
        'server-summary-user-type-moderator': 'Sovittelija',
        'server-summary-user-type-regular': 'Tavallinen käyttäjä',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-background-image': 'Taustakuva',
        'settings-cancel': 'Peruutta',
        'settings-edit': 'Muokkaa asetuksia',
        'settings-input-languages': 'Tulkkauskielet',
        'settings-push-relay': 'Push-viestirele',
        'settings-save': 'Tallenna asetukset',
        'settings-site-address': 'Osoite',
        'settings-site-description': 'Kuvaus',
        'settings-site-title': 'Sivuston nimi',
        'settings-title': 'Asetukset',

        'sign-in-$title': (title) => {
            var text = `Kirjaudu sisään`;
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
        'table-heading-users': 'Käyttäjät',

        'task-$seconds': (seconds) => {
            return (seconds === 1) ? `1 sekunti` : `${seconds} sekuntia`;
        },
        'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 commit-kommentti` : `${count} commit-kommenttia`;
            return `Tuotu ${comments} arkistosta “${repo}”`;
        },
        'task-imported-$count-events-from-$repo': (count, repo) => {
            var events = (count === 1) ? `1 tapahtuma` : `${count} tapahtumat`;
            return `Tuotu ${events} arkistosta “${repo}”`;
        },
        'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 asiakommentti` : `${count} asiakommenttia`;
            return `Tuotu ${comments} arkistosta “${repo}”`;
        },
        'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
            var comments = (count === 1) ? `1 merge-request-kommentti` : `${count} merge-request-kommenttia`;
            return `Tuotu ${comments} arkistosta “${repo}”`;
        },
        'task-imported-$count-repos': (count) => {
            var repos = (count === 1) ? `1 arkisto` : `${count} arkistoa`;
            return `Tuotu ${repos}`;
        },
        'task-imported-$count-users': (count) => {
            var users = (count === 1) ? `1 käyttäjä` : `${count} käyttäjää`;
            return `Tuotu ${users}`;
        },
        'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
            var commits = (count === 1) ? `1 commiti` : `${count} commitia`;
            return `Tuotu push jossa ${commits} branchista “${branch}” arkiston “${repo}”`;
        },
        'task-importing-commit-comments-from-$repo': (repo) => {
            return `Tuoda commit-kommentteja arkistosta “${repo}”`;
        },
        'task-importing-events-from-$repo': (repo) => {
            return `Tuoda tapahtumia arkistosta “${repo}”`;
        },
        'task-importing-issue-comments-from-$repo': (repo) => {
            return `Tuoda asiakommentteja arkistosta “${repo}”`;
        },
        'task-importing-merge-request-comments-from-$repo': (repo) => {
            return `Tuoda merge-request-kommentteja arkistosta “${repo}”`;
        },
        'task-importing-push-from-$repo': (repo) => {
            return `Tuoda push arkistosta “${repo}”`;
        },
        'task-importing-repos': 'Tuodaan arkistot',
        'task-importing-users': 'Tuodaan käyttäjät',
        'task-installed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 koukku` : `${count} koukkua`;
            return `Asennettu ${hooks}`;
        },
        'task-installing-hooks': 'Asentamalla koukut',
        'task-removed-$count-hooks': (count) => {
            var hooks = (count === 1) ? `1 koukku` : `${count} koukkua`;
            return `Poistetut ${hooks}`;
        },
        'task-removed-$count-repos': (count) => {
            var repos = (count === 1) ? `1 arkisto` : `${count} arkistoa`;
            return `Poistetut ${repos}`;
        },
        'task-removed-$count-users': (count) => {
            var users = (count === 1) ? `1 käyttäjä` : `${count} käyttäjää`;
            return `Poistetut ${users}`;
        },
        'task-removing-hooks': 'Poistamalla koukut',
        'task-updated-$count-repos': (count) => {
            var repos = (count === 1) ? `1 arkisto` : `${count} arkistoa`;
            return `Päivitetty ${repos}`;
        },
        'task-updated-$count-users': (count) => {
            var users = (count === 1) ? `1 käyttäjä` : `${count} käyttäjää`;
            return `Päivitetty ${users}`;
        },

        'text-field-placeholder-none': 'ei mitään',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' ja ', tooltip ];
        },
        'tooltip-more': 'Lisää',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `Lataaminen ${files}, ${size} jäljellä`;
        },

        'user-list-$name-with-$username': (name, username) => {
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
        'user-list-add': 'Lisää uusi käyttäjä',
        'user-list-approve-all': 'Hyväksy kaikki pyynnöt',
        'user-list-cancel': 'Peruutta',
        'user-list-confirm-disable-$count': (count) => {
            var accounts = (count === 1) ? `tämän käyttäjätili` : `nämä ${count} käyttäjätilejä`;
            return `Haluatko varmasti deaktivoida ${accounts}?`
        },
        'user-list-confirm-reactivate-$count': (count) => {
            var accounts = (count === 1) ? `tämän käyttäjätili` : `nämä ${count} käyttäjätilejä`;
            return `Haluatko varmasti reaktivoida ${accounts}?`
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
            var text = 'Käyttäjä';
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
            var text = 'Käyttäjä';
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
        'user-summary-visibility': 'Näkyvyys',
        'user-summary-visibility-hidden': 'Käyttäjä näkyy osassa “Ihmiset”',
        'user-summary-visibility-shown': 'Käyttäjä ei näy osiossa “Ihmiset”',

        'user-tooltip-$count': (count) => {
            return (count === 1) ? `1 käyttäjä` : `${count} käyttäjää`;
        },

        'validation-duplicate-project-name': 'Projekti, jolla on sama tunniste, on jo olemassa',
        'validation-duplicate-role-name': 'Rooli, jolla on sama tunniste, on jo olemassa',
        'validation-duplicate-server-name': 'Palvelin, jolla on sama tunniste, on jo olemassa',
        'validation-duplicate-user-name': 'Käyttäjä, jolla on kyseinen tunniste, on jo olemassa',
        'validation-illegal-project-name': 'Projektin tunniste ei voi olla “global” tai “admin”',
        'validation-password-for-admin-only': 'Vain järjestelmänvalvojat voivat kirjautua salasanalla',
        'validation-required': 'Edellytetään',

        'welcome': 'Tervetuloa!',
    };
};
