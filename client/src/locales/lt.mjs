import 'moment/locale/lt';
import {
    cardinal,
} from 'common/locale/grammars/lithuanian.mjs';

const phrases = {
    'action-contact-by-email': 'Susisiekti e-paštu',
    'action-contact-by-ichat': 'Susisiekti su iChat',
    'action-contact-by-phone': 'Susisiekti telefonu',
    'action-contact-by-skype': 'Susisiekti su Skype',
    'action-contact-by-slack': 'Susisiekti su Slack',
    'action-contact-by-twitter': 'Susisiekti su Twitter',
    'action-view-github-page': 'Peržiūrėti profilį GitHub',
    'action-view-gitlab-page': 'Peržiūrėti profilį GitLab',
    'action-view-linkedin-page': 'Peržiūrėti profilį LinkedIn',
    'action-view-stackoverflow-page': 'Peržiūrėti profilį Stack Overflow',

    'activation-address': 'Serverio adresas',
    'activation-cancel': 'Atšaukti',
    'activation-code': 'Aktyvacijos kodas',
    'activation-ok': 'OK',
    'activation-schema': 'Projektas',

    'alert-$count-new-bookmarks': (count) => {
        return cardinal(count, '1 nauja žyma', '2 naujos žymos', '10 naujų žymių');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 naujas pranešimas', '2 nauji pranešimai', '10 naujų pranešimų');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 nauja istorija', '2 naujos istorijos', '10 naujų istorijų');
    },

    'app-component-close': 'Uždaryti',

    'app-name': 'Trambar',

    'audio-capture-accept': 'Priimti',
    'audio-capture-cancel': 'Atšaukti',
    'audio-capture-pause': 'Pauzė',
    'audio-capture-rerecord': 'Įrašyti iš naujo',
    'audio-capture-resume': 'Tęsti',
    'audio-capture-start': 'Pradėti',
    'audio-capture-stop': 'Sustabdyti',

    'bookmark-$count-other-users': (count) => {
        return cardinal(count, '1 kitas vartotojas', '2 kiti vartotojai', '10 kitų vartotojų');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 vartotojas', '2 vartotojai', '10 vartotojų');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} rekomenduoja tai`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` i `, name2, ` rekomenduoja tai` ];
    },
    'bookmark-$you-bookmarked-it': 'Jūs įtraukėte žymę prie jos',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `Jūs įtraukėte žymę prie jos (ir ${name} rekomenduoja)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, users, count) => {
        return [ `Jūs įtraukėte žymę prie jos (ir `, users, ` rekomenduoja)` ];
    },
    'bookmark-recommendations': 'Rekomendacijos',

    'bookmarks-no-bookmarks': 'Nėra žymių',

    'bottom-nav-bookmarks': 'Žymes',
    'bottom-nav-news': 'Naujienos',
    'bottom-nav-notifications': 'Pranešimai',
    'bottom-nav-people': 'Žmonės',
    'bottom-nav-settings': 'Nustatymai',

    'confirmation-cancel': 'Atšaukti',
    'confirmation-confirm': 'Patvirtinti',

    'country-name-ad': 'Andora',
    'country-name-ae': 'Jungtiniai Arabų Emyratai',
    'country-name-af': 'Afganistanas',
    'country-name-ag': 'Antigva ir Barbuda',
    'country-name-al': 'Albanija',
    'country-name-am': 'Armėnija',
    'country-name-ao': 'Angola',
    'country-name-ar': 'Argentina',
    'country-name-at': 'Austrija',
    'country-name-au': 'Australija',
    'country-name-az': 'Azerbaidžanas',
    'country-name-ba': 'Bosnija ir Hercegovina',
    'country-name-bb': 'Barbadosas',
    'country-name-bd': 'Bangladešas',
    'country-name-be': 'Belgija',
    'country-name-bf': 'Burkina Faso',
    'country-name-bg': 'Bulgarija',
    'country-name-bh': 'Bahreinas',
    'country-name-bi': 'Burundis',
    'country-name-bj': 'Beninas',
    'country-name-bn': 'Brunėjus',
    'country-name-bo': 'Bolivija',
    'country-name-br': 'Brazilija',
    'country-name-bs': 'Bahamos',
    'country-name-bt': 'Butanas',
    'country-name-bw': 'Botsvana',
    'country-name-by': 'Baltarusija',
    'country-name-bz': 'Belizas',
    'country-name-ca': 'Kanada',
    'country-name-cd ': 'Kongas',
    'country-name-cf': 'Centrinės Afrikos Respublika',
    'country-name-cg': 'Kongo Respublika',
    'country-name-ch': 'Šveicarija',
    'country-name-ci': 'Dramblio Kaulo Krantas',
    'country-name-cl': 'Čilė',
    'country-name-cm': 'Kamerūnas',
    'country-name-cn': 'Kinija',
    'country-name-co': 'Kolumbija',
    'country-name-cr': 'Kosta Rika',
    'country-name-cu': 'Kuba',
    'country-name-cv': 'Žaliasis Kyšulys',
    'country-name-cy': 'Kipras',
    'country-name-cz': 'Čekijos Respublika',
    'country-name-de': 'Vokietija',
    'country-name-dj': 'Džibutis',
    'country-name-dk': 'Danija',
    'country-name-dm': 'Dominika',
    'country-name-do': 'Dominikos Respublika',
    'country-name-dz': 'Alžyras',
    'country-name-ec': 'Ekvadoras',
    'country-name-ee': 'Estija',
    'country-name-eg': 'Egiptas',
    'country-name-er': 'Eritrėja',
    'country-name-es': 'Ispanija',
    'country-name-et': 'Etiopija',
    'country-name-fi': 'Suomija',
    'country-name-fj': 'Fidžis',
    'country-name-fm': 'Mikronezija',
    'country-name-fr': 'Prancūzija',
    'country-name-ga': 'Gabonas',
    'country-name-gb': 'Jungtinė Karalystė',
    'country-name-gd': 'Grenada',
    'country-name-ge': 'Gruzija',
    'country-name-gh': 'Gana',
    'country-name-gm': 'Gambija',
    'country-name-gn': 'Gvinėja',
    'country-name-gq': 'Pusiaujo Gvinėja',
    'country-name-gr': 'Graikija',
    'country-name-gt': 'Gvatemala',
    'country-name-gw': 'Bisau Gvinėja',
    'country-name-gy': 'Gajana',
    'country-name-hk': 'Honkongas',
    'country-name-hn': 'Hondūras',
    'country-name-hr': 'Kroatija',
    'country-name-ht': 'Haitis',
    'country-name-hu': 'Vengrija',
    'country-name-id': 'Indonezija',
    'country-name-ie': 'Airija',
    'country-name-il': 'Izraelis',
    'country-name-in': 'Indija',
    'country-name-iq': 'Irakas',
    'country-name-ir': 'Iranas',
    'country-name-is': 'Islandija',
    'country-name-it': 'Italija',
    'country-name-jm': 'Jamaika',
    'country-name-jo': 'Jordanija',
    'country-name-jp': 'Japonija',
    'country-name-ke': 'Kenija',
    'country-name-kg': 'Kirgizija',
    'country-name-kh': 'Kambodža',
    'country-name-ki': 'Kiribatis',
    'country-name-km': 'Komorai',
    'country-name-kn': 'Sent Kitsas ir Nevis',
    'country-name-kp': 'Šiaurės Korėja',
    'country-name-kr': 'Pietų Korėja',
    'country-name-kw': 'Kuveitas',
    'country-name-kz': 'Kazachstanas',
    'country-name-la': 'Laosas',
    'country-name-lb': 'Libanas',
    'country-name-lc': 'Sent Lusija',
    'country-name-li': 'Lichtenšteinas',
    'country-name-lk': 'Šri Lanka',
    'country-name-lr': 'Liberija',
    'country-name-ls': 'Lesotas',
    'country-name-lt': 'Lietuva',
    'country-name-lu': 'Liuksemburgas',
    'country-name-lv': 'Latvija',
    'country-name-ly': 'Libija',
    'country-name-ma': 'Marokas',
    'country-name-mc': 'Monakas',
    'country-name-md': 'Moldova',
    'country-name-me': 'Juodkalnija',
    'country-name-mg': 'Madagaskaras',
    'country-name-mh': 'Maršalo salos',
    'country-name-mk': 'Šiaurės Makedonija',
    'country-name-ml': 'Malis',
    'country-name-mm': 'Mianmaras',
    'country-name-mn': 'Mongolija',
    'country-name-mo': 'Makao',
    'country-name-mr': 'Mauritanija',
    'country-name-mt': 'Malta',
    'country-name-mu': 'Mauricijus',
    'country-name-mv': 'Maldyvai',
    'country-name-mw': 'Malavis',
    'country-name-mx': 'Meksika',
    'country-name-my': 'Malaizija',
    'country-name-mz': 'Mozambikas',
    'country-name-na': 'Namibija',
    'country-name-ne': 'Nigeris',
    'country-name-ng': 'Nigerija',
    'country-name-ni': 'Nikaragva',
    'country-name-nl': 'Nyderlandai',
    'country-name-no': 'Norvegija',
    'country-name-np': 'Nepalas',
    'country-name-nr': 'Nauru',
    'country-name-nz': 'Naujoji Zelandija',
    'country-name-om': 'Omanas',
    'country-name-pa': 'Panama',
    'country-name-pe': 'Peru',
    'country-name-pg': 'Papua Naujoji Gvinėja',
    'country-name-ph': 'Filipinai',
    'country-name-pk': 'Pakistanas',
    'country-name-pl': 'Lenkija',
    'country-name-ps': 'Palestina',
    'country-name-pt': 'Portugalija',
    'country-name-pw': 'Palau',
    'country-name-py': 'Paragvajus',
    'country-name-qa': 'Kataras',
    'country-name-ro': 'Rumunija',
    'country-name-rs': 'Serbija',
    'country-name-ru': 'Rusija',
    'country-name-rw': 'Ruanda',
    'country-name-sa': 'Saudo Arabija',
    'country-name-sb': 'Saliamono Salos',
    'country-name-sc': 'Seišeliai',
    'country-name-sd': 'Sudanas',
    'country-name-se': 'Švedija',
    'country-name-sg': 'Singapūras',
    'country-name-si': 'Slovėnija',
    'country-name-sk': 'Slovakija',
    'country-name-sl': 'Siera Leonė',
    'country-name-sm': 'San Marinas',
    'country-name-sn': 'Senegalas',
    'country-name-so': 'Somalis',
    'country-name-sr': 'Surinamas',
    'country-name-ss': 'Pietų Sudanas',
    'country-name-st': 'Sao tomé ir príncipe',
    'country-name-sv': 'Salvadoras',
    'country-name-sy': 'Sirija',
    'country-name-sz': 'Esvatinis',
    'country-name-td': 'Čadas',
    'country-name-tg': 'Toogo',
    'country-name-th': 'Tailandas',
    'country-name-tj': 'Tadžikistanas',
    'country-name-tl': 'Rytų laikmatis',
    'country-name-tm': 'Turkmėnistanas',
    'country-name-tn': 'Tunisas',
    'country-name-to': 'Tonga',
    'country-name-tr': 'Turkija',
    'country-name-tt': 'Trinidadas ir Tobagas',
    'country-name-tv': 'Tuvalu',
    'country-name-tw': 'Taivanas',
    'country-name-tz': 'Tanzanija',
    'country-name-ua': 'Ukraina',
    'country-name-ug': 'Uganda',
    'country-name-us': 'Jungtinės Valstijos',
    'country-name-uy': 'Urugvajus',
    'country-name-uz': 'Uzbekistanas',
    'country-name-va': 'Šventasis Sostas ',
    'country-name-vc': 'Sent Vinsentas ir Grenadinai',
    'country-name-ve': 'Venesuela',
    'country-name-vn': 'Vietnamas',
    'country-name-vu': 'Vanuatu',
    'country-name-ws': 'Samoa',
    'country-name-ye': 'Jemenas',
    'country-name-za': 'Pietų Afrika',
    'country-name-zm': 'Zambija',
    'country-name-zw': 'Zimbabvė',
    'country-name-zz': 'Kiti',

    'development-code-push-$deployment': (deployment) => {
        return `Atsisiųsti atnaujinimus iš „${deployment}”`;
    },
    'development-show-diagnostics': 'Rodyti diagnostiką',
    'development-show-panel': 'Rodyti šį skydelį',

    'device-selector-camera-$number': (number) => {
        return `Kamera ${number}`;
    },
    'device-selector-camera-back': 'Galinis',
    'device-selector-camera-front': 'Priekinė',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'Jūs esate atjungtas nuo tinklo',

    'image-editor-image-transfer-in-progress': 'Vaizdo kopijavimas iš svetainės...',
    'image-editor-page-rendering-in-progress': 'Atvaizdavimas tinklalapio peržiūrą...',
    'image-editor-poster-extraction-in-progress': 'Ištraukimas video peržiūrą...',
    'image-editor-upload-in-progress': 'Siuntimas vykdomas...',

    'issue-cancel': 'Atšaukite',
    'issue-delete': 'Ištrinti',
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos === 1) {
            objects.push(photos === 1 ? 'nuotrauką' : 'nuotraukas');
            ae = (photos === 1) ? 'ią' : 'iąs';
        }
        if (videos > 0) {
            objects.push(videos === 1 ? 'klip klipą' : 'klip klipus');
            if (!ae) {
                ae = (videos === 1) ? 'į' : 'iuos';
            }
        }
        if (audios > 0) {
            objects.push(audios === 1 ? 'audio klipą' : 'audio klipus');
            if (!ae) {
                ae = (audios === 1) ? 'į' : 'iuos';
            }
        }
        return `${list(names)} pasiuntė š${ae} ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        return `${list(names)} parašė:`;
    },
    'issue-ok': 'OK',
    'issue-repo': 'Saugykla',
    'issue-title': 'Pavadinimas',

    'list-$count-more': (count) => {
        return `Dar ${count}...`;
    },

    'media-close': 'Uždaryti',
    'media-download-original': 'Atsisiųskite pradinį failą',
    'media-editor-embed': 'Įterpti',
    'media-editor-remove': 'Ištrinti',
    'media-editor-shift': 'Perkelti',
    'media-next': 'Sekantis',
    'media-previous': 'Ankstesnis',

    'membership-request-$you-are-member': (you) => {
        return `Jūs esate šio projekto narys`;
    },
    'membership-request-$you-are-now-member': (you) => {
        return `Jūs tapo šio projekto nariu`;
    },
    'membership-request-$you-have-requested-membership': (you) => {
        return `Jūs kreipėtės dėl narystės šiame projekte`;
    },
    'membership-request-browse': 'Naršyti',
    'membership-request-cancel': 'Atšaukti',
    'membership-request-join': 'Prisijungti',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Tęsti',
    'membership-request-withdraw': 'Atsiimti',

    'mobile-device-revoke': 'atšaukti',
    'mobile-device-revoke-are-you-sure': 'Ar tikrai norite atšaukti leidimą šiam prietaisui?',

    'mobile-setup-address': 'Serverio adresas',
    'mobile-setup-close': 'Uždaryti',
    'mobile-setup-code': 'Leidimo kodas',
    'mobile-setup-project': 'Projektas',

    'news-no-stories-by-role': 'Nėra jokio istorijos iš šio vaidmens',
    'news-no-stories-found': 'Nerasta jokių atitinkančių istorijų',
    'news-no-stories-on-date': 'Šios dienos istorijų nėra',
    'news-no-stories-yet': 'Nėra istorijų',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} pakvietė tave bendrai redaguoti įrašą`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} pridėjo tavo įrašą į klaidų sekimo sistemą`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketą'; break;
            case 'task-list': story = 'užduočių sąrašą'; break;
            case 'post': story = 'įrašą'; break;
            default: story = 'istoriją';
        }
        return `${name} pakomentavo tavo ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} baigė užduotį iš tavo sąrašo`;
    },
    'notification-$name-is-assigned-to-your-$story': (name, story) => {
        switch (story) {
            case 'issue': story = 'tavo klaidos ataskaitai'; break;
            case 'merge-request': story = 'tavo prašymui sujungti'; break;
        }
        return `${name} yra priskirtas ${story}`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketą'; break;
            case 'task-list': story = 'užduočių sąrašą'; break;
            case 'post': story = 'įrašą'; break;
            default: story = 'istoriją';
        }
        return `${name} mėgsta tavo ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'komentare';
        return `${name} tave paminėjo ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketoje'; break;
            case 'task-list': story = 'užduočių sąraše'; break;
            case 'post': story = 'įraše'; break;
            case 'issue': story = 'klaidos ataskaitoje'; break;
            case 'merge-request': story = 'prašyme sujungti'; break;
            default: story = 'istorijoje';
        }
        return `${name} tave paminėjo ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} sujungė pakeitimus į šaką „${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} parašė klaidos ataskaitą`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'reviziją'; break;
            case 'issue': story = 'klaidos ataskaitą'; break;
            case 'merge-request': story = 'prašymą sujungti'; break;
        }
        return `${name} pakomentavo tavo ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} paskelbė anketą`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} atsiuntė pakeitimus sakai „${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} paprašė prisijungti prie šio projekto`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'anketos'; break;
            case 'task-list': story = 'užduočių sąrašo'; break;
            case 'post': story = 'įrašo'; break;
            default: story = 'istorijos';
        }
        return `${name} atsiuntė tau ${story} žymę`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} atsakė į tavo anketą`;
    },
    'notification-option-assignment': 'Kai kas nors priskiriamas tavo problemai',
    'notification-option-bookmark': 'Kai kas nors atsiunčia tau žymą',
    'notification-option-coauthor': 'Kai kas nors kviečia tave bendrai redaguoti įrašą',
    'notification-option-comment': 'Kai kas nors komentuoja tavo istoriją',
    'notification-option-issue': 'Kai kas nors atveria problemą',
    'notification-option-join-request': 'Kai kas nors nori prisijungti prie šio projekto',
    'notification-option-like': 'Kai kas nors mėgsta tavo istoriją',
    'notification-option-mention': 'Kai kas nors tave paminėja įraše ar komentare',
    'notification-option-merge': 'Kai kas nors sujungia kodą į šaką „master”',
    'notification-option-note': 'Kai kas nors skelbia pastabą apie reviziją ar problemą',
    'notification-option-push': 'Kai kas nors įkelia kodą į Git',
    'notification-option-survey': 'Kai kas nors skelbia anketą',
    'notification-option-task-completion': 'Kai kas nors baigia užduotį tavo sąraše',
    'notification-option-vote': 'Kai kas nors atsako į tavo anketą',
    'notification-option-web-session': 'Kai naršyklės sesija yra aktyvi',

    'notifications-no-notifications-on-date': 'Nėra pranešimų apie šią datą',
    'notifications-no-notifications-yet': 'Nėra pranešimų',

    'option-add-bookmark': 'Pridėti žymą',
    'option-add-issue': 'Pridėti įrašą į klaidų sekimo sistemą',
    'option-bump-story': 'Skatinti istoriją',
    'option-edit-comment': 'Redaguoti komentarą',
    'option-edit-post': 'Redaguoti įrašą',
    'option-hide-comment': 'Paslėpti komentarą nuo svečių',
    'option-hide-story': 'Paslėpti istorija nuo svečių',
    'option-keep-bookmark': 'Laikyti žymę',
    'option-remove-comment': 'Ištrinti komentarą',
    'option-remove-story': 'Ištrinti istoriją',
    'option-send-bookmarks': 'Siųsti žymes kitiems',
    'option-send-bookmarks-to-$count-users': (count) => {
        let users = cardinal(count, '1 asmeniui', '2 asmenims', '10 asmenų');
        let bookmarks = cardinal(count, 'žymę', 'žymes')
        return `Siųsti ${bookmarks} ${users}`;
    },
    'option-show-media-preview': 'Rodyti pridėtą laikmeną',
    'option-show-text-preview': 'Rodyti teksto peržiūrą',
    'option-statistics-14-days': 'Rodyti paskutinių 14 dienų veiklą',
    'option-statistics-biweekly': 'Rodyti dviejų savaičių veiklą',
    'option-statistics-monthly': 'Rodyti mėnesio veiklą',
    'option-statistics-to-date': 'Rodyti veiklą iki šiol',

    'people-no-stories-found': 'Nėra jokių tinkamų istorijų',
    'people-no-stories-on-date': 'Nėra jokios veiklos tą dieną',
    'people-no-users-by-role': 'Nėra projektas narys turi tą vaidmenį',
    'people-no-users-yet': 'Dar nėra projekto narių',

    'person-no-stories-found': 'Nėra jokių tinkamų istorijų',
    'person-no-stories-on-date': 'Nėra istorijų tą dieną',
    'person-no-stories-yet': 'Dar nėra istorijų',

    'photo-capture-accept': 'Priimti',
    'photo-capture-cancel': 'Atšaukti',
    'photo-capture-retake': 'Pakartokti',
    'photo-capture-snap': 'Užfiksuoti',

    'project-description-close': 'Uždaryti',

    'project-management-add': 'Pridėti',
    'project-management-cancel': 'Atšaukti',
    'project-management-description': 'projekto aprašymas',
    'project-management-join-project': 'prisijungti prie projekto',
    'project-management-manage': 'Tvarkyti sąrašą',
    'project-management-mobile-set-up': 'mobili konfigūracija',
    'project-management-remove': 'Ištrinti',
    'project-management-sign-out': 'atsijungti',
    'project-management-sign-out-are-you-sure': 'Ar tikrai norite išsiregistruoti iš serverio?',
    'project-management-withdraw-request': 'atšaukti savo narystės prašymą',

    'qr-scanner-cancel': 'Atšaukti',
    'qr-scanner-code-found': 'Rasta QR kodas',
    'qr-scanner-code-invalid': 'Klaidinga QR kodas',
    'qr-scanner-code-used': 'Pasenęs QR kodas',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name} pridėjo šį įrašą į klaidų sekimo priemonė`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name} balsavo`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name} pakomentavo šią šaką`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name} pakomentavo šią problemą`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name} pakomentavo šį susijungimą`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name} pakomentavo šį prašymą sujungti`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name} pakomentavo šiuos kodų pakeitimus`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        return `${name} pakomentavo šią žymą`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name} baigė užduotį`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name} buvo priskirtas šiai problemai`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name} buvo priskirtas šiam prašymui sujungti`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} redaguoja komentarą...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} siunčia komentarą...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} rašo komentarą...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} mėgsta tai`;
    },
    'reaction-status-storage-pending': 'Laukiamas',
    'reaction-status-transcoding': 'Perkodavimas',
    'reaction-status-uploading': 'Przesyłanie',

    'role-filter-no-roles': 'Nėra vaidmenų',

    'search-bar-keywords': 'Raktiniai žodžiai arba #hashtags',

    'selection-cancel': 'Atšaukti',
    'selection-ok': 'OK',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-development': 'Programuotojo parinktys',
    'settings-device': 'Mobilusis prietaisas',
    'settings-devices': 'Mobilieji prietaisai',
    'settings-language': 'Kalba',
    'settings-mobile-alert': 'Mobiliojo prietaiso įspėjimas',
    'settings-notification': 'Pranešimas',
    'settings-profile-image': 'Profilio nuotrauka',
    'settings-projects': 'Projektai',
    'settings-social-networks': 'Socialiniai tinklai',
    'settings-user-information': 'Asmeninė informacija',
    'settings-web-alert': 'Naršyklės įspėjimas',

    'social-network-github': 'GitHub profilio URL',
    'social-network-gitlab': 'GitLab profilio URL',
    'social-network-ichat': 'iChat vardas',
    'social-network-linkedin': 'LinkedIn profilio URL',
    'social-network-skype': 'Skype vardas',
    'social-network-slack': 'Slack vartotojo identifikatorius',
    'social-network-slack-team': 'Slack komandos identifikatorius',
    'social-network-stackoverflow': 'Stack Overflow profilio URL',
    'social-network-twitter': 'Twitter vartotojo vardas',

    'start-activation-add-server': 'Pridėti projektą iš kito serverio',
    'start-activation-instructions': (ui) => {
        return [
            'Norėdami prieiti prie Trambar serverio šiame įrenginyje, pirmiausia prisijunkite prie serverio naudodami žiniatinklio naršyklę. Pasirinkite projektą, tada eikite į puslapį ',
            ui.settings,
            '. Skydelyje ',
            ui.projects,
            ' paspauskite mygtuką ',
            ui.mobileSetup,
            '. Ekrane pasirodys QR kodas. Šiame įrenginyje paspauskite žemiau esantį mygtuką ir nuskaitykite kodą. Arba galite rankiniu būdu įvesti aktyvinimo kodą.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Prisijunkite naudodami žiniatinklio naršyklę, tada nuskaitykite QR kodą, rodomą puslapyje',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Rankiniu',
    'start-activation-new-server': 'Naujas serveris',
    'start-activation-others-servers': 'Galimi serveriai',
    'start-activation-return': 'Grįžti',
    'start-activation-scan-code': 'Nuskaityti QR kodą',
    'start-error-access-denied': 'Prašymas suteikti prieigą atmestas',
    'start-error-account-disabled': 'Vartotojo paskyra šiuo metu išjungta',
    'start-error-existing-users-only': 'Prie šios sistemos gali prisijungti tik įgalioti darbuotojai',
    'start-error-undefined': 'Netikėta klaida',
    'start-no-projects': 'Nėra projektų',
    'start-no-servers': 'Nėra OAuth paslaugų teikėjų',
    'start-projects': 'Projektai',
    'start-social-login': 'Socialinis prisijungimas',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Sveiki!',
    'start-welcome-again': 'Sveiki vėl',

    'statistics-bar': 'Juostos',
    'statistics-line': 'Linijos',
    'statistics-pie': 'Pjovimo',

    'story-$count-reactions': (count) => {
        return cardinal(count, '1 atsakymas', '2 atsakymai', '10 atsakymų');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `Sukūrė šaką „${branch}” projekte „${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `Sukūrė etapą „${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        return `Sukūrė wiki puslapį „${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let text = `Sukūrė projektą`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        return `sukūrė žymę „${tag}” projekte „${repo}”`;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `Ištrino wiki puslapį „${page}”`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `Ištrino projektą`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `Importavo projektą`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let text = `Prisijungė prie projekto`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let text = `Paliko projektą`;
        if (repo) {
            text += ` „${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let text = `Sujungė kodą`;
        if (branches?.length > 0) {
            let sources = branches.map((branch) => {
                return `„${branch}”`;
            });
            if (sources.length === 1) {
                text += ` iš šakos ${sources[0]}`;
            } else {
                text += ` iš šakų ${sources.join(', ')}`;
            }
        }
        text += ` į`;
        if (repo) {
            text += ` projekto „${repo}”`;
        }
        text += ` šaką „${branch}”`;
        return text;
    },
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        let text = `Atidarė problemą ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let text = `Išsiuntė pakeitimus į`;
        if (repo) {
            text += ` projekto „${repo}”`;
        }
        text += ` šaką „${branch}”`;
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `Oaprašė sujungti šaką „${branch1}” į šaką „${branch2}”`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `Atnaujino wiki puslapį „${page}”`;
    },
    'story-add-coauthor': 'Pridėti bendrininką',
    'story-add-remove-coauthor': 'Pridėti/šalinti bendrininką',
    'story-audio': 'Audio',
    'story-author-$count-others': (count) => {
        return cardinal(count, '1 kitas', '2 kiti', '10 kitų');
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` ir `, name2 ];
    },
    'story-cancel': 'Atšaukti',
    'story-cancel-are-you-sure': 'Ar tikrai norite mesti šį postą?',
    'story-cancel-edit-are-you-sure': 'Ar tikrai norite atsisakyti savo pakeitimų?',
    'story-coauthors': 'Bendraautoriai',
    'story-comment': 'Komentuoti',
    'story-drop-files-here': 'Vilkite ir upuść medijos failus čia',
    'story-file': 'Failas',
    'story-issue-current-status': 'Dabartinis statusas:',
    'story-issue-status-closed': 'Uždaras',
    'story-issue-status-merged': 'Sujungtas',
    'story-issue-status-opened': 'Atviras',
    'story-issue-status-reopened': 'Atviras vėl',
    'story-like': 'Patinka',
    'story-markdown': 'Markdown',
    'story-milestone-due-date': 'Terminas:',
    'story-milestone-start-date': 'Pradžios data:',
    'story-options': 'Galimybės',
    'story-paste-image-here': 'Vaizdas įklijamas į teksto redaktorių taip pat bus čia',
    'story-pending': 'Laukiamas...',
    'story-photo': 'Nuotrauka',
    'story-post': 'Paskelbti',
    'story-push-added-$count-files': (count) => {
        return cardinal(count, '1 pridėtas failas', '2 pridėtus failus', '10 pridėtų failų');
    },
    'story-push-added-$count-lines': (count) => {
        return cardinal(count, '1 pridėtas eilutė', '2 pridėtos eilutės', '10 pridėtų eilučių');
    },
    'story-push-components-changed': 'Šios dalys buvo pakeistos:',
    'story-push-deleted-$count-files': (count) => {
        return cardinal(count, '1 ištrintas failas', '2 ištrintus failus', '10 ištrintų failų');
    },
    'story-push-deleted-$count-lines': (count) => {
        return cardinal(count, '1 ištrintas eilutė', '2 ištrintos eilutės', '10 ištrintų eilučių');
    },
    'story-push-modified-$count-files': (count) => {
        return cardinal(count, '1 modifikuotas failas', '2 modifikuotus failus', '10 modifikuotų failų');
    },
    'story-push-modified-$count-lines': (count) => {
        return cardinal(count, '1 modifikuotas eilutė', '2 modifikuotos eilutės', '10 modifikuotų eilučių');
    },
    'story-push-renamed-$count-files': (count) => {
        return cardinal(count, '1 pervadintas failas', '2 pervadintus failus', '10 pervadinttų failų');
    },
    'story-remove-yourself': 'Pašalinti save',
    'story-remove-yourself-are-you-sure': 'Ar tikrai norite pašalinti save kaip bendraautorį?',
    'story-status-storage-pending': 'Laukiamas',
    'story-status-transcoding-$progress': (progress) => {
        return `Perkodavimas (${progress}%)`;
    },
    'story-status-uploading-$progress': (progress) => {
        return `Siuntimas (${progress}%)`;
    },
    'story-survey': 'Anketa',
    'story-task-list': 'Užduočių sąrašas',
    'story-video': 'Video',
    'story-vote-submit': 'Pateikti',

    'telephone-dialog-close': 'Uždaryti',

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'dieną', '2 dienas', '10 dienų');
        return `Prieš ${time}`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'valandą', '2 valandas', '10 valandų');
        return `Prieš ${time}`;
    },
    'time-$hr-ago': (hr) => {
        return `Prieš ${hr} val`;
    },
    'time-$min-ago': (min) => {
        return `Prieš ${min} min`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'minutę', '2 minutes', '10 minučių');
        return `Prieš ${time}`;
    },
    'time-just-now': 'Dabar',
    'time-yesterday': 'Vakar',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 failą', '2 failus', '10 failų');
        return `Siuntimas ${files}, likę ${size}`;
    },

    'user-actions': 'Veiksmai',

    'user-activity-$name-created-branch': 'Sukūrė naują šaką',
    'user-activity-$name-created-merge-request': 'Sukūrė prašymą sujungti pakeitimus',
    'user-activity-$name-created-milestone': 'Sukūrė etapą',
    'user-activity-$name-created-repo': 'Sukūrė git projektą',
    'user-activity-$name-created-tag': 'Sukūrė naują žymą',
    'user-activity-$name-deleted-repo': 'Pašalino git projektą',
    'user-activity-$name-edited-wiki-page': 'Redagavo wiki puslapį',
    'user-activity-$name-imported-repo': 'Importavo git projektą',
    'user-activity-$name-joined-repo': 'Prisijungė prie git projekto',
    'user-activity-$name-left-repo': 'Paliko git projektą',
    'user-activity-$name-merged-code': 'Padarė pakeitimų sujungimą',
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'audio klipą', '2 audio klipus', '10 audio klipų');
        return `Pasiuntė ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = (count === 1) ? `nuorodą` : `nuorodas`;
        let website = cardinal(count, 'svetainę', '2 svetaines', '10 svetainių');
        return `Jis atsiuntė ${links} į ${website}`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'nuotrauką', '2 nuotraukas', '10 nuotraukų');
        return `Pasiuntė ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'video klipą', '2 video klipus', '10 video klipų');
        return `Pasiuntė ${videos}`;
    },
    'user-activity-$name-pushed-code': 'Atsiuntė kodą į saugyklą',
    'user-activity-$name-reported-issue': 'Pranešė klaidą',
    'user-activity-$name-started-survey': 'Sukūrė anketą',
    'user-activity-$name-started-task-list': 'Sukūrė užduočių sąrašą',
    'user-activity-$name-wrote-post': 'Parašė įrašą',
    'user-activity-back': 'Atgal',
    'user-activity-more': 'Daugiau',

    'user-image-adjust': 'Dostosuj',
    'user-image-cancel': 'Atšaukti',
    'user-image-replace': 'Pakeisti',
    'user-image-save': 'Išsaugoti',
    'user-image-select': 'Pasirinkti',
    'user-image-snap': 'Fotografuoti',

    'user-info-email': 'E-pašto adresas',
    'user-info-gender': 'Seksas',
    'user-info-gender-female': 'Moteris',
    'user-info-gender-male': 'Vyras',
    'user-info-gender-unspecified': 'Nepatikslintas',
    'user-info-name': 'Vardas ir pavardė',
    'user-info-phone': 'Telefono numeris',

    'user-statistics-legend-branch': 'Naujos šakos',
    'user-statistics-legend-issue': 'Klaidos ataskaitos',
    'user-statistics-legend-member': 'Narystės pakeitimai',
    'user-statistics-legend-merge': 'Pakeitimų sujungimai',
    'user-statistics-legend-merge-request': 'Prašymai sujungti',
    'user-statistics-legend-milestone': 'Etapai',
    'user-statistics-legend-post': 'Įrašai',
    'user-statistics-legend-push': 'Pakeitimų siuntimai',
    'user-statistics-legend-repo': 'Saugyklos pakeitimai',
    'user-statistics-legend-survey': 'Anketos',
    'user-statistics-legend-tag': 'Naujos žymos',
    'user-statistics-legend-task-list': 'Užduočių sąrašai',
    'user-statistics-legend-wiki': 'Wiki redagavimai',
    'user-statistics-today': 'Šiandien',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 šaka', '2 šakos', '10 šakų');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 klaidos ataskaita', '2 klaidos ataskaitos', '10 klaidos ataskaitų');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 narystės pakeitimas', '2 narystės pakeitimai', '10 narystės pakeitimų');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 pakeitimų sujungimas', '2 pakeitimų sujungimai', '10 pakeitimų sujungimų');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 prašymas sujungti', '2 prašymai sujungti', '10 prašymų sujungti');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 etapas', '2 etapai', '10 etapų');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 įrašas', '2 įrašai', '10 įrašų');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 pakeitimų siuntimas', '2 pakeitimų siuntimai', '10 pakeitimų siuntimų');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 saugyklos pakeitimas', '2 saugyklos pakeitimai', '10 saugyklos pakeitimų');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 anketos', '10 anketų');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 žyma', '2 žymos', '10 žymų');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 užduočių sąrašas', '2 užduočių sąrašai', '10 užduočių sąrašų');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki redagavimas', '2 wiki redagavimai', '10 wiki redagavimų');
    },

    'video-capture-accept': 'Priimti',
    'video-capture-cancel': 'Atšaukti',
    'video-capture-pause': 'Pauzė',
    'video-capture-resume': 'Tęsti',
    'video-capture-retake': 'Įrašyti iš naujo',
    'video-capture-start': 'Pradėti',
    'video-capture-stop': 'Sustabdyti',

    'warning-no-connection': 'Nėra greito atnaujinimo',
};

export {
    phrases,
};
