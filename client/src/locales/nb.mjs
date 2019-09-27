import 'moment/locale/nb';
import { cardinal, list } from 'common/locale/grammars/norwegian.mjs';

const phrases = {
    'action-contact-by-email': 'Kontakt via e-post',
    'action-contact-by-ichat': 'Kontakt via iChat',
    'action-contact-by-phone': 'Kontakt via telefon',
    'action-contact-by-skype': 'Kontakt via Skype',
    'action-contact-by-slack': 'Kontakt via Slack',
    'action-contact-by-twitter': 'Kontakt via Twitter',
    'action-view-github-page': 'Se GitHub-siden',
    'action-view-gitlab-page': 'Se GitLab-siden',
    'action-view-linkedin-page': 'Se LinkedIn-siden',
    'action-view-stackoverflow-page': 'Se Stack-Overflow-siden',

    'activation-address': 'Server adresse',
    'activation-cancel': 'Avbryt',
    'activation-code': 'Aktiviseringskode',
    'activation-ok': 'OK',
    'activation-schema': 'Prosjekt',

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, '1 nytt bokmerke', '2 nye bokmerker');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 ny melding', '2 nye meldinger');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 ny historie', '2 nye historier');
    },

    'app-component-close': 'Lukk',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Aksepter',
    'audio-capture-cancel': 'Avbryt',
    'audio-capture-pause': 'Pause',
    'audio-capture-rerecord': 'Ta opp igjen',
    'audio-capture-resume': 'Gjenoppta',
    'audio-capture-start': 'Start',
    'audio-capture-stop': 'Stopp',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, '1 annen bruker', '2 andre brukere');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 brukere', '2 brukere');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} anbefaler dette`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` og `, name2, ` anbefaler dette` ];
    },
    'bookmark-$you-bookmarked-it': 'Du har laget et bokmerke til dette',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Du har laget et bokmerke til dette (og ${name} anbefaler dette)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
        return [ `Du har laget et bokmerke til dette (og `, others, `  anbefaler dette)` ];
    },
    'bookmark-recommendations': 'Anbefalinger',

    'bookmarks-no-bookmarks': 'Ingen bokmerker',

    'bottom-nav-bookmarks': 'Bokmerker',
    'bottom-nav-news': 'Nyheter',
    'bottom-nav-notifications': 'Varslinger',
    'bottom-nav-people': 'Mennesker',
    'bottom-nav-settings': 'Innstillinger',

    'confirmation-cancel': 'Avbryt',
    'confirmation-confirm': 'Bekrefte',

    'country-name-ad': 'Andorra',
    'country-name-ae': 'Forente arabiske emirater',
    'country-name-af': 'Afghanistan',
    'country-name-ag': 'Antigua og Barbuda',
    'country-name-al': 'Albania',
    'country-name-am': 'Armenia',
    'country-name-ao': 'Angola',
    'country-name-ar': 'Argentina',
    'country-name-at': 'Østerrike',
    'country-name-au': 'Australia',
    'country-name-az': 'Aserbajdsjan',
    'country-name-ba': 'Bosnia og Herzegovina',
    'country-name-bb': 'Barbados',
    'country-name-bd': 'Bangladesh',
    'country-name-be': 'Belgia',
    'country-name-bf': 'Burkina Faso',
    'country-name-bg': 'Bulgaria',
    'country-name-bh': 'Bahrain',
    'country-name-bi': 'Burundi',
    'country-name-bj': 'Benin',
    'country-name-bn': 'Brunei',
    'country-name-bo': 'Bolivia',
    'country-name-br': 'Brasil',
    'country-name-bs': 'Bahamas',
    'country-name-bt': 'Bhutan',
    'country-name-bw': 'Botswana',
    'country-name-by': 'Hviterussland',
    'country-name-bz': 'Belize',
    'country-name-ca': 'Canada',
    'country-name-cd ': 'Kongo',
    'country-name-cf': 'Sentralafrikanske republikk',
    'country-name-cg': 'Republikken Kongo',
    'country-name-ch': 'Sveits',
    'country-name-ci': 'Elfenbenskysten',
    'country-name-cl': 'Chile',
    'country-name-cm': 'Kamerun',
    'country-name-cn': 'Kina',
    'country-name-co': 'Colombia',
    'country-name-cr': 'Costa Rica',
    'country-name-cu': 'Cuba',
    'country-name-cv': 'Kapp Verde',
    'country-name-cy': 'Kypros',
    'country-name-cz': 'Tsjekkisk Republikk',
    'country-name-de': 'Tyskland',
    'country-name-dj': 'Djibouti',
    'country-name-dk': 'Danmark',
    'country-name-dm': 'Dominica',
    'country-name-do': 'Dominikanske republikk',
    'country-name-dz': 'Algerie',
    'country-name-ec': 'Ecuador',
    'country-name-ee': 'Estland',
    'country-name-eg': 'Egypt',
    'country-name-er': 'Eritrea',
    'country-name-es': 'Spania',
    'country-name-et': 'Etiopia',
    'country-name-fi': 'Finland',
    'country-name-fj': 'Fiji',
    'country-name-fm': 'Mikronesia',
    'country-name-fr': 'Frankrike',
    'country-name-ga': 'Gabon',
    'country-name-gb': 'Storbritannia',
    'country-name-gd': 'Grenada',
    'country-name-ge': 'Georgia',
    'country-name-gh': 'Ghana',
    'country-name-gm': 'Gambia',
    'country-name-gn': 'Guinea',
    'country-name-gq': 'Ekvatorial-Guinea',
    'country-name-gr': 'Hellas',
    'country-name-gt': 'Guatemala',
    'country-name-gw': 'Guinea-Bissau',
    'country-name-gy': 'Guyana',
    'country-name-hk': 'Hong Kong',
    'country-name-hn': 'Honduras',
    'country-name-hr': 'Kroatia',
    'country-name-ht': 'Haiti',
    'country-name-hu': 'Ungarn',
    'country-name-id': 'Indonesia',
    'country-name-ie': 'Irland',
    'country-name-il': 'Israel',
    'country-name-in': 'India',
    'country-name-iq': 'Irak',
    'country-name-ir': 'Iran',
    'country-name-is': 'Island',
    'country-name-it': 'Italia',
    'country-name-jm': 'Jamaica',
    'country-name-jo': 'Jordan',
    'country-name-jp': 'Japan',
    'country-name-ke': 'Kenya',
    'country-name-kg': 'Kirgisistan',
    'country-name-kh': 'Kambodsja',
    'country-name-ki': 'Kiribati',
    'country-name-km': 'Komorene',
    'country-name-kn': 'Saint Kitts og Nevis',
    'country-name-kp': 'Nord-Korea',
    'country-name-kr': 'Sør-Korea',
    'country-name-kw': 'Kuwait',
    'country-name-kz': 'Kasakhstan',
    'country-name-la': 'Laos',
    'country-name-lb': 'Libanon',
    'country-name-lc': 'Saint Lucia',
    'country-name-li': 'Liechtenstein',
    'country-name-lk': 'Sri Lanka',
    'country-name-lr': 'Liberia',
    'country-name-ls': 'Lesotho',
    'country-name-lt': 'Litauen',
    'country-name-lu': 'Luxembourg',
    'country-name-lv': 'Latvia',
    'country-name-ly': 'Libya',
    'country-name-ma': 'Marokko',
    'country-name-mc': 'Monaco',
    'country-name-md': 'Moldova',
    'country-name-me': 'Montenegro',
    'country-name-mg': 'Madagaskar',
    'country-name-mh': 'Marshalløyene',
    'country-name-mk': 'Nord-Makedonia',
    'country-name-ml': 'Mali',
    'country-name-mm': 'Myanmar',
    'country-name-mn': 'Mongolia',
    'country-name-mo': 'Macau',
    'country-name-mr': 'Mauritania',
    'country-name-mt': 'Malta',
    'country-name-mu': 'Mauritius',
    'country-name-mv': 'Maldivene',
    'country-name-mw': 'Malawi',
    'country-name-mx': 'Mexico',
    'country-name-my': 'Malaysia',
    'country-name-mz': 'Mosambik',
    'country-name-na': 'Namibia',
    'country-name-ne': 'Niger',
    'country-name-ng': 'Nigeria',
    'country-name-ni': 'Nicaragua',
    'country-name-nl': 'Nederland',
    'country-name-no': 'Norge',
    'country-name-np': 'Nepal',
    'country-name-nr': 'Nauru',
    'country-name-nz': 'New Zealand',
    'country-name-om': 'Oman',
    'country-name-pa': 'Panama',
    'country-name-pe': 'Peru',
    'country-name-pg': 'Papua Ny Guinea',
    'country-name-ph': 'Filippinene',
    'country-name-pk': 'Pakistan',
    'country-name-pl': 'Polen',
    'country-name-ps': 'Palestina',
    'country-name-pt': 'Portugal',
    'country-name-pw': 'Palau',
    'country-name-py': 'Paraguay',
    'country-name-qa': 'Qatar',
    'country-name-ro': 'Romania',
    'country-name-rs': 'Serbia',
    'country-name-ru': 'Russland',
    'country-name-rw': 'Rwanda',
    'country-name-sa': 'Saudi Arabia',
    'country-name-sb': 'Solomon øyene',
    'country-name-sc': 'Seychellene',
    'country-name-sd': 'Sudan',
    'country-name-se': 'Sverige',
    'country-name-sg': 'Singapore',
    'country-name-si': 'Slovenia',
    'country-name-sk': 'Slovakia',
    'country-name-sl': 'Sierra Leone',
    'country-name-sm': 'San Marino',
    'country-name-sn': 'Senegal',
    'country-name-so': 'Somalia',
    'country-name-sr': 'Surinam',
    'country-name-ss': 'Sør-Sudan',
    'country-name-st': 'São Tomé og Príncipe',
    'country-name-sv': 'El Salvador',
    'country-name-sy': 'Syria',
    'country-name-sz': 'Eswatini',
    'country-name-td': 'Tsjad',
    'country-name-tg': 'Togo',
    'country-name-th': 'Thailand',
    'country-name-tj': 'Tadsjikistan',
    'country-name-tl': 'Øst-Timor',
    'country-name-tm': 'Turkmenistan',
    'country-name-tn': 'Tunisia',
    'country-name-to': 'Tonga',
    'country-name-tr': 'Tyrkia',
    'country-name-tt': 'Trinidad og Tobago',
    'country-name-tv': 'Tuvalu',
    'country-name-tw': 'Taiwan',
    'country-name-tz': 'Tanzania',
    'country-name-ua': 'Ukraina',
    'country-name-ug': 'Uganda',
    'country-name-us': 'Forente stater',
    'country-name-uy': 'Uruguay',
    'country-name-uz': 'Usbekistan',
    'country-name-va': 'Holy See',
    'country-name-vc': 'Saint Vincent og Grenadinene',
    'country-name-ve': 'Venezuela',
    'country-name-vn': 'Vietnam',
    'country-name-vu': 'Vanuatu',
    'country-name-ws': 'Samoa',
    'country-name-ye': 'Jemen',
    'country-name-za': 'Sør-Afrika',
    'country-name-zm': 'Zambia',
    'country-name-zw': 'Zimbabwe',
    'country-name-zz': 'Andre',

    'development-code-push-$deployment': (deployment) => {
        return `Hent kodeoppdateringer fra "${deployment}"`;
    },
    'development-show-diagnostics': 'Vis diagnostikk',
    'development-show-panel': 'Vis dette panelet',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Bakre',
    'device-selector-camera-front': 'Front',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'Du er frakoblet',

    'image-editor-image-transfer-in-progress': 'Kopierer bilde fra web-side...',
    'image-editor-page-rendering-in-progress': 'Gjengir forhåndsvisning av nettsiden...',
    'image-editor-poster-extraction-in-progress': 'Trekker ut forhåndsvisning fra video...',
    'image-editor-upload-in-progress': 'Opplasting pågår...',

    'issue-cancel': 'Avbryt',
    'issue-delete': 'Slett',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        if (photos > 0) {
            objects.push(cardinal(photos, 'bilde', 'bilder'));
        }
        if (videos > 0) {
            objects.push('videoklipp');
        }
        if (audios > 0) {
            objects.push('audioklipp');
        }
        return `${list(names)} postet følgende ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        return `${list(names)} skrev:`;
    },
    'issue-ok': 'OK',
    'issue-repo': 'Prosjekt',
    'issue-title': 'Tittel',

    'list-$count-more': (count) => {
        return `${count} flere...`;
    },

    'media-close': 'Lukk',
    'media-download-original': 'Last ned originalfilen',
    'media-editor-embed': 'Legg inn i tekst',
    'media-editor-remove': 'Fjern',
    'media-editor-shift': 'Skift',
    'media-next': 'Neste',
    'media-previous': 'Tidligere',

    'membership-request-$you-are-member': 'Du er medlem av dette prosjektet',
    'membership-request-$you-are-now-member': 'Du er nå medlem av dette prosjektet',
    'membership-request-$you-have-requested-membership': 'Du har bedt om medlemskap i dette prosjektet',
    'membership-request-browse': 'Bla',
    'membership-request-cancel': 'Avbryt',
    'membership-request-join': 'Bli med',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Fortsett',
    'membership-request-withdraw': 'Opphev',

    'mobile-device-revoke': 'tilbakekalle',
    'mobile-device-revoke-are-you-sure': 'Er du sikker på at du vil tilbakekalle autorisasjon til denne enheten?',

    'mobile-setup-address': 'Server adresse',
    'mobile-setup-close': 'Lukk',
    'mobile-setup-code': 'Autorisasjonskode',
    'mobile-setup-project': 'Prosjekt',

    'news-no-stories-by-role': 'Ingen historier av noen med den rollen',
    'news-no-stories-found': 'Ingen matchende historier funnet',
    'news-no-stories-on-date': 'Ingen historier på den datoen',
    'news-no-stories-yet': 'Ingen historier ennå',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} inviterte deg til å redigere et innlegg`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} la til innlegget ditt til feilrapporteringssystemet`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'undersøkelsen din'; break;
            case 'task-list': story = 'oppgavelisten din'; break;
            case 'post': story = 'innlegget ditt'; break;
            default: story = 'historien din';
        }
        return `${name} kommenterte ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} fullførte en oppgave på listen din`;
    },
    'notification-$name-is-assigned-to-your-$story': (name, story) => {
        switch (story) {
            case 'issue': story = 'problemet ditt'; break;
            case 'merge-request': story = 'merge-requesten din'; break;
        }
        return `${name} ble tildelt ${story}`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'undersøkelsen din'; break;
            case 'task-list': story = 'oppgavelisten din'; break;
            case 'post': story = 'innlegget ditt';
            default: story = 'historien din';
        }
        return `${name} liker ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'i en kommentar';
        return `${name} nevnte deg ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'i en undersøkelse'; break;
            case 'task-list': story = 'på en oppgaveliste'; break;
            case 'post': story = 'i et innlegg'; break;
            case 'issue': story = 'i et problem'; break;
            case 'merge-request': story = 'i en merge-request'; break;
            default: story = 'in en historie';
        }
        return `${name} nevnte deg ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} merget kode inn i branchen “${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} åpnet et problem`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'commiten din'; break;
            case 'issue': story = 'problemet ditt'; break;
            case 'merge-request': story = 'merge-requesten din'; break;
        }
        return `${name} kommenterte ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} skrev en undersøkelse`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} pushet forandringer til branchen “${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} ba om å bli med i dette prosjektet`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'en undersøkelse'; break;
            case 'task-list': story = 'en oppgavelist'; break;
            case 'post': story = 'et innlegg'; break;
            default: story = 'en historie';
        }
        return `${name} sendte deg et bokmerke til ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} svarte på undersøkelsen din`;
    },
    'notification-option-assignment': 'Når noen er tildelt problemet ditt',
    'notification-option-bookmark': 'Når noen sender deg et bokmerke',
    'notification-option-coauthor': 'Når noen inviterer deg til å redigere et innlegg',
    'notification-option-comment': 'Når noen kommenterer innlegget ditt',
    'notification-option-issue': 'Når noen åpner et problem',
    'notification-option-join-request': 'Når noen ønsker å bli med i dette prosjektet',
    'notification-option-like': 'Når noen liker historien din',
    'notification-option-mention': 'Når noen nevner deg i en historie eller kommentar',
    'notification-option-merge': 'Når noen fusjonerer kode inn i master versjonen',
    'notification-option-note': 'Når noen legger inn et notat om et begå eller et problem',
    'notification-option-push': 'Når noen trykker på kode i Git',
    'notification-option-survey': 'Når noen legger inn en undersøkelse',
    'notification-option-task-completion': 'Når noen fullfører en oppgave på listen din',
    'notification-option-vote': 'Når noen svarer på undersøkelsen din',
    'notification-option-web-session': 'Når en web økt er aktiv',

    'notifications-no-notifications-on-date': 'Ingen varsler på den datoen',
    'notifications-no-notifications-yet': 'Ingen varsler ennå',

    'option-add-bookmark': 'Legg til bokmerke',
    'option-add-issue': 'Legg til innlegg til feilrapporteringssystemet',
    'option-bump-story': 'Støt opp denne historien',
    'option-edit-comment': 'Rediger kommentaren',
    'option-edit-post': 'Rediger innlegget',
    'option-hide-comment': 'Skjul kommentaren fra gjester',
    'option-hide-story': 'Skjul historien fra gjester',
    'option-keep-bookmark': 'Behold bokmerke',
    'option-remove-comment': 'Fjern kommentaren',
    'option-remove-story': 'Fjern historien',
    'option-send-bookmarks': 'Send bokmerker til andre brukere',
    'option-send-bookmarks-to-$count-users': (count) => {
        let users = cardinal(count, '1 bruker', '2 brukere');
        let bookmarks = cardinal(count, 'bokmerke', 'bokmerker');
        return `Send ${bookmarks} to ${users}`;
    },
    'option-show-media-preview': 'Vis vedlagte medier',
    'option-show-text-preview': 'Vis tekstforhåndsvisning',
    'option-statistics-14-days': 'Vis aktiviteter de siste 14 dagene',
    'option-statistics-biweekly': 'Vis  bi-ukentlige aktiviteter',
    'option-statistics-monthly': 'Vis månedlige aktiviteter',
    'option-statistics-to-date': 'Vis aktivitet til dags dato',

    'people-no-stories-found': 'Ingen matchende historier funnet',
    'people-no-stories-on-date': 'Ingen aktiviteter på den datoen',
    'people-no-users-by-role': 'Ingen prosjektmedlem har den rollen',
    'people-no-users-yet': 'Ingen prosjektmedlemmer ennå',

    'person-no-stories-found': 'Ingen matchende historier funnet',
    'person-no-stories-on-date': 'Ingen historier på den datoen',
    'person-no-stories-yet': 'Ingen historier ennå',

    'photo-capture-accept': 'Aksepter',
    'photo-capture-cancel': 'Avbryt',
    'photo-capture-retake': 'Ta om igjen',
    'photo-capture-snap': 'Ta',

    'project-description-close': 'Lukk',

    'project-management-add': 'Legg til',
    'project-management-cancel': 'Avbryt',
    'project-management-description': 'prosjektbeskrivelse',
    'project-management-join-project': 'bli med i prosjektet',
    'project-management-manage': 'Administrer liste',
    'project-management-mobile-set-up': 'mobil oppsett',
    'project-management-remove': 'Fjerne',
    'project-management-sign-out': 'Logg ut',
    'project-management-sign-out-are-you-sure': 'Er du sikker på at du vil logge deg ut fra denne serveren?',
    'project-management-withdraw-request': 'opphev medlemskapsforespørselen',

    'qr-scanner-cancel': 'Avbryt',
    'qr-scanner-code-found': 'QR-kode funnet',
    'qr-scanner-code-invalid': 'Ugyldig QR-kode',
    'qr-scanner-code-used': 'Utdatert QR-kode',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name} la til dette innlegget til feilrapporteringssystemet`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name} stemte`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name} kommenterte denne branchen`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name} kommenterte dette problemet`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name} kommenterte denne mergen`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name} kommenterte denne merge-requesten`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name} kommenterte denne pushen`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        return `${name} kommenterte denne taggen`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name} fullførte en oppgave`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name} ble tildelt dette problemet`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name} ble tildelt denne merge-requesten`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} redigerer en kommentar...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} sender en kommentar...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} skriver en kommentar...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} liker dette`;
    },
    'reaction-status-storage-pending': 'I påvente av',
    'reaction-status-transcoding': 'Transkoding',
    'reaction-status-uploading': 'Opplasting',

    'role-filter-no-roles': 'Ingen roller definert',

    'search-bar-keywords': 'Søkeorder',

    'selection-cancel': 'Avbryt',
    'selection-ok': 'OK',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-development': 'Utviklermuligheter',
    'settings-device': 'Mobil enhet',
    'settings-devices': 'Mobile enheter',
    'settings-language': 'Språk',
    'settings-mobile-alert': 'Mobilvarsel',
    'settings-notification': 'Melding',
    'settings-profile-image': 'Profilbilde',
    'settings-projects': 'Prosjekter',
    'settings-social-networks': 'Sosiale nettverk',
    'settings-user-information': 'Brukerinformasjon',
    'settings-web-alert': 'Webvarsel',

    'social-network-github': 'GitHub profil URL',
    'social-network-gitlab': 'GitLab profil URL',
    'social-network-ichat': 'iChat brukernavn',
    'social-network-linkedin': 'Linkedin profil URL',
    'social-network-skype': 'Skype brukernavn',
    'social-network-slack': 'Slack bruker-id',
    'social-network-slack-team': 'Slack team-id',
    'social-network-stackoverflow': 'Stack Overflow profil URL',
    'social-network-twitter': 'Twitter brukernavn',

    'start-activation-add-server': 'Legg til prosjekt fra en annen server',
    'start-activation-instructions': (ui) => {
        return [
            'For å få tilgang til en Trambar-server på denne enheten, logg først på serveren ved å bruke en nettleser. Velg et prosjekt og gå til ',
            ui.settings,
            '. Klikk på ',
            ui.mobileSetup,
            ' i panelet ',
            ui.projects,
            '. En QR-kode vil vises på skjermen. Deretter på denne enheten, trykk på knappen nedenfor og skann koden. Alternativt kan du legge inn aktiveringskoden manuelt.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Logg inn med en nettleser, og skann deretter QR-koden som vises på ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Manuelt',
    'start-activation-new-server': 'Ny server',
    'start-activation-others-servers': 'Tilgjengelige servere',
    'start-activation-return': 'Tilbake',
    'start-activation-scan-code': 'Skann QR kode',
    'start-error-access-denied': 'Forespørsel om tilgang avvist',
    'start-error-account-disabled': 'Kontoen er for øyeblikket deaktivert',
    'start-error-existing-users-only': 'Kun autorisert personell kan få tilgang til dette systemet',
    'start-error-undefined': 'Uventet feil',
    'start-no-projects': 'Ingen prosjekter',
    'start-no-servers': 'Ingen OAuth-leverandører',
    'start-projects': 'Prosjekter',
    'start-social-login': 'Sosial pålogging',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Velkommen!',
    'start-welcome-again': 'Velkommen igjen',

    'statistics-bar': 'Søyle',
    'statistics-line': 'Linje',
    'statistics-pie': 'Kake',

    'story-$count-reactions': (count) => {
        return cardinal(count, '1 reaksjon', '2 reaksjoner');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `Skapte branchen “${branch}” i prosjektet “${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `Skapte milepæl “${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        return `Opprettet wiki-siden “${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let text = `Opprettet prosjektet`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        return `Skapte taggen “${tag}” i prosjektet “${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `Fjernet wiki-siden “${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `Slettet prosjektet`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `Importerte prosjektet`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let text = `Ble med i prosjektet`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let text = `Forlot prosjektet`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let text = `Merget kode`;
        if (branches && branches.length > 0) {
            let sources = branches.map((branch) => {
                return `“${branch}”`;
            });
            text += ` fra ${sources.join(', ')}`;
        }
        text += ` inn i branchen “${branch}”`;
        if (repo) {
            text += ` av prosjektet “${repo}”`;
        }
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        return `Åpnet problemet ${number}: ${title}`;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let text = `Pushet forandringer til branchen “${branch}”`;
        if (repo) {
            text += ` av prosjektet “${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `Bedt om å fusjonere branchen “${branch1}” inn “${branch2}`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `Oppdatert wiki-siden “${page}”`;
    },
    'story-add-coauthor': 'Legg til medforfatter',
    'story-add-remove-coauthor': 'Legg til/fjern medforfatter',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return `${count} andre`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` og `, name2 ];
    },
    'story-cancel': 'Avbryt',
    'story-cancel-are-you-sure': 'Er du sikker på at du vil forlate dette innlegget?',
    'story-cancel-edit-are-you-sure': 'Er du sikker på at du vil overgi endringer du har gjort?',
    'story-coauthors': 'Medforfatterne',
    'story-comment': 'Kommentar',
    'story-drop-files-here': 'Dra og slipp mediefiler her',
    'story-file': 'Fil',
    'story-issue-current-status': 'Nåværende status:',
    'story-issue-status-closed': 'Lukket',
    'story-issue-status-merged': 'Fusjonert',
    'story-issue-status-opened': 'Åpen',
    'story-issue-status-reopened': 'Gjenåpnet',
    'story-like': 'Liker',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Forfallsdato:',
    'story-milestone-start-date': 'Startdato:',
    'story-options': 'Alternativer',
    'story-paste-image-here': 'Et bilde som er lagt inn i teksteditoren, vil også ende opp her',
    'story-pending': 'Overhengende...',
    'story-photo': 'Bilde',
    'story-post': 'Post',
    'story-push-added-$count-files': (count) => {
        let files = cardinal(count, '1 fil', '2 filer');
        return `${files} lagt til`;
    },
    'story-push-added-$count-lines': (count) => {
        let lines = cardinal(count, '1 linje', '2 linjer');
        return `${lines} lagt til`;
    },
    'story-push-components-changed': 'Følgende deler ble endret:',
    'story-push-deleted-$count-files': (count) => {
        let files = cardinal(count, '1 fil', '2 filer');
        return `${files} fjernet`;
    },
    'story-push-deleted-$count-lines': (count) => {
        let lines = cardinal(count, '1 linje', '2 linjer');
        return `${lines} fjernet`;
    },
    'story-push-modified-$count-files': (count) => {
        let files = cardinal(count, '1 fil', '2 filer');
        return `${files} endret`;
    },
    'story-push-modified-$count-lines': (count) => {
        let lines = cardinal(count, '1 linje', '2 linjer');
        return `${lines} endret`;
    },
    'story-push-renamed-$count-files': (count) => {
        let files = cardinal(count, '1 fil', '2 filer');
        return `${files} omdøpt`;
    },
    'story-remove-yourself': 'Fjern deg selv',
    'story-remove-yourself-are-you-sure': 'Er du sikker på at du vil fjerne deg selv som medforfatter?',
    'story-status-storage-pending': 'I påvente av',
    'story-status-transcoding-$progress': (progress) => {
        return `Transkoding (${progress}%)`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `Opplasting (${progress}%)`;
    },
    'story-survey': 'Undersøkelse',
    'story-task-list': 'Oppgaveliste',
    'story-video': 'Video',
    'story-vote-submit': 'Sende inn',

    'telephone-dialog-close': 'Lukk',

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'En dag', '2 dager');
        return `${time} siden`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'En time', '2 timer');
        return `${time} siden`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} t. sitten`;
    },
    'time-$min-ago': (min) => {
        return `${min} m. siden`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'Et minutt', '2 minutter');
        return `${time} siden`;
    },
    'time-just-now': 'Akkurat nå',
    'time-yesterday': 'I går',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 fil', '2 filer');
        return `Laster opp ${files}, ${size} gjenværende`;
    },

    'user-actions': 'Handlinger',

    'user-activity-$name-created-branch': 'Opprettet en ny branch',
    'user-activity-$name-created-merge-request': 'Opprettet en merge-request',
    'user-activity-$name-created-milestone': 'Opprettet en milepæl',
    'user-activity-$name-created-repo': 'Oprettet et git-prosjekt',
    'user-activity-$name-created-tag': 'Opprettet en ny tagg',
    'user-activity-$name-deleted-repo': 'Slettet et git-prosjek',
    'user-activity-$name-edited-wiki-page': 'Redigert en wiki-side',
    'user-activity-$name-imported-repo': 'Importerte et git-prosjek',
    'user-activity-$name-joined-repo': 'Ble med i et git-prosjekt',
    'user-activity-$name-left-repo': 'Dro et git-prosjek',
    'user-activity-$name-merged-code': 'Utført en kodefusjon',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'et audioklipp', '2 audioklipp');
        return `Skrevet ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, 'et lenke', 'lenker');
        let website = cardinal(count, 'et nettsted', '2 nettsteder');
        return `Skrevet ${links} til ${website}`
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'et bilde', '2 bilder');
        return `Skrevet ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'et videoklipp', '2 videoklipp');
        return `Skrevet ${videos}`;
    },
    'user-activity-$name-pushed-code': 'La kod til repoen',
    'user-activity-$name-reported-issue': 'Rapporterte et problem',
    'user-activity-$name-started-survey': 'Startet en undersøkelse',
    'user-activity-$name-started-task-list': 'Startet en oppgaveliste',
    'user-activity-$name-wrote-post': 'Skrev et innlegg',
    'user-activity-back': 'Tilbake',
    'user-activity-more': 'Flere',

    'user-image-adjust': 'Juster',
    'user-image-cancel': 'Avbryt',
    'user-image-replace': 'Erstatt',
    'user-image-save': 'Lagre',
    'user-image-select': 'Velge',
    'user-image-snap': 'Ta',

    'user-info-email': 'Epostadresse',
    'user-info-gender': 'Kjønn',
    'user-info-gender-female': 'Kvinne',
    'user-info-gender-male': 'Mann',
    'user-info-gender-unspecified': 'Uspesifisert',
    'user-info-name': 'Navn',
    'user-info-phone': 'Telefonnummer',

    'user-statistics-legend-branch': 'Nye brancher',
    'user-statistics-legend-issue': 'Problemer',
    'user-statistics-legend-member': 'Medlemskapsendringer',
    'user-statistics-legend-merge': 'Merger',
    'user-statistics-legend-merge-request': 'Merge-requester',
    'user-statistics-legend-milestone': 'Milepæler',
    'user-statistics-legend-post': 'Innlegg',
    'user-statistics-legend-push': 'Pusher',
    'user-statistics-legend-repo': 'Repo endringer',
    'user-statistics-legend-survey': 'Undersøkelser',
    'user-statistics-legend-tag': 'Nye tagger',
    'user-statistics-legend-task-list': 'Oppgavelister',
    'user-statistics-legend-wiki': 'Wiki redigeringer',
    'user-statistics-today': 'I dag',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 branch', '2 brancher');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 problem', '2 problemer');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 medlemskapsendring', '2 medlemskapsendringer');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 merge', '2 merger');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 merge-request', '2 merge-requester');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 Milepæl', '2 milepæler');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 innlegg', '2 innlegg');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 push', '2 pusher');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 repo endring', '2 repo endringer');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 undersøkelse', '2 undersøkelser');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tagg', '2 tagger');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 oppgaveliste', '2 oppgavelister');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki redigering', '2 wiki redigeringer');
    },

    'video-capture-accept': 'Aksepter',
    'video-capture-cancel': 'Avbryt',
    'video-capture-pause': 'Pause',
    'video-capture-resume': 'Gjenoppta',
    'video-capture-retake': 'Ta om igjen',
    'video-capture-start': 'Start',
    'video-capture-stop': 'Stopp',

    'warning-no-connection': 'Ingen umiddelbar oppdatering',
};

export {
    phrases,
};
