import 'moment/locale/fi';
import { cardinal, list } from 'locale/grammars/finnish';

const phrases = {
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
        return cardinal(count, '1 uusi kirjanmerkki', '2 uutta kirjanmerkkiä');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 uusi ilmoitus', '2 uutta ilmoitusta');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 uusi tarina', '2 uutta tarinoita');
    },

    'app-component-close': 'Sulje',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Hyväksy',
    'audio-capture-cancel': 'Peruutta',
    'audio-capture-pause': 'Pysähdy',
    'audio-capture-rerecord': 'Nauhoita uudelleen',
    'audio-capture-resume': 'Jatka',
    'audio-capture-start': 'Ala',
    'audio-capture-stop': 'Lopeta',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, '1 toinen käyttäjä', '2 muuta käyttäjää');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 käyttäjä', '2 käyttäjää');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} suosittelee tätä`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` ja `, name2, ` suosittelevat tätä` ];
    },
    'bookmark-$you-bookmarked-it': 'Teit kirjanmerkin tähän',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Teit kirjanmerkin tähän (ja ${name} suosittelee sitä)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
        return [ `Teit kirjanmerkin tähän (ja `, others, ` suosittelevat tätä)` ];
    },
    'bookmark-recommendations': 'Suositukset',

    'bookmarks-no-bookmarks': 'Ei kirjanmerkkejä',

    'bottom-nav-bookmarks': 'Kirjanmerkit',
    'bottom-nav-news': 'Uutiset',
    'bottom-nav-notifications': 'Ilmoitukset',
    'bottom-nav-people': 'Ihmiset',
    'bottom-nav-settings': 'Asetukset',

    'confirmation-cancel': 'Peruutta',
    'confirmation-confirm': 'Vahvista',

    'development-code-push-$deployment': (deployment) => {
        return `Hanki koodipäivitykset arkistosta "${deployment}"`;
    },
    'development-show-diagnostics': 'Näytä diagnostiikka',
    'development-show-panel': 'Näytä tämä paneeli',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Takakamera',
    'device-selector-camera-front': 'Etukamera',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'Olet offline-tilassa',

    'image-editor-page-rendering-in-progress': 'Sivuston esikatselun luominen...',
    'image-editor-poster-extraction-in-progress': 'Esikatselun poistaminen videosta...',
    'image-editor-upload-in-progress': 'Lataus käynnissä...',

    'issue-cancel': 'Peruutta',
    'issue-delete': 'Poista',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos > 0) {
            objects.push(cardinal(photos, 'kuvan', 'kuvat'));
            ae = (photos === 1) ? 'an' : 'at';
        }
        if (videos > 0) {
            objects.push(cardinal(videos, 'videoleikeen', 'videoleikkeet'));
            if (!ae) {
                ae = (videos === 1) ? 'an' : 'at';
            }
        }
        if (audios > 0) {
            objects.push(cardinal(audios, 'audioleikeen', 'audioleikkeet'));
            if (!ae) {
                ae = (audios === 1) ? 'an' : 'at';
            }
        }
        let ve = (names.length === 1) ? 'i' : 'ivät';
        return `${list(names)} lähett${ve} seuraav${ae} ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        let e = (names.length === 1) ? 'i' : 'avat';
        return `${list(names)} kirjoitt${e}:`;
    },
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

    'membership-request-$you-are-member': 'Olet jäsenenä tässä hankkeessa',
    'membership-request-$you-are-now-member': 'Olet nyt jäsenenä tässä hankkeessa',
    'membership-request-$you-have-requested-membership': 'Olet pyytänyt jäsenyyttä tässä projektissa',
    'membership-request-browse': 'Selailla',
    'membership-request-cancel': 'Peruutta',
    'membership-request-join': 'Liittyä',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Etene',
    'membership-request-withdraw': 'Kumoa',

    'mobile-device-revoke': 'peruutta',
    'mobile-device-revoke-are-you-sure': 'Haluatko varmasti peruuttaa valtuutuksen tähän laitteeseen?',

    'mobile-setup-address': 'Palvelimen osoite',
    'mobile-setup-close': 'Sulje',
    'mobile-setup-code': 'Lupakoodi',
    'mobile-setup-project': 'Projekti',

    'news-no-stories-by-role': 'Ei juttuja, joilla on rooli',
    'news-no-stories-found': 'Vastaavia tarinoita ei löytynyt',
    'news-no-stories-on-date': 'Ei tarinoita tuona päivämääränä',
    'news-no-stories-yet': 'Ei tarinoita vielä',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} kutsui sinut muokkaamaan viestiä yhdessä`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} lisäsi viestisi raportointityökaluun`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'kyselysi'; break;
            case 'task-list': story = 'tehtäväluetteloasi'; break;
            case 'post': story = 'viestiäsi'; break;
            default: story = 'tarinaasi';
        }
        return `${name} kommentoi ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} täytti tehtävänsä luettelossasi`;
    },
    'notification-$name-is-assigned-to-your-$story': (name, story) => {
        switch (story) {
            case 'issue': story = 'asiallenne'; break;
            case 'merge-request': story = 'yhdistämispyyntösi'; break;
        }
        return `${name} oli määrätty asiallenne`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'kyselystäsi'; break;
            case 'task-list': story = 'tehtäväluettelostasi'; break;
            case 'post': story = 'viestistasi'; break;
            default: story = 'tarinastasi';
        }
        return `${name} tykää ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'kommentissa';
        return `${name} mainitsi sinut ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'kyselyssä'; break;
            case 'task-list': story = 'tehtäväluettelossa'; break;
            case 'post': story = 'viestissä'; break;
            case 'issue': story = 'asiassä'; break;
            case 'merge-request': story = 'yhdistämispyynnössä'; break;
            default: story = 'tarinassa';
        }
        return `${name} mainitsi sinut ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} yhdisti koodin haaraan “${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} avasi asian`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'commitiasi'; break;
            case 'issue': story = 'asiaasi'; break;
            case 'merge-request': story = 'yhdistämispyyntöäsi'; break;
        }
        return `${name} kommentoi ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} lähetti kyselyn`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} työnsi muutoksia haaraan “${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} pyysi liittymään tähän projektiin`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'kyselyyn'; break;
            case 'task-list': story = 'tehtäväluettelon'; break;
            case 'post': story = 'viestiin'; break;
            default: story = 'tarinaan';
        }
        return `${name} lähetti sinulle kirjanmerkin ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} vastasi kyselyynne`;
    },
    'notification-option-assignment': 'Kun joku on määritetty asiasi',
    'notification-option-bookmark': 'Kun joku lähettää sinulle kirjanmerkin',
    'notification-option-coauthor': 'Kun joku kutsuu sinut muokkaamaan viestiä yhdessä',
    'notification-option-comment': 'Kun joku kommentoi tarinaasi',
    'notification-option-issue': 'Kun joku avaa uuden asian',
    'notification-option-join-request': 'Kun joku haluaa liittyä tähän projektiin',
    'notification-option-like': 'Kun joku tykkää tarinastasi',
    'notification-option-mention': 'Kun joku mainitsee sinut tarinassa tai kommentissa',
    'notification-option-merge': 'Kun joku linkittää koodin master-haaraan',
    'notification-option-note': 'Kun joku lähettää viestin commitista tai liikkeestä',
    'notification-option-push': 'Kun joku työntää koodia arkistoon',
    'notification-option-survey': 'Kun joku lähettää kyselyn',
    'notification-option-task-completion': 'Kun joku täyttää tehtävän luettelossasi',
    'notification-option-vote': 'Kun joku vastaa kyselyyn',
    'notification-option-web-session': 'Kun web-istunto on aktiivinen',

    'notifications-no-notifications-on-date': 'Ei ilmoituksia kyseisestä päivästä',
    'notifications-no-notifications-yet': 'Ei vielä ilmoituksia',

    'option-add-bookmark': 'Lisää kirjanmerkki',
    'option-add-issue': 'Lisää viesti raportointityökaluun',
    'option-bump-story': 'Edistä tarina',
    'option-edit-comment': 'Muokkaa kommenttia',
    'option-edit-post': 'Muokkaa viestiä',
    'option-hide-comment': 'Piilota kommentti vieraille',
    'option-hide-story': 'Piilota tarina vieraille',
    'option-keep-bookmark': 'Pidä kirjanmerkin',
    'option-remove-comment': 'Poista kommentti',
    'option-remove-story': 'Poista tarina',
    'option-send-bookmarks': 'Lähetä kirjanmerkit muille käyttäjille',
    'option-send-bookmarks-to-$count-users': (count) => {
        return `Lähetä kirjanmerkit ${count} käyttäjälle`;
    },
    'option-show-media-preview': 'Näytä liitetiedostot',
    'option-show-text-preview': 'Näytä tekstin esikatselu',
    'option-statistics-14-days': 'Näytä viimeisten 14 päivän aktiviteetit',
    'option-statistics-biweekly': 'Näytä kaksivuotiset aktiviteetit',
    'option-statistics-monthly': 'Näytä kuukausittaiset aktiviteetit',
    'option-statistics-to-date': 'Näytä aktiviteetit tähän mennessä',

    'people-no-stories-found': 'Vastaavia tarinoita ei löytynyt',
    'people-no-stories-on-date': 'Ei toimintaa kyseisenä päivänä',
    'people-no-users-by-role': 'Mikään projektin jäsen ei ole tällainen rooli',
    'people-no-users-yet': 'Ei projektin jäseniä vielä',

    'person-no-stories-found': 'Vastaavia tarinoita ei löytynyt',
    'person-no-stories-on-date': 'Ei tarinoita tuona päivämääränä',
    'person-no-stories-yet': 'Ei tarinoita vielä',

    'photo-capture-accept': 'Hyväksy',
    'photo-capture-cancel': 'Peruutta',
    'photo-capture-retake': 'Ota uudelleen',
    'photo-capture-snap': 'Ota',

    'project-description-close': 'Sulje',

    'project-management-add': 'Lisää',
    'project-management-cancel': 'Peruutta',
    'project-management-description': 'hankkeen kuvaus',
    'project-management-join-project': 'liittyä projektiin',
    'project-management-manage': 'Hallitse luetteloa',
    'project-management-mobile-set-up': 'mobiililaitteisto',
    'project-management-remove': 'Poista',
    'project-management-sign-out': 'kirjaudu ulos',
    'project-management-sign-out-are-you-sure': 'Haluatko varmasti kirjautua ulos tästä palvelimesta?',
    'project-management-withdraw-request': 'kumoaa jäsenpyyntö',

    'qr-scanner-cancel': 'Peruutta',
    'qr-scanner-code-found': 'QR-koodi löytyi',
    'qr-scanner-code-invalid': 'Virheellinen QR-koodi',
    'qr-scanner-code-used': 'Vanhentunut QR-koodi',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name} lisäsi tämän viestin raportointityökaluun`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name} äänesti`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name} kommentoi tätä haaraa`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name} kommentoi tätä asiaa`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name} kommentoi tätä yhdistämistä`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name} kommentoi tätä yhdistämispyyntöä`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name} kommentoi tätä työntöä`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        return `${name} kommentoi tätä tagia`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name} suoritti tehtävän`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name} oli määrätty tähän asiaan`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name} oli määrätty tähän yhdistämispyyntöön`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} muokkaa kommenttia...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} lähettää kommentin...`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} muokkaa kommenttia...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} kirjoittaa kommentin...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} tykkää tästä`;
    },
    'reaction-status-storage-pending': 'Odotettaessa',
    'reaction-status-transcoding': 'Koodaaminen',
    'reaction-status-uploading': 'Lataaminen',

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

    'settings-development': 'Kehittäjän asetukset',
    'settings-device': 'Mobiililaite',
    'settings-devices': 'Mobiililaitteet',
    'settings-language': 'Kieli',
    'settings-mobile-alert': 'Mobiilihälytys',
    'settings-notification': 'Ilmoitukset',
    'settings-profile-image': 'Profiilikuva',
    'settings-projects': 'Projektit',
    'settings-social-networks': 'Sosiaaliset verkostot',
    'settings-user-information': 'Käyttäjäprofiili',
    'settings-web-alert': 'Web-hälytys',

    'social-network-github': 'GitHub-profiilin URL-osoite',
    'social-network-gitlab': 'GitLab-profiilin URL-osoite',
    'social-network-ichat': 'iChat-käyttäjänimi',
    'social-network-linkedin': 'LinkedIn-profiilin URL-osoite',
    'social-network-skype': 'Skype-käyttäjänimi',
    'social-network-slack': 'Slack-käyttäjätunniste',
    'social-network-slack-team': 'Slack-ryhmätunniste',
    'social-network-stackoverflow': 'StackOverflow-profiilin URL-osoite',
    'social-network-twitter': 'Twitter-käyttäjänimi',

    'start-activation-add-server': 'Lisää projekti toiselta palvelimelta',
    'start-activation-instructions': (ui) => {
        return [
            'Jos haluat käyttää tämän laitteen palvelimella varustettua palvelinta, kirjaudu ensin palvelimeen WWW-selaimella. Valitse projekti ja siirry sitten ',
            ui.settings,
            '-kohtaan. Valitse ',
            ui.projects,
            '-paneelissa ',
            ui.mobileSetup,
            '. QR-koodi ilmestyy näytölle. Paina tätä laitetta painamalla alla olevaa painiketta ja skannaa koodi. Vaihtoehtoisesti voit syöttää aktivointikoodin manuaalisesti.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Kirjaudu sisään WWW-selaimella ja skannaa QR koodi joka näkyy sivulla ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Manuaalisesti',
    'start-activation-new-server': 'Uusi palvelin',
    'start-activation-others-servers': 'Käytettävissä olevat palvelimet',
    'start-activation-return': 'Palata',
    'start-activation-scan-code': 'Skannaa QR-koodi',
    'start-error-access-denied': 'Hakuhakemus hylättiin',
    'start-error-account-disabled': 'Tili on tällä hetkellä poissa käytöstä',
    'start-error-existing-users-only': 'Ainoastaan valtuutettu henkilöstö voi käyttää tätä järjestelmää',
    'start-error-undefined': 'Odottamaton virhe',
    'start-no-projects': 'Ei projekteja',
    'start-no-servers': 'Ei OAuth-palveluntarjoajia',
    'start-projects': 'Projektit',
    'start-social-login': 'Sosiaalinen sisäänkirjautuminen',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Tervetuloa!',
    'start-welcome-again': 'Tervetuloa uudelleen',

    'statistics-bar': 'Pylväs',
    'statistics-line': 'Viiva',
    'statistics-pie': 'Ympyrä',

    'story-$count-reactions': (count) => {
        return cardinal(count, '1 reaktio', '2 reaktiota');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `Loi haaran “${branch}” projektissa “${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `Loi virstanpylvään “${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        return `Loi wiki-sivun “${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let text = `Loi projektin`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        return `Loi tagin “${tag}” projektissa “${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `Poisti wiki-sivun “${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `Poisti projektin`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `Toi projektin`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let text = `Liittyi projektiin`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let text = `Lähti projektista`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let text = `Yhdisti koodin`;
        if (branches && branches.length > 0) {
            let sources = branches.map((branch) => {
                return `“${branch}”`;
            });
            text += cardinal(sources.length, ' haarasta', ' haaroista');
            text += sources.join(', ');
        }
        text += ` haaraan “${branch}”`;
        if (repo) {
            text += ` projektin “${repo}”`;
        }
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        let text = `Avasi asian ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let text = `Painoi muutoksia haaraan “${branch}”`;
        if (repo) {
            text += ` projektin “${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `Pyysi yhdistämään haaran “${branch1}” haaraan “${branch2}”`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `Päivitti wiki-sivun “${page}”`;
    },
    'story-add-coauthor': 'Lisää kirjoittaja',
    'story-add-remove-coauthor': 'Lisää/Poista kirjailija',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return `${count} muuta`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` ja `, name2 ];
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
    'story-issue-status-merged': 'Yhdistetty',
    'story-issue-status-opened': 'Avoinna',
    'story-issue-status-reopened': 'Avattu uudelleen',
    'story-like': 'Tykkää',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Eräpäivä:',
    'story-milestone-start-date': 'Aloituspäivä:',
    'story-options': 'Vaihtoehdot',
    'story-paste-image-here': 'Myös tekstieditoriin liitetty kuva päätyy tänne',
    'story-pending': 'Odotettaessa...',
    'story-photo': 'Kuva',
    'story-post': 'Viesti',
    'story-push-added-$count-files': (count) => {
        let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
        return `${files} lisätty`;
    },
    'story-push-added-$count-lines': (count) => {
        let lines = cardinal(count, '1 rivi', '2 riviä');
        return `${lines} lisätty`;
    },
    'story-push-components-changed': 'Seuraavat osat muutettiin:',
    'story-push-deleted-$count-files': (count) => {
        let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
        return `${files} poistettiin`;
    },
    'story-push-deleted-$count-lines': (count) => {
        let lines = cardinal(count, '1 rivi', '2 riviä');
        return `${lines} poistettiin`;
    },
    'story-push-modified-$count-files': (count) => {
        let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
        return `${files} muokattu`;
    },
    'story-push-modified-$count-lines': (count) => {
        let lines = cardinal(count, '1 rivi', '2 riviä');
        return `${lines} muokattu`;
    },
    'story-push-renamed-$count-files': (count) => {
        let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
        return `${files} nimettiin uudelleen`;
    },
    'story-remove-yourself': 'Poista itsesi',
    'story-remove-yourself-are-you-sure': 'Haluatko varmasti poistaa itsesi kirjoittajaksi??',
    'story-status-storage-pending': 'Odotettaessa',
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

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'Päivä', '2 päivää');
        return `${time} sitten`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'Tunti', '2 tuntia');
        return `${time} sitten`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} t. sitten`;
    },
    'time-$min-ago': (min) => {
        return `${min} m. sitten`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'Minuutti', '2 minuuttia');
        return `${time} sitten`;
    },
    'time-just-now': 'Juuri nyt',
    'time-yesterday': 'Eilen',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 tiedosto', '2 tiedostoa');
        return `Lataaminen ${files}, ${size} jäljellä`;
    },

    'user-actions': 'Toimet',

    'user-activity-$name-created-branch': 'Luonut uuden haaran',
    'user-activity-$name-created-merge-request': 'Teki yhdistämispyynnön',
    'user-activity-$name-created-milestone': 'Loi virstanpylvään',
    'user-activity-$name-created-repo': 'Loi git-projektin',
    'user-activity-$name-created-tag': 'Luonut uuden tagin',
    'user-activity-$name-deleted-repo': 'Poisti git-projektin',
    'user-activity-$name-edited-wiki-page': 'Muokkasi wiki-sivua',
    'user-activity-$name-imported-repo': 'Toi git-projektin',
    'user-activity-$name-joined-repo': 'Liittyi git-projektiin',
    'user-activity-$name-left-repo': 'Jätti git-projektin',
    'user-activity-$name-merged-code': 'Teki koodin yhdistämisen',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'äänileikkeen', '2 äänileikkeitä');
        return `Lähetti ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, 'linkin verkkosivustoon', 'linkit 2 verkkosivustoon')
        return `Lähetti ${links}`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'kuvan', '2 kuvaa');
        return `Lähetti ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'videoleikeen', '2 videoleikkeitä');
        return `Lähetti ${videos}`;
    },
    'user-activity-$name-pushed-code': 'Siirretty koodi arkistolle',
    'user-activity-$name-reported-issue': 'Ilmoitti asiasta',
    'user-activity-$name-started-survey': 'Aloitti kyselyn',
    'user-activity-$name-started-task-list': 'Aloitti tehtäväluettelon',
    'user-activity-$name-wrote-post': 'Kirjoitti viestin',
    'user-activity-back': 'Palataa',
    'user-activity-more': 'Lisää',

    'user-image-adjust': 'Säädä',
    'user-image-cancel': 'Peruutta',
    'user-image-replace': 'Vaihda',
    'user-image-save': 'Tallenna',
    'user-image-select': 'Valitse',
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
    'user-statistics-legend-member': 'Jäsenmuutokset',
    'user-statistics-legend-merge': 'Yhdistämiset',
    'user-statistics-legend-merge-request': 'Yhdistämispyynnöt',
    'user-statistics-legend-milestone': 'Virstanpylväät',
    'user-statistics-legend-post': 'Viestejä',
    'user-statistics-legend-push': 'Työnnöt',
    'user-statistics-legend-repo': 'Muutokset arkistoon',
    'user-statistics-legend-survey': 'Kyselyt',
    'user-statistics-legend-tag': 'Tagit',
    'user-statistics-legend-task-list': 'Tehtäväluettelot',
    'user-statistics-legend-wiki': 'Wiki-muokkaukset',
    'user-statistics-today': 'Tänään',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 haara', '2 haaraa');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 asia', '2 asiaa');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 jäsenmuutos', '2 jäsenmuutosta');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 yhdistäminen', '2 yhdistämistä');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 yhdistämisenpyyntö', '2 yhdistämispyyntöä');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 virstanpylväs', '2 virstanpylvästä');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 viesti', '2 viestiä');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 työntö', '2 työntöä');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 muutos arkistoon', '2 muutosta arkistoon');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 kysely', '2 kyselystä');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tagi', '2 tagia');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 tehtäväluettelo', '2 tehtäväluetteloa');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki muokkaus', '2 wiki muokkausta');
    },

    'video-capture-accept': 'Hyväksy',
    'video-capture-cancel': 'Peruutta',
    'video-capture-pause': 'Pysähdy',
    'video-capture-resume': 'Jatka',
    'video-capture-retake': 'Nauhoita uudelleen',
    'video-capture-start': 'Ala',
    'video-capture-stop': 'Lopeta',

    'warning-no-connection': 'Ei välitöntä päivitystä',
};

export {
    phrases,
};
