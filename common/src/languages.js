const directory = [
    {
        name: 'Čeština',
        code: 'cz',
        script: 'latin',
        countries: {
            cz: 'Česko',
            pl: 'Polsko',
            sk: 'Slovensko',
        },
        defaultCountry: 'cz',
        module: () => import('locales/cs' /* webpackChunkName: "locale-cs" */),
    },
    {
        name: 'Dansk',
        code: 'da',
        script: 'latin',
        countries: {
            dk: 'Danmark',
            fo: 'Færøerne',
            gl: 'Grønland',
            de: 'Tyskland',
        },
        defaultCountry: 'dk'
    },
    {
        name: 'Deutsch',
        code: 'de',
        script: 'latin',
        countries: {
            at: 'Österreich',
            be: 'Belgien',
            de: 'Deutschland',
            lu: 'Luxemburg',
            ch: 'Schweiz',
        },
        defaultCountry: 'de',
        module: () => import('locales/de' /* webpackChunkName: "locale-de" */),
    },
    {
        name: 'Ελληνικά',
        code: 'el',
        script: 'greek',
        countries: {
            gr: 'Ελλάδα',
            cy: 'Κύπρος',
        },
        defaultCountry: 'gr',
    },
    {
        name: 'English',
        code: 'en',
        script: 'latin',
        countries: {
            au: 'Australia',
            ca: 'Canada',
            hk: 'Hong Kong',
            ie: 'Ireland',
            sg: 'Singapore',
            gb: 'United Kingdom',
            us: 'United States',
        },
        defaultCountry: 'us',
        module: () => import('locales/en' /* webpackChunkName: "locale-en" */),
    },
    {
        name: 'Español',
        code: 'es',
        script: 'latin',
        countries: {
            ar: 'Argentina',
            bo: 'Bolivia',
            cl: 'Chile',
            co: 'Colombia',
            cr: 'Costa Rica',
            cu: 'Cuba',
            es: 'España',
            ec: 'Ecuador',
            sv: 'El Salvador',
            gq: 'Guinea Ecuatorial',
            gt: 'Guatemala',
            hn: 'Honduras',
            mx: 'México',
            ni: 'Nicaragua',
            pa: 'Panamá',
            py: 'Paraguay',
            pe: 'Perú',
            pr: 'Puerto Rico',
            do: 'República Dominicana',
            uy: 'Uruguay',
            ve: 'Venezuela',
        },
        defaultCountry: 'es',
    },
    {
        name: 'Français',
        code: 'fr',
        script: 'latin',
        countries: {
            be: 'Belgique',
            bj: 'Bénin',
            bf: 'Burkina Faso',
            bi: 'Burundi',
            cm: 'Cameroun',
            ca: 'Canada',
            cg: 'Congo',
            ci: 'Côte d\'Ivoire',
            dj: 'Djibouti',
            gq: 'Guinée équatoriale',
            fr: 'France',
            ga: 'Gabon',
            gn: 'Guinée',
            ht: 'Haïti',
            lu: 'Luxembourg',
            mg: 'Madagascar',
            ml: 'Mali',
            ne: 'Niger',
            rw: 'Rwanda',
            cf: 'République centrafricaine',
            cd: 'République démocratique du Congo',
            sn: 'Sénégal',
            sc: 'Seychelles',
            ch: 'Suisse',
            td: 'Tchad',
            tg: 'Togo',
        },
        defaultCountry: 'fr',
        module: () => import('locales/fr' /* webpackChunkName: "locale-fr" */),
    },
    {
        name: '한국어',
        code: 'ko',
        script: 'hangul',
        countries: {
            kr: '한국',
            cn: '중국',
        },
        defaultCountry: 'kr',
    },
    {
        name: 'Hrvatski',
        code: 'hr',
        script: 'latin',
        countries: {
            ba: 'Bosna i Hercegovina',
            hr: 'Hrvatska',
            rs: 'Srbija',
        },
        defaultCountry: 'hr',
    },
    {
        name: 'Italiano',
        code: 'it',
        script: 'latin',
        countries: {
            it: 'Italia',
            ch: 'Svizzera',
            hr: 'Croazia',
            si: 'Slovenia',
        },
        defaultCountry: 'it',
        module: () => import('locales/it' /* webpackChunkName: "locale-it" */),
    },
    {
        name: 'Lietuvių',
        code: 'lt',
        script: 'latin',
        countries: {
            lt: 'Lietuva',
        },
        defaultCountry: 'lt',
        module: () => import('locales/lt' /* webpackChunkName: "locale-lt" */),
    },
    {
        name: 'Magyar',
        code: 'hu',
        script: 'latin',
        countries: {
            hr: 'Magyarország',
            ro: 'Románia',
        },
        defaultCountry: 'hu'
    },
    {
        name: 'Nederlands',
        code: 'nl',
        script: 'latin',
        countries: {
            be: 'België',
            nl: 'Nederland',
            sr: 'Suriname',
        },
        defaultCountry: 'nl',
    },
    {
        name: '日本語',
        code: 'jp',
        script: 'hiragana',
        countries: {
            jp: '日本',
        },
        defaultCountry: 'jp',
    },
    {
        name: 'Norsk',
        code: 'nb',
        script: 'latin',
        countries: {
            no: 'Norge',
        },
        defaultCountry: 'no',
        module: () => import('locales/nb' /* webpackChunkName: "locale-nb" */),
    },
    {
        name: 'Polski',
        code: 'pl',
        script: 'latin',
        countries: {
            by: 'Białoruś',
            lt: 'Litwa',
            pl: 'Polska',
            ua: 'Ukraina',
        },
        defaultCountry: 'pl',
        module: () => import('locales/pl' /* webpackChunkName: "locale-pl" */),
    },
    {
        name: 'Português',
        code: 'pt',
        script: 'latin',
        countries: {
            ao: 'Angola',
            br: 'Brasil',
            tl: 'Timor Leste',
            gq: 'Guiné Equatorial',
            gw: 'Guiné-Bissau',
            mz: 'Moçambique',
            mo: 'Macao',
            pt: 'Portugal',
        },
        defaultCountry: 'pt',
    },
    {
        name: 'Русский',
        code: 'ru',
        script: 'cyrillic',
        countries: {
            am: 'Армения',
            by: 'Беларусь',
            ge: 'Грузия',
            lv: 'Латвия',
            kz: 'Казахстан',
            kg: 'Киргизия',
            lt: 'Литва',
            ru: 'Россия',
            tj: 'Таджикистан',
            ua: 'Украина',
            uz: 'Узбекистан',
            es: 'Эстония',
        },
        defaultCountry: 'ru',
        module: () => import('locales/ru' /* webpackChunkName: "locale-ru" */),
    },
    {
        name: 'Srpski',
        code: 'sr',
        script: 'latin',
        countries: {
            rs: 'Srbija',
            hr: 'Hrvatska',
            ba: 'Bosna i Hercegovina',
        },
        defaultCountry: 'sr'
    },
    {
        name: 'Suomi',
        code: 'fi',
        script: 'latin',
        countries: {
            fi: 'Suomi',
            se: 'Ruotsi',
        },
        defaultCountry: 'fi',
        module: () => import('locales/fi' /* webpackChunkName: "locale-fi" */),
    },
    {
        name: 'Slovenčina',
        code: 'sk',
        script: 'latin',
        countries: {
            cz: 'Česko',
            sk: 'Slovensko',
        },
        defaultCountry: 'sk'
    },
    {
        name: 'Svenska',
        code: 'sv',
        script: 'latin',
        countries: {
            fi: 'Finland',
            se: 'Sverige',
        },
        defaultCountry: 'se',
    },
    {
        name: 'Tiếng Việt',
        code: 'vi',
        script: 'latin',
        countries: {
            vn: 'Việt Nam',
        },
        defaultCountry: 'vn'
    },
    {
        name: 'Türkçe',
        code: 'tr',
        script: 'latin',
        countries: {
            cy: 'Kıbrıs',
            tr: 'Türkiye',
        },
        defaultCountry: 'tr',
    },
    {
        name: '中文',
        code: 'zh',
        script: 'hanzi',
        countries: {
            cn: '中国',
            hk: '香港',
            mo: '澳門',
            sg: '新加坡',
            tw: '台灣',
        },
        defaultCountry: 'cn',
        module: () => import('locales/zh' /* webpackChunkName: "locale-zh" */),
    },
];

export {
    directory as default
};
