require('moment/locale/fi');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': 'Ota yhteyttä sähköpostitse',
        'action-contact-by-ichat': 'Ota yhteyttä iChat',
        'action-contact-by-phone': 'Ota yhteyttä puhelimitse',
        'action-contact-by-skype': 'Ota yhteyttä Skype',
        'action-contact-by-slack': 'Ota yhteyttä Slack',
        'action-contact-by-twitter': 'Ota yhteyttä Twitter',
        'action-view-github-page': 'Näytä GitHub-sivu',
        'action-view-gitlab-page': 'Näytä GitLab-sivu',
        'action-view-linkedin-page': 'Näytä LinkedIn-sivu',
        'action-view-stackoverflow-page': 'Näytä StackOverflow-sivu',

        'activation-address': 'Palvelimen osoite',
        'activation-cancel': 'Peruutta',
        'activation-code': 'Aktivointikoodi',
        'activation-ok': 'OK',
        'activation-schema': 'Projekti',

        'alert-$count-new-bookmarks': (count) => {
            return (count === 1) ? `1 uusi kirjanmerkki` : `${count} uutta kirjanmerkkiä`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 uusi ilmoitus` : `${count} uutta ilmoitusta`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 uusi tarina` : `${count} uutta tarinoita`;
        },

        'app-name': 'Trambar',

        'audio-capture-accept': 'Hyväksy',
        'audio-capture-cancel': 'Peruutta',
        'audio-capture-pause': 'Pysähdy',
        'audio-capture-rerecord': 'Nauhoita uudelleen',
        'audio-capture-resume': 'Jatka',
        'audio-capture-start': 'Ala',
        'audio-capture-stop': 'Lopeta',

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 toinen käyttäjä` : `${count} muuta käyttäjää`;
        },
        'bookmark-$count-users': (count) => {
            return (count === 1) ? `1 käyttäjä` : `${count} käyttäjää`;
        },
        'bookmark-$name-and-$users-recommend-this': (name, users) => {
            return [ `${name} ja `, users, ` suosittelevat tätä` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} suosittelee tätä`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return [ name1, ' ja ', name2, ' suosittelevat tätä' ];
        },
        'bookmark-$you-bookmarked-it': 'Teit kirjanmerkin tähän',
        'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
            return `Teit kirjanmerkin tähän (ja ${name} suosittelee sitä)`;
        },
        'bookmark-$you-bookmarked-it-and-$users-recommends-it': (you, users) => {
            return [ `Teit kirjanmerkin tähän (ja `, users, ` suosittelevat tätä)` ];
        },
        'bookmark-recommendations': 'Suositukset',

        'bottom-nav-bookmarks': 'Kirjanmerkit',
        'bottom-nav-news': 'Uutiset',
        'bottom-nav-notifications': 'Ilmoitukset',
        'bottom-nav-people': 'Ihmiset',
        'bottom-nav-settings': 'Asetukset',

        'confirmation-cancel': 'Peruutta',
        'confirmation-confirm': 'Vahvista',

        'diagnostics-show': 'Näytä diagnostiikka',
        'diagnostics-show-panel': 'Näytä tämä paneeli',

        'image-editor-upload-in-progress': 'Lataus käynnissä...',

        'issue-cancel': 'Peruutta',
        'issue-clear': 'Tyhjentä',
        'issue-ok': 'OK',
        'issue-repo': 'Arkisto',
        'issue-title': 'Otsikko',

        'list-$count-more': (count) => {
            return `${count} lisää...`;
        },

        'media-close': 'Sulje',
        'media-download-original': 'Lataa alkuperäinen',
        'media-editor-embed': 'Upotta',
        'media-editor-remove': 'Poista',
        'media-editor-shift': 'Siirrä',
        'media-next': 'Seuraava',
        'media-previous': 'Edellinen',

        'membership-request-$you-are-now-member': 'Olet nyt jäsenenä tässä hankkeessa',
        'membership-request-$you-have-requested-membership': 'Olet pyytänyt jäsenyyttä tässä projektissa',
        'membership-request-cancel': 'Peruutta',
        'membership-request-join': 'Yhdistää',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Etene',

        'mobile-device-revoke': 'peruutta',
        'mobile-device-revoke-are-you-sure': 'Haluatko varmasti peruuttaa valtuutuksen tähän laitteeseen?',

        'mobile-setup-address': 'Palvelimen osoite',
        'mobile-setup-close': 'Sulje',
        'mobile-setup-code': 'Lupakoodi',

        'notification-$user-added-you-as-coauthor': (user) => {
            return `${user} kutsui sinut muokkaamaan viestiä yhdessä`;
        },
        'notification-$user-commented-on-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'sinun push'; break;
                case 'merge': story = 'sinun merge'; break;
                case 'branch': story = 'sinun branch'; break;
                case 'survey': story = 'kyselysi'; break;
                case 'task-list': story = 'tehtäväluetteloasi'; break;
                default: story = 'viestiäsi';
            }
            return `${user} kommentoi ${story}`;
        },
        'notification-$user-completed-task': (user) => {
            return `${user} täytti tehtävänsä luettelossasi`;
        },
        'notification-$user-likes-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'sinun push'; break;
                case 'merge': story = 'sinun merge'; break;
                case 'branch': story = 'sinun branch'; break;
                case 'survey': story = 'kyselyn'; break;
                case 'task-list': story = 'tehtäväluettelostaan'; break;
                default: story = 'viestisi';
            }
            return `${user} pitää ${story}`;
        },
        'notification-$user-requested-to-join': (user) => {
            return `${user} pyysi liittymään tähän projektiin`;
        },
        'notification-$user-sent-bookmark-to-$story': (user, story) => {
            switch (story) {
                case 'survey': story = 'kyselyyn'; break;
                case 'task-list': story = 'tehtäväluettelon'; break;
                default: story = 'tarinan';
            }
            return `${user} lähetti sinulle ${story} kirjanmerkin`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            return `${user} vastasi kyselyynne`;
        },
        'notification-option-assignment': 'Kun olet määrittänyt ongelman',
        'notification-option-bookmark': 'Kun joku lähettää sinulle kirjanmerkin',
        'notification-option-coauthor': 'Kun joku kutsuu sinut muokkaamaan viestiä yhdessä',
        'notification-option-comment': 'Kun joku kommentoi viestiäsi',
        'notification-option-issue': 'Kun joku avaa uuden asian',
        'notification-option-join-request': 'Kun joku haluaa liittyä tähän projektiin',
        'notification-option-like': 'Kun joku haluaa tarinasi',
        'notification-option-merge': 'Kun joku linkittää koodin branchien master',
        'notification-option-note': 'Kun joku lähettää viestin commitista tai liikkeestä',
        'notification-option-push': 'Kun joku painaa koodia Gitiin',
        'notification-option-survey': 'Kun joku lähettää kyselyn',
        'notification-option-task-completion': 'Kun joku täyttää tehtävän luettelossasi',
        'notification-option-vote': 'Kun joku vastaa kyselyyn',
        'notification-option-web-session': 'Kun web-istunto on aktiivinen',

        'option-add-bookmark': 'Lisää kirjanmerkki tähän tarinaan',
        'option-add-issue': 'Lisää viesti julkaisijan seurantaan',
        'option-bookmark-story': 'Lisää kirjanmerkki tähän tarinaan',
        'option-bump-post': 'Edistä tarina',
        'option-edit-comment': 'Muokkaa kommenttia',
        'option-edit-post': 'Muokkaa viestiä',
        'option-hide-comment': 'Piilota kommentti muilta kuin tiimin jäseniltä',
        'option-hide-post': 'Piilota tarina muilta kuin tiimin jäseniltä',
        'option-remove-comment': 'Poista kommentti',
        'option-remove-post': 'Poista tarina',
        'option-send-bookmarks': 'Lähetä kirjanmerkit muille käyttäjille',
        'option-send-bookmarks-to-$count-users': (count) => {
            return `Lähetä kirjanmerkit ${count} käyttäjälle`;
        },
        'option-show-media-preview': 'Näytä liitetiedostot',
        'option-show-text-preview': 'Näytä tekstin esikatselu',

        'photo-capture-accept': 'Hyväksy',
        'photo-capture-cancel': 'Peruutta',
        'photo-capture-retake': 'Ota uudelleen',
        'photo-capture-snap': 'Ota',

        'project-description-close': 'Sulje',

        'project-management-add': 'Lisää',
        'project-management-cancel': 'Peruutta',
        'project-management-description': 'hankkeen kuvaus',
        'project-management-manage': 'Hallitse luetteloa',
        'project-management-mobile-set-up': 'mobiililaitteisto',
        'project-management-remove': 'Poista',
        'project-management-sign-out': 'kirjaudu ulos',
        'project-management-sign-out-are-you-sure': 'Haluatko varmasti kirjautua ulos tästä palvelimesta?',

        'qr-scanner-cancel': 'Peruutta',
        'qr-scanner-invalid-qr-code': 'Virheellinen QR-koodi',

        'reaction-$user-added-story-to-issue-tracker': (user) => {
            return `${user} lisäsi tämän viestin antamaan jäljitys`;
        },
        'reaction-$user-cast-a-vote': (user) => {
            return `${user} äänesti`;
        },
        'reaction-$user-commented-on-branch': (user) => {
            return `${user} kommentoi tätä branchia`;
        },
        'reaction-$user-commented-on-issue': (user) => {
            return `${user} kommentoi tätä asiaa`;
        },
        'reaction-$user-commented-on-merge': (user) => {
            return `${user} kommentoi tätä commitia`;
        },
        'reaction-$user-commented-on-merge-request': (user) => {
            return `${user} kommentoi tätä merge-request`;
        },
        'reaction-$user-commented-on-push': (user) => {
            return `${user} kommentoi tätä push`;
        },
        'reaction-$user-completed-a-task': (user) => {
            return `${user} suoritti tehtävän`;
        },
        'reaction-$user-is-assigned-to-issue': (user) => {
            return `${user} oli määrätty tähän asiaan`;
        },
        'reaction-$user-is-assigned-to-merge-request': (user) => {
            return `${user} oli määrätty tähän merge-request`;
        },
        'reaction-$user-is-editing': (user) => {
            return `${user} muokkaa kommenttia...`;
        },
        'reaction-$user-is-writing': (user) => {
            return `${user} kirjoittaa kommentin...`;
        },
        'reaction-$user-likes-this': (user) => {
            return `${user} pitää tästä`;
        },

        'role-filter-no-roles': 'Ei rooleja määritelty',

        'search-bar-keywords': 'avainsanoja tai #hashtagia',

        'selection-cancel': 'Peruutta',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-device': 'Mobiililaite',
        'settings-devices': 'Mobiililaitteet',
        'settings-diagnostics': 'Diagnostiikka',
        'settings-language': 'Kieli',
        'settings-mobile-alert': 'Mobiilihälytys',
        'settings-notification': 'Ilmoitukset',
        'settings-profile-image': 'Profiilikuva',
        'settings-projects': 'Projektit',
        'settings-social-networks': 'Sosiaaliset verkostot',
        'settings-user-information': 'Käyttäjäprofiili',
        'settings-web-alert': 'Web-hälytys',

        'social-network-github': 'GitHub-profiilin URL-osoite',
        'social-network-gitlab': 'GitLub-profiilin URL-osoite',
        'social-network-ichat': 'iChat-käyttäjänimi',
        'social-network-linkedin': 'LinkedIn-profiilin URL-osoite',
        'social-network-skype': 'Skype-käyttäjänimi',
        'social-network-slack': 'Slack-käyttäjätunniste',
        'social-network-slack-team': 'Slack-ryhmätunniste',
        'social-network-stackoverflow': 'StackOverflow-profiilin URL-osoite',
        'social-network-twitter': 'Twitter-käyttäjänimi',

        'start-activation-add-server': 'Lisää projekti toiselta palvelimelta',
        'start-activation-instructions': 'Lorem ipsum dolor sit amet, sint explicari nec id, nisl civibus deleniti ea qui. Sit in debitis veritus consequat. Nullam delenit menandri his at, audiam fabulas te vel. Sit veri oratio suscipiantur in, mea ut duis facer patrioque. Ut partem accumsan molestiae sit.',
        'start-activation-manual': 'Manuaalinen syöttö',
        'start-activation-scan-code': 'Skannaa QR-koodi',
        'start-error-access-denied': 'Hakuhakemus hylättiin',
        'start-error-account-disabled': 'Tili on tällä hetkellä poissa käytöstä',
        'start-error-existing-users-only': 'Ainoastaan valtuutettu henkilöstö voi käyttää tätä järjestelmää',
        'start-error-undefined': 'Odottamaton virhe',
        'start-projects': 'Projektit',
        'start-social-login': 'Social login',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Tervetuloa!',
        'start-welcome-again': 'Tervetuloa uudelleen',

        'statistics-bar': 'Pylväs',
        'statistics-line': 'Viiva',
        'statistics-pie': 'Ympyrä',

        'story-$count-user-reacted-to-story': (count) => {
            var users = (count === 1) ? `${count} ihminen` : `${count} ihmistä`;
            return `${users} reagoi tähän`;
        },
        'story-$name-created-$branch-in-$repo': (user, branch, repo) => {
            return `Loi branchin “${branch}” projektissa “${repo}”`;
        },
        'story-$name-created-$milestone': (user, name) => {
            return `Loi virstanpylvään “${name}”`;
        },
        'story-$name-created-$page': (user, page) => {
            return `Loi wiki-sivun “${page}”`;
        },
        'story-$name-created-$repo': (user, name) => {
            var text = `Loi projektin`;
            if (name) {
                text += ` “${name}”`;
            }
            return text;
        },
        'story-$name-deleted-$page': (user, page) => {
            return `Poisti wiki-sivun “${page}”`;
        },
        'story-$name-joined-$repo': (user, repo) => {
            var text = `Liittyi projektiin`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-$name-left-$repo': (user, repo) => {
            var text = `Lähti projektista`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (user, branches, branch, repo) => {
            var text = `Yhdisti koodin`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `“${branch}”`;
                });
                text += ` branchista ${sources.join(', ')}`;
            }
            text += ` branchien “${branch}”`;
            if (repo) {
                text += ` projectin “${repo}”`;
            }
            return text;
        },
        'story-$name-opened-issue-$number-$title': (user, number, title) => {
            var text = `Avasi asian ${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (user, branch, repo) => {
            var text = `Painoi muutoksia branchien “${branch}”`;
            if (repo) {
                text += ` projektin “${repo}”`;
            }
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (user, branch1, branch2) => {
            return `Pyysi yhdistämään branchin “${branch1}” branchien “${branch2}”`;
        },
        'story-$name-updated-$page': (user, page) => {
            return `Päivitti wiki-sivun “${page}”`;
        },
        'story-add-coauthor': 'Lisää kirjoittaja',
        'story-add-remove-coauthor': 'Lisää/Poista kirjailija',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) => {
            return `${count} muuta`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' ja ', name2 ];
        },
        'story-cancel': 'Peruutta',
        'story-cancel-are-you-sure': 'Haluatko varmasti hylätä tämän viestin?',
        'story-cancel-edit-are-you-sure': 'Haluatko varmasti hylätä tekemäsi muutokset?',
        'story-coauthors': 'Muut kirjoittajat',
        'story-comment': 'Kommentoi',
        'story-drop-files-here': 'Vedä ja pudota mediatiedostoja täältä',
        'story-file': 'Tiedosto',
        'story-issue-current-status': 'Nykyinen tila:',
        'story-issue-status-closed': 'Suljettu',
        'story-issue-status-opened': 'Avoinna',
        'story-issue-status-reopened': 'Avattu uudelleen',
        'story-like': 'Pidä',
        'story-markdown': 'Markdown',
        'story-milestone-due-date': 'Eräpäivä:',
        'story-milestone-start-date': 'Aloituspäivä:',
        'story-options': 'Vaihtoehdot',
        'story-paste-image-here': 'Myös tekstieditoriin liitetty kuva päätyy tänne',
        'story-pending': 'Odotettaessa...',
        'story-photo': 'Kuva',
        'story-post': 'Viesti',
        'story-push-added-$count-files': (count) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `${files} lisätty`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines = (count === 1) ? `1 rivi` : `${count} riviä`;
            return `${lines} lisätty`;
        },
        'story-push-components-changed': 'Seuraavat osat muutettiin:',
        'story-push-deleted-$count-files': (count) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `${files} poistettiin`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines = (count === 1) ? `1 rivi` : `${count} riviä`;
            return `${lines} poistettiin`;
        },
        'story-push-modified-$count-files': (count) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `${files} muokattu`;
        },
        'story-push-renamed-$count-files': (count) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `${files} nimettiin uudelleen`;
        },
        'story-remove-yourself': 'Poista itsesi',
        'story-remove-yourself-are-you-sure': 'Haluatko varmasti poistaa itsesi kirjoittajaksi??',
        'story-status-transcoding-$progress': (progress) => {
            return `Koodaaminen (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Lataaminen (${progress}%)`;
        },
        'story-survey': 'Kyselyn',
        'story-task-list': 'Tehtäväluettelo',
        'story-video': 'Video',
        'story-vote-submit': 'Tallenna',

        'telephone-dialog-close': 'Sulje',

        'time-yesterday': 'Eilen',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 tiedosto` : `${count} tiedostoa`;
            return `Lataaminen ${files}, ${size} jäljellä`;
        },

        'user-actions': 'Toimet',

        'user-activity-$name-created-branch': 'Luonut uuden branchin',
        'user-activity-$name-created-merge-request': 'Teki merge request',
        'user-activity-$name-created-milestone': 'Loi virstanpylvään',
        'user-activity-$name-created-repo': 'Loi git-projektin',
        'user-activity-$name-edited-wiki-page': 'Muokkasi wiki-sivua',
        'user-activity-$name-joined-repo': 'Liittyi git-projektiin',
        'user-activity-$name-left-repo': 'Jätti git-projektin',
        'user-activity-$name-merged-code': 'Teki koodin yhdistämisen',
        'user-activity-$name-opened-issue': 'Avasi asian',
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios = (count === 1) ? `äänileikkeen` : `${count} äänileikkeitä`;
            return `Lähetti ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `linkin verkkosivustoon` : `linkit ${count} verkkosivustoon`;
            return `Lähetti ${links}`;
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures = (count === 1) ? `kuvan` : `${count} kuvaa`;
            return `Lähetti ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos = (count === 1) ? `videoleikeen` : `${count} videoleikkeitä`;
            return `Lähetti ${videos}`;
        },
        'user-activity-$name-pushed-code': 'Siirretty koodi arkistolle',
        'user-activity-$name-started-survey': 'Aloitti kyselyn',
        'user-activity-$name-started-task-list': 'Aloitti tehtäväluettelon',
        'user-activity-$name-wrote-post': 'Kirjoitti viestin',
        'user-activity-more': 'Lisää...',

        'user-image-remove': 'Poista',
        'user-image-select': 'Select',
        'user-image-snap': 'Ota',

        'user-info-email': 'Sähköpostiosoite',
        'user-info-gender': 'Sukupuoli',
        'user-info-gender-female': 'Nainen',
        'user-info-gender-male': 'Uros',
        'user-info-gender-unspecified': 'Määrittelemätön',
        'user-info-name': 'Nimi',
        'user-info-phone': 'Puhelinnumero',

        'user-statistics-legend-branch': 'Branchit',
        'user-statistics-legend-issue': 'Asiat',
        'user-statistics-legend-merge': 'Merges',
        'user-statistics-legend-merge-request': 'Merge requests',
        'user-statistics-legend-milestone': 'Virstanpylväät',
        'user-statistics-legend-post': 'Viestejä',
        'user-statistics-legend-push': 'Pushes',
        'user-statistics-legend-repo': 'Muutokset arkistoon',
        'user-statistics-legend-survey': 'Kyselyt',
        'user-statistics-legend-task-list': 'Tehtäväluettelot',
        'user-statistics-legend-wiki': 'Wiki-muokkaukset',
        'user-statistics-today': 'Tänään',
        'user-statistics-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} branchia`;
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 asia` : `${count} asiaa`;
        },
        'user-statistics-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 jäsenmuutos` : `${count} jäsenmuutoksia`;
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merges`;
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 virstanpylväs` : `${count} virstanpylväitä`;
        },
        'user-statistics-tooltip-$count-post': (count) => {
            return (count === 1) ? `1 viesti` : `${count} viestiä`;
        },
        'user-statistics-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pushes`;
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 muutos arkistoon` : `${count} muutosta arkistoon`;
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 kysely` : `${count} kyselystä`;
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 tehtäväluettelo` : `${count} tehtäväluetteloa`;
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki muokkaa` : `${count} wiki muokkausta`;
        },

        'video-capture-accept': 'Hyväksy',
        'video-capture-cancel': 'Peruutta',
        'video-capture-pause': 'Pysähdy',
        'video-capture-resume': 'Jatka',
        'video-capture-retake': 'Nauhoita uudelleen',
        'video-capture-start': 'Ala',
        'video-capture-stop': 'Lopeta',
    };
};
