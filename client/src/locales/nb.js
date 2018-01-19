require('moment/locale/nb');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': 'Kontakt via e-post',
        'action-contact-by-ichat': 'Kontakt via iChat',
        'action-contact-by-phone': 'Kontakt via telefon',
        'action-contact-by-skype': 'Kontakt via Skype',
        'action-contact-by-slack': 'Kontakt via Slack',
        'action-contact-by-twitter': 'Kontakt via Twitter',
        'action-view-github-page': 'Se Github-siden',
        'action-view-gitlab-page': 'Se Gitlab-siden',
        'action-view-linkedin-page': 'Se LinkedIn-siden',
        'action-view-stackoverflow-page': 'Se Stack-Overflow-siden',

        'activation-address': 'Server adresse',
        'activation-cancel': 'Avbryt',
        'activation-code': 'Aktiviseringskode',
        'activation-ok': 'OK',
        'activation-schema': 'Prosjekt',

        'alert-$count-new-bookmarks': (count) => {
            return (count === 1) ? `1 nytt bokmerke` : `${count} nye bokmerker`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 ny melding` : `${count} nye meldinger`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 ny historie` : `${count} nye historier`;
        },

        'app-name': 'Trambar',

        'audio-capture-accept': 'Aksepter',
        'audio-capture-cancel': 'Avbryt',
        'audio-capture-pause': 'Pause',
        'audio-capture-rerecord': 'Ta opp igjen',
        'audio-capture-resume': 'Gjenoppta',
        'audio-capture-start': 'Start',
        'audio-capture-stop': 'Stopp',

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 annen bruker` : `${count} andre brukere`;
        },
        'bookmark-$count-users': (count) => {
            return (count === 1) ? `1 brukere` : `${count} brukere`;
        },
        'bookmark-$name-and-$users-recommend-this': (name, users) => {
            return [ `${name} og `, users, ` anbefaler dette` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} anbefaler dette`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return `${name1} og ${name2} anbefaler dette`;
        },
        'bookmark-recommendations': 'Anbefalinger',
        'bookmark-you-bookmarked-it': 'Du har laget et bokmerke til dette',
        'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
            return `Du har laget et bokmerke til dette (og ${name} anbefaler dette)`;
        },
        'bookmark-you-bookmarked-it-and-$users-recommends-it': (users) => {
            return [ `Du har laget et bokmerke til dette (og `, users, `  anbefaler dette)` ];
        },

        'bottom-nav-bookmarks': 'Bokmerker',
        'bottom-nav-news': 'Nyheter',
        'bottom-nav-notifications': 'Varslinger',
        'bottom-nav-people': 'Mennesker',
        'bottom-nav-settings': 'Innstillinger',

        'confirmation-cancel': 'Avbryt',
        'confirmation-confirm': 'Bekrefte',

        'diagnostics-show': 'Vis diagnostikk',
        'diagnostics-show-panel': 'Vis dette panelet',

        'image-editor-upload-in-progress': 'Opplasting pågår...',

        'issue-cancel': 'Avbryt',
        'issue-clear': 'Slett',
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

        'membership-request-cancel': 'Avbryt',
        'membership-request-join': 'Bli med',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Fortsett',
        'membership-request-you-are-now-member': 'Du er nå medlem i dette prosjektet',
        'membership-request-you-have-requested-membership': 'Du har bedt om medlemskap i dette prosjektet',

        'mobile-device-revoke': 'tilbakekalle',
        'mobile-device-revoke-are-you-sure': 'Er du sikker på at du vil tilbakekalle autorisasjon til denne enheten?',

        'mobile-setup-address': 'Server adresse',
        'mobile-setup-close': 'Lukk',
        'mobile-setup-code': 'Autorisasjonskode',

        'notification-$user-added-you-as-coauthor': (user) => {
            return `${user} inviterte deg til å redigere et innlegg`;
        },
        'notification-$user-commented-on-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'pushen din'; break;
                case 'merge': story = 'mergen din'; break;
                case 'branch': story = 'branchen din'; break;
                case 'survey': story = 'undersøkelsen din'; break;
                case 'task-list': story = 'oppgavelisten din'; break;
                default: story = 'innlegget ditt';
            }
            return `${user} kommenterte ${story}`;
        },
        'notification-$user-completed-task': (user) => {
            return `${user} fullførte en oppgave på listen din`;
        },
        'notification-$user-likes-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'pushen din'; break;
                case 'merge': story = 'mergen din'; break;
                case 'branch': story = 'branchen din'; break;
                case 'survey': story = 'undersøkelsen din'; break;
                case 'task-list': story = 'oppgavelisten din'; break;
                default: story = 'innlegget ditt';
            }
            return `${user} liker ${story}`;
        },
        'notification-$user-requested-to-join': (user) => {
            return `${user} ba om å bli med i dette prosjektet`;
        },
        'notification-$user-sent-bookmark-to-$story': (user, story) => {
            switch (story) {
                case 'survey': story = 'en undersøkelse'; break;
                case 'task-list': story = 'en oppgavelist'; break;
                default: story = 'et innlegg';
            }
            return `${user} sendte deg et bokmerke til ${story}`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            return `${user} svarte på undersøkelsen din`;
        },
        'notification-option-assignment': 'Når du er tildelt et problem',
        'notification-option-bookmark': 'Når noen sender deg et bokmerke',
        'notification-option-coauthor': 'Når noen inviterer deg til å redigere et innlegg',
        'notification-option-comment': 'Når noen kommenterer innlegget ditt',
        'notification-option-issue': 'Når noen åpner et problem',
        'notification-option-join-request': 'Når noen ønsker å bli med i dette prosjektet',
        'notification-option-like': 'Når noen liker innlegget ditt',
        'notification-option-merge': 'Når noen fusjonerer kode inn i master versjonen',
        'notification-option-note': 'Når noen legger inn et notat om et begå eller et problem',
        'notification-option-push': 'Når noen trykker på kode i Git',
        'notification-option-survey': 'Når noen legger inn en undersøkelse',
        'notification-option-task-completion': 'Når noen fullfører en oppgave på listen din',
        'notification-option-vote': 'Når noen svarer på undersøkelsen din',
        'notification-option-web-session': 'Når en web økt er aktiv',

        'option-add-bookmark': 'Legg til bokmerke for dette innlegget',
        'option-add-issue': 'Legg til innlegg til feilrapporteringssystemet',
        'option-bookmark-story': 'Legg bokmerke',
        'option-bump-post': 'Støt opp dette innlegget',
        'option-edit-comment': 'Rediger kommentaren',
        'option-edit-post': 'Rediger innlegget',
        'option-hide-comment': 'Skjul kommentaren fra ikke-medlemmer',
        'option-hide-post': 'Skjul innlegget fra ikke-medlemmer',
        'option-remove-comment': 'Fjern kommentaren',
        'option-remove-post': 'Fjern innlegget',
        'option-send-bookmarks': 'Send bokmerker til andre brukere',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} bruker` : `${count} brukere`;
            var bookmarks = (count === 1) ? 'bokmerke' : 'bokmerker';
            return `Send ${bookmarks} to ${users}`;
        },
        'option-show-media-preview': 'Vis vedlagte medier',
        'option-show-text-preview': 'Vis tekstforhåndsvisning',

        'photo-capture-accept': 'Aksepter',
        'photo-capture-cancel': 'Avbryt',
        'photo-capture-retake': 'Ta om igjen',
        'photo-capture-snap': 'Ta',

        'project-description-close': 'Lukk',

        'project-management-add': 'Legg til',
        'project-management-cancel': 'Avbryt',
        'project-management-description': 'prosjektbeskrivelse',
        'project-management-manage': 'Administrer liste',
        'project-management-mobile-set-up': 'mobil oppsett',
        'project-management-remove': 'Fjerne',
        'project-management-sign-out': 'Logg ut',
        'project-management-sign-out-are-you-sure': 'Er du sikker på at du vil logge deg ut fra denne serveren?',

        'qr-scanner-cancel': 'Avbryt',
        'qr-scanner-invalid-qr-code': 'Ugyldig QR-kode',

        'reaction-$user-added-story-to-issue-tracker': (user) => {
            return `${user} la til dette innlegget til feilrapporteringssystemet`;
        },
        'reaction-$user-cast-a-vote': (user) => {
            return `${user} stemte`;
        },
        'reaction-$user-commented-on-branch': (user) => {
            return `${user} kommenterte denne branchen`;
        },
        'reaction-$user-commented-on-issue': (user) => {
            return `${user} kommenterte dette problemet`;
        },
        'reaction-$user-commented-on-merge': (user) => {
            return `${user} kommenterte denne mergen`;
        },
        'reaction-$user-commented-on-merge-request': (user) => {
            return `${user} kommenterte denne merge-requesten`;
        },
        'reaction-$user-commented-on-push': (user) => {
            return `${user} kommenterte denne pushen`;
        },
        'reaction-$user-completed-a-task': (user) => {
            return `${user} fullførte en oppgave`;
        },
        'reaction-$user-is-assigned-to-issue': (user) => {
            return `${user} ble tildelt dette problemet`;
        },
        'reaction-$user-is-assigned-to-merge-request': (user) => {
            return `${user} ble tildelt denne merge-requesten`;
        },
        'reaction-$user-is-editing': (user) => {
            return `${user} redigerer en kommentar...`;
        },
        'reaction-$user-is-writing': (user) => {
            return `${user} skriver en kommentar...`;
        },
        'reaction-$user-likes-this': (user) => {
            return `${user} liker dette`;
        },

        'role-filter-no-roles': 'Ingen roller definert',

        'search-bar-keywords': 'Søkeorder',

        'selection-cancel': 'Avbryt',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',

        'settings-device': 'Mobil enhet',
        'settings-devices': 'Mobile enheter',
        'settings-diagnostics': 'Diagnostikk',
        'settings-language': 'Språk',
        'settings-mobile-alert': 'Mobilvarsel',
        'settings-notification': 'Melding',
        'settings-profile-image': 'Profilbilde',
        'settings-projects': 'Prosjekter',
        'settings-social-networks': 'Sosiale nettverk',
        'settings-user-information': 'Brukerinformasjon',
        'settings-web-alert': 'Webvarsel',

        'social-network-github': 'GitHub profil URL',
        'social-network-gitlab': 'Gitlab profil URL',
        'social-network-ichat': 'iChat brukernavn',
        'social-network-linkedin': 'Linkedin profil URL',
        'social-network-skype': 'Skype brukernavn',
        'social-network-slack': 'Slack bruker-id',
        'social-network-slack-team': 'Slack team-id',
        'social-network-stackoverflow': 'Stack Overflow profil URL',
        'social-network-twitter': 'Twitter brukernavn',

        'start-activation-add-server': 'Legg til prosjekt fra en annen server',
        'start-activation-instructions': 'Lorem ipsum dolor sit amet, sint explicari nec id, nisl civibus deleniti ea qui. Sit in debitis veritus consequat. Nullam delenit menandri his at, audiam fabulas te vel. Sit veri oratio suscipiantur in, mea ut duis facer patrioque. Ut partem accumsan molestiae sit.',
        'start-activation-manual': 'Manuell oppføring',
        'start-activation-scan-code': 'Skann QR kode',
        'start-error-access-denied': 'Forespørsel om tilgang avvist',
        'start-error-account-disabled': 'Kontoen er for øyeblikket deaktivert',
        'start-error-existing-users-only': 'Kun autorisert personell kan få tilgang til dette systemet',
        'start-error-undefined': 'Uventet feil',
        'start-projects': 'Prosjekter',
        'start-social-login': 'Sosial pålogging',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Velkommen!',
        'start-welcome-again': 'Velkommen igjen',

        'statistics-bar': 'Søyle',
        'statistics-line': 'Linje',
        'statistics-pie': 'Kake',

        'story-$count-user-reacted-to-story': (count) => {
            var users = (count === 1) ? `${count} bruker` : `${count} brukere`;
            return `${users} reagerte på dette`;
        },
        'story-add-coauthor': 'Legg til medforfatter',
        'story-add-remove-coauthor': 'Legg til/fjern medforfatter',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) => {
            return `${count} andre`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' og ', name2 ];
        },
        'story-cancel': 'Avbryt',
        'story-cancel-are-you-sure': 'Er du sikker på at du vil forlate dette innlegget?',
        'story-cancel-edit-are-you-sure': 'Er du sikker på at du vil overgi endringer du har gjort?',
        'story-coauthors': 'Medforfatterne',
        'story-comment': 'Kommentar',
        'story-drop-files-here': 'Dra og slipp mediefiler her',
        'story-file': 'Fil',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            return `Åpnet problemet ${number}: ${title}`;
        },
        'story-issue-current-status': 'Nåværende status:',
        'story-issue-status-closed': 'Lukket',
        'story-issue-status-opened': 'Åpen',
        'story-issue-status-reopened': 'Gjenåpnet',
        'story-like': 'Liker',
        'story-markdown': 'Markdown',
        'story-member-joined-$repo': (repo) => {
            var text = `Ble med i prosjektet`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-member-left-$repo': (repo) => {
            var text = `Forlot prosjektet`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-merge-request-$branch1-into-$branch2': (branch1, branch2) => {
            return `Bedt om å fusjonere branchen “${branch1}” inn “${branch2}`;
        },
        'story-milestone-created-$name': (name) => {
            return `Skapte milepæl “${name}”`;
        },
        'story-milestone-due-date': 'Forfallsdato:',
        'story-milestone-start-date': 'Startdato:',
        'story-options': 'Alternativer',
        'story-paste-image-here': 'Et bilde som er lagt inn i teksteditoren, vil også ende opp her',
        'story-pending': 'Overhengende...',
        'story-photo': 'Bilde',
        'story-post': 'Post',
        'story-push-added-$count-files': (count) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `${files} lagt til`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines = (count === 1) ? `1 linje` : `${count} linjer`;
            return `${lines} lagt til`;
        },
        'story-push-components-changed': 'Følgende deler ble endret:',
        'story-push-created-$branch-in-$repo': (branch, repo) => {
            return `Skapte branchen “${branch}” i prosjektet “${repo}”`;
        },
        'story-push-deleted-$count-files': (count) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `${files} fjernet`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines = (count === 1) ? `1 linje` : `${count} linjer`;
            return `${lines} fjernet`;
        },
        'story-push-merged-$branches-into-$branch-of-$repo': (branches, branch, repo) => {
            var text = `Merget kode`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
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
        'story-push-modified-$count-files': (count) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `${files} endret`;
        },
        'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
            var text = `Pushet forandringer til branchen “${branch}”`;
            if (repo) {
                text += ` av prosjektet “${repo}”`;
            }
            return text;
        },
        'story-push-renamed-$count-files': (count) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `${files} omdøpt`;
        },
        'story-remove-yourself': 'Fjern deg selv',
        'story-remove-yourself-are-you-sure': 'Er du sikker på at du vil fjerne deg selv som medforfatter?',
        'story-repo-created-$name': (name) => {
            var text = `Opprettet prosjektet`;
            if (name) {
                text += ` “${name}”`;
            }
            return text;
        },
        'story-status-transcoding-$progress': (progress) => {
            return `transkoding (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `opplasting (${progress}%)`;
        },
        'story-survey': 'Undersøkelse',
        'story-task-list': 'Oppgaveliste',
        'story-video': 'Video',
        'story-vote-submit': 'Sende inn',
        'story-wiki-created-page-with-$title': (title) => {
            return `Opprettet wiki-siden “${title}”`;
        },
        'story-wiki-deleted-page-with-$title': (title) => {
            return `Fjernet wiki-siden “${title}”`;
        },
        'story-wiki-updated-page-with-$title': (title) => {
            return `Oppdatert wiki-siden “${title}”`;
        },

        'telephone-dialog-close': 'Lukk',

        'time-yesterday': 'I går',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 fil` : `${count} filer`;
            return `Laster opp ${files}, ${size} gjenværende`;
        },

        'user-actions': 'Handlinger',

        'user-activity-$name-created-branch': 'Opprettet en ny branch',
        'user-activity-$name-created-merge-request': 'Opprettet en merge-request',
        'user-activity-$name-created-milestone': 'Opprettet en milepæl',
        'user-activity-$name-created-repo': 'Oprettet et git-prosjekt',
        'user-activity-$name-edited-wiki-page': 'Redigert en wiki-side',
        'user-activity-$name-joined-repo': 'Ble med i et git-prosjekt',
        'user-activity-$name-left-repo': 'Dro et git-prosjek',
        'user-activity-$name-merged-code': 'Utført en kodefusjon',
        'user-activity-$name-opened-issue': 'Åpnet et problem',
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios = (count === 1) ? `et audioklipp` : `${count} audioklipp`;
            return `Skrevet ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `et lenke` : `lenker`;
            var website = (count === 1) ? `et nettsted` : `${count} nettsteder`;
            return `Skrevet ${links} til ${website}`
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures = (count === 1) ? `et bilde` : `${count} bilder`;
            return `Skrevet ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos = (count === 1) ? `et videoklipp` : `${count} videoklipp`;
            return `Skrevet ${videos}`;
        },
        'user-activity-$name-pushed-code': 'La kod til repoen',
        'user-activity-$name-started-survey': 'Startet en undersøkelse',
        'user-activity-$name-started-task-list': 'Startet en oppgaveliste',
        'user-activity-$name-wrote-post': 'Skrev et innlegg',
        'user-activity-more': 'Flere...',

        'user-image-remove': 'Fjerne',
        'user-image-select': 'Velge',
        'user-image-snap': 'Ta',

        'user-info-email': 'Epostadresse',
        'user-info-gender': 'Kjønn',
        'user-info-gender-female': 'Kvinnelig',
        'user-info-gender-male': 'Mannlig',
        'user-info-gender-unspecified': 'Uspesifisert',
        'user-info-name': 'Navn',
        'user-info-phone': 'Telefonnummer',

        'user-statistics-legend-branch': 'Nye brancher',
        'user-statistics-legend-issue': 'Problemer',
        'user-statistics-legend-merge': 'Merger',
        'user-statistics-legend-merge-request': 'Merge-requester',
        'user-statistics-legend-milestone': 'Milepæler',
        'user-statistics-legend-push': 'Pusher',
        'user-statistics-legend-repo': 'Repo endringer',
        'user-statistics-legend-story': 'Innlegg',
        'user-statistics-legend-survey': 'Undersøkelser',
        'user-statistics-legend-task-list': 'Oppgavelister',
        'user-statistics-legend-wiki': 'Wiki redigeringer',
        'user-statistics-today': 'I dag',
        'user-statistics-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} brancher`;
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 problemet` : `${count} problemer`;
        },
        'user-statistics-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 medlemskapsendring` : `${count} medlemskapsendringer`;
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merger`;
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 Milepæl` : `${count} milepæler`;
        },
        'user-statistics-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pusher`;
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 repo endring` : `${count} repo endringer`;
        },
        'user-statistics-tooltip-$count-story': (count) => {
            return (count === 1) ? `1 innlegg` : `${count} innlegg`;
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 undersøkelse` : `${count} undersøkelser`;
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 oppgaveliste` : `${count} oppgavelister`;
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki redigering` : `${count} wiki redigeringer`;
        },

        'video-capture-accept': 'Aksepter',
        'video-capture-cancel': 'Avbryt',
        'video-capture-pause': 'Pause',
        'video-capture-resume': 'Gjenoppta',
        'video-capture-retake': 'Ta om igjen',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stopp',
    };
};
