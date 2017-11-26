module.exports = function(languageCode) {
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

        'comment-$user-cast-a-vote': (user) => {
            return `${user} stemte`;
        },
        'comment-$user-commented-on-branch': (user) => {
            return `${user} kommenterte denne branchen`;
        },
        'comment-$user-commented-on-issue': (user) => {
            return `${user} kommenterte dette problemet`;
        },
        'comment-$user-commented-on-merge': (user) => {
            return `${user} kommenterte denne mergen`;
        },
        'comment-$user-commented-on-merge-request': (user) => {
            return `${user} kommenterte denne merge-requesten`;
        },
        'comment-$user-commented-on-push': (user) => {
            return `${user} kommenterte denne pushen`;
        },
        'comment-$user-completed-a-task': (user) => {
            return `${user} fullførte en oppgave`;
        },
        'comment-$user-is-assigned-to-issue': (user) => {
            return `${user} ble tildelt dette problemet`;
        },
        'comment-$user-is-editing': (user) => {
            return `${user} redigerer en kommentar...`;
        },
        'comment-$user-is-writing': (user) => {
            return `${user} skriver en kommentar...`;
        },
        'comment-$user-likes-this': (user) => {
            return `${user} liker dette`;
        },

        'image-editor-upload-in-progress': 'Opplasting pågår...',

        'list-$count-more': (count) => {
            return `${count} flere...`;
        },

        'media-close': 'Lukk',
        'media-download-original': 'Last ned originalfilen',
        'media-next': 'Neste',
        'media-previous': 'Tidligere',

        'media-editor-embed': 'Legg inn i tekst',
        'media-editor-remove': 'Fjern',
        'media-editor-shift': 'Skift',

        'membership-request-cancel': 'Avbryt',
        'membership-request-join': 'Bli med',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Fortsett',
        'membership-request-you-are-now-member': 'Du er nå medlem i dette prosjektet',
        'membership-request-you-have-requested-membership': 'Du har bedt om medlemskap i dette prosjektet',

        'notification-option-assignment': 'Når du er tildelt et problem',
        'notification-option-bookmark': 'Når noen sender deg et bokmerke',
        'notification-option-comment': 'Når noen kommenterer innlegget ditt',
        'notification-option-issue': 'Når noen åpner et problem',
        'notification-option-join-request': 'Når noen ønsker å bli med i dette prosjektet',
        'notification-option-like': 'Når noen liker innlegget ditt',
        'notification-option-merge': 'Når noen fusjonerer kode inn i master versjonen',
        'notification-option-note': 'Når noen legger inn et notat om et begå eller et problem',
        'notification-option-push': 'Når noen trykker på kode i Git',
        'notification-option-survey': 'Når noen legger inn en undersøkelse',
        'notification-option-task-completion': 'Når noen fullfører en oppgave på listen din',
        'notification-option-task-list': 'Når noen legger deg til en oppgaveliste',
        'notification-option-vote': 'Når noen svarer på undersøkelsen din',
        'notification-option-web-session': 'Når en web økt er aktiv',

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

        'mobile-setup-close': 'Lukk',

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

        'project-panel-add': 'Legg til',
        'project-panel-description': 'Prosjektbeskrivelse',
        'project-panel-manage': 'Endre listen',
        'project-panel-mobile-set-up': 'Mobil oppsett',
        'project-panel-sign-out': 'Logg ut',

        'role-filter-no-roles': 'Ingen roller definert',

        'search-bar-keywords': 'Søkeorder',

        'selection-cancel': 'Avbryt',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',

        'settings-language': 'Språk',
        'settings-mobile-alert': 'Mobilvarsel',
        'settings-notification': 'Melding',
        'settings-profile-image': 'Profilbilde',
        'settings-projects': 'Prosjekter',
        'settings-social-networks': 'Sosiale nettverk',
        'settings-user-information': 'Brukerinformasjon',
        'settings-web-alert': 'Webvarsel',

        'sign-out-are-you-sure': 'Er du sikker på at du vil logge deg ut fra denne serveren?',
        'sign-out-cancel': 'Avbryt',
        'sign-out-confirm': 'Bekrefte',

        'social-network-github': 'GitHub profil URL',
        'social-network-gitlab': 'Gitlab profil URL',
        'social-network-ichat': 'iChat brukernavn',
        'social-network-linkedin': 'Linkedin profil URL',
        'social-network-skype': 'Skype brukernavn',
        'social-network-slack': 'Slack bruker-id',
        'social-network-slack-team': 'Slack team-id',
        'social-network-stackoverflow': 'Stack Overflow profil URL',
        'social-network-twitter': 'Twitter brukernavn',

        'start-projects': 'Prosjekter',
        'start-social-login': 'Sosial pålogging',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Velkommen!',

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
        'story-author-$name-and-$users': (name, users, count) => {
            return [ name, ' og ', users ];
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return `${name1} og ${name2}`;
        },
        'story-cancel': 'Avbryt',
        'story-coauthors': 'Medforfatterne',
        'story-comment': 'Kommentar',
        'story-drop-files-here': 'Dra og slipp mediefiler her',
        'story-file': 'Fil',
        'story-issue-current-status': 'Nåværende status:',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            return `Åpnet problemet ${number}: ${title}`;
        },
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
        'story-push-created-$branch-in-$repo': (branch, repo) => {
            return `Skapte branchen “${branch}” i prosjektet “${repo}”`;
        },
        'story-push-components-changed': 'Følgende deler ble endret:',
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

        'survey-item-$number': (number) => {
            return `valg ${number}`;
        },
        'task-list-item-$number': (number) => {
            return `oppgave ${number}`;
        },

        'telephone-dialog-close': 'Lukk',

        'user-actions': 'Handlinger',

        'user-info-name': 'Navn',
        'user-info-email': 'Epostadresse',
        'user-info-phone': 'Telefonnummer',
        'user-info-gender': 'Kjønn',
        'user-info-gender-male': 'Mannlig',
        'user-info-gender-female': 'Kvinnelig',
        'user-info-gender-unspecified': 'Uspesifisert',

        'user-statistics-legend-issue': 'Problemer',
        'user-statistics-legend-merge': 'Merger',
        'user-statistics-legend-milestone': 'Milepæler',
        'user-statistics-legend-push': 'Pusher',
        'user-statistics-legend-story': 'Innlegg',
        'user-statistics-legend-survey': 'Undersøkelser',
        'user-statistics-legend-task-list': 'Oppgavelister',
        'user-statistics-legend-wiki': 'Wiki redigeringer',

        'user-summary-$name-created-a-milestone': 'Skapt en milepæl',
        'user-summary-$name-created-repo': 'Opprettet et git-prosjekt',
        'user-summary-$name-edited-wiki-page': 'Redigerte en wiki-side',
        'user-summary-$name-joined-repo': 'Ble med i et git-prosjekt',
        'user-summary-$name-left-repo': 'Forlot et git-prosjekt',
        'user-summary-$name-merged-code': 'Lagde en merge',
        'user-summary-$name-opened-an-issue': 'Åpnet et problem',
        'user-summary-$name-posted-a-link': 'Postet en lenke til et nettsted',
        'user-summary-$name-posted-a-picture': 'Postet et bilde',
        'user-summary-$name-posted-a-video-clip': 'Postet et videoklipp',
        'user-summary-$name-posted-an-audio-clip': 'Postet et audioklipp',
        'user-summary-$name-pushed-code': 'Pushet kode til repo',
        'user-summary-$name-started-survey': 'Postet en undersøkelse',
        'user-summary-$name-started-task-list': 'Postet en oppgaveliste',
        'user-summary-$name-wrote-a-post': 'Skrev et innlegg',
        'user-summary-more': 'Flere...',

        'video-capture-accept': 'Aksepter',
        'video-capture-cancel': 'Avbryt',
        'video-capture-pause': 'Pause',
        'video-capture-resume': 'Gjenoppta',
        'video-capture-retake': 'Ta om igjen',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stopp',
    };
};
