import 'moment/locale/lt';
import {
    cardinal,
} from 'common/locale/grammars/lithuanian.mjs';

const phrases = {
    'action-badge-add': 'pridėti',
    'action-badge-approve': 'patvirtinti',
    'action-badge-archive': 'archyvuoti',
    'action-badge-deselect': 'panaikinti',
    'action-badge-disable': 'deaktyvuoti',
    'action-badge-reactivate': 'reaktyvuoti',
    'action-badge-remove': 'pašalinti',
    'action-badge-restore': 'atkurti',
    'action-badge-select': 'pasirinkti',

    'activity-chart-legend-branch': 'Naujos šakos',
    'activity-chart-legend-issue': 'Klaidos ataskaitos',
    'activity-chart-legend-member': 'Narystės pakeitimai',
    'activity-chart-legend-merge': 'Pakeitimų sujungimai',
    'activity-chart-legend-merge-request': 'Prašymai sujungti',
    'activity-chart-legend-milestone': 'Etapai',
    'activity-chart-legend-post': 'Įrašai',
    'activity-chart-legend-push': 'Pakeitimų siuntimai',
    'activity-chart-legend-repo': 'Saugyklos pakeitimai',
    'activity-chart-legend-snapshot': 'Svetainės revizijos',
    'activity-chart-legend-survey': 'Anketos',
    'activity-chart-legend-tag': 'Naujos žymos',
    'activity-chart-legend-task-list': 'Užduočių sąrašai',
    'activity-chart-legend-website-traffic': 'Eismo ataskaitos',
    'activity-chart-legend-wiki': 'Wiki redagavimai',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, '1 istorija', '2 istorijos', '10 istorijų');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 šaka', '2 šakos', '10 šakų');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 klaidos ataskaita', '2 klaidos ataskaitos', '10 klaidos ataskaitų');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, '1 narystės pakeitimas', '2 narystės pakeitimai', '10 narystės pakeitimų');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 pakeitimų sujungimas', '2 pakeitimų sujungimai', '10 pakeitimų sujungimų');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 prašymas sujungti', '2 prašymai sujungti', '10 prašymų sujungti');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 etapas', '2 etapai', '10 etapų');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, '1 įrašas', '2 įrašai', '10 įrašų');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, '1 pakeitimų siuntimas', '2 pakeitimų siuntimai', '10 pakeitimų siuntimų');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 saugyklos pakeitimas', '2 saugyklos pakeitimai', '10 saugyklos pakeitimų');
    },
    'activity-tooltip-$count-snapshot': (count) => {
        return cardinal(count, '1 svetainės revizija', '2 svetainės revizijos', '10 svetainės revizijų');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 anketos', '10 anketų');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 žyma', '2 žymos', '10 žymų');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 užduočių sąrašas', '2 užduočių sąrašai', '10 užduočių sąrašų');
    },
    'activity-tooltip-$count-website-traffic': (count) => {
        return cardinal(count, '1  eismo ataskaita', '2 eismo ataskaitos', '10 eismo ataskaitų');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 wiki redagavimas', '2 wiki redagavimai', '10 wiki redagavimų');
    },

    'app-name': 'Trambar',
    'app-title': 'Trambar - Administracinė konsolė',

    'confirmation-cancel': 'Atšaukti',
    'confirmation-confirm': 'Patvirtinti',
    'confirmation-data-loss': 'Ar tikrai norite atsisakyti savo pakeitimų?',

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

    'image-album-cancel': 'Atšaukti',
    'image-album-done': 'Padaryta',
    'image-album-manage': 'Valdykite albumą',
    'image-album-remove': 'Ištrinti pasirinktus',
    'image-album-select': 'Naudoti pasirinktą',
    'image-album-upload': 'Įkelti failą',

    'image-cropping-cancel': 'Atšaukti',
    'image-cropping-select': 'OK',

    'image-preview-close': 'Uždaryti',
    'image-preview-dropbox': 'Dropbox',
    'image-preview-onedrive': 'OneDrive',

    'image-selector-choose-from-album': 'Pasirinkti iš albumo',
    'image-selector-crop-image': 'Nustatykite dydį/poziciją',
    'image-selector-upload-file': 'Įkelti nuotrauką',

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
    'member-list-add': 'Pridėti naują vartotoją',
    'member-list-approve-all': 'Zatwierdź wszystkie prośby',
    'member-list-cancel': 'Atšaukti',
    'member-list-column-date-range': 'Aktyvus laikotarpis',
    'member-list-column-email': 'E-paštas',
    'member-list-column-last-modified': 'Pakeitimo data',
    'member-list-column-last-month': 'Praėjusį mėnesį',
    'member-list-column-name': 'Vardas ir pavardė',
    'member-list-column-roles': 'Vaidmenys',
    'member-list-column-this-month': 'Šį mėnesį',
    'member-list-column-to-date': 'Iki šiol',
    'member-list-column-type': 'Tipas',
    'member-list-edit': 'Redaguoti narių sąrašą',
    'member-list-reject-all': 'Atmesti visus prašymus',
    'member-list-save': 'Išsaugoti narių sąrašą',
    'member-list-status-non-member': 'Ne narys',
    'member-list-status-pending': 'Prašymas laukiamas',
    'member-list-title': 'Nariai',

    'nav-member-new': 'Naujas narys',
    'nav-members': 'Nariai',
    'nav-project-new': 'Naujas projektas',
    'nav-projects': 'Projektai',
    'nav-repositories': 'Saugyklos',
    'nav-rest-sources': 'REST šaltiniai',
    'nav-role-new': 'Naujas vaidmuo',
    'nav-roles': 'Vaidmenys',
    'nav-server-new': 'Naujas serveris',
    'nav-servers': 'Serveriai',
    'nav-settings': 'Nustatymai',
    'nav-spreadsheets': 'Excel failai',
    'nav-user-new': 'Naujas vartotojas',
    'nav-users': 'Vartotojai',
    'nav-website': 'Interneto svetainė',
    'nav-wiki': 'GitLab vikisvetaines',

    'project-list-add': 'Pridėti naują projektą',
    'project-list-cancel': 'Atšaukti',
    'project-list-column-date-range': 'Aktyvus laikotarpis',
    'project-list-column-last-modified': 'Pakeitimo data',
    'project-list-column-last-month': 'Praėjusį mėnesį',
    'project-list-column-repositories': 'Saugyklos',
    'project-list-column-this-month': 'Šį mėnesį',
    'project-list-column-title': 'Pavadinimas',
    'project-list-column-to-date': 'Iki šiol',
    'project-list-column-users': 'Vartotojai',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'pasirinktą projektą', 'šiuos 2 pasirinktus projektus', 'šiuos 10 pasirinktų projektų');
        return `Ar tikrai norite archyvuoti ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'pasirinktą projektą', 'šiuos 2 pasirinktus projektus', 'šiuos 10 pasirinktų projektų');
        return `Ar tikrai norite atkurti ${projects}?`;
    },
    'project-list-edit': 'Redaguoti projektų sąrašą',
    'project-list-save': 'Išsaugoti projektų sąrašą',
    'project-list-status-archived': 'Archyvuotas',
    'project-list-status-deleted': 'Ištrintas',
    'project-list-title': 'Projektai',

    'project-summary-$title': (title) => {
        let text = 'Projektas';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': 'Prieigos kontrolė',
    'project-summary-access-control-member-only': 'Tik nariai gali matyti projekto turinį',
    'project-summary-access-control-non-member-comment': 'Ne nariai gali komentuoti',
    'project-summary-access-control-non-member-view': 'Ne nariai gali peržiūrėti projekto turinį',
    'project-summary-add': 'Pridėti naują projektą',
    'project-summary-archive': 'Archyvuoti projektą',
    'project-summary-cancel': 'Atšaukti',
    'project-summary-confirm-archive': 'Ar tikrai norite archyvuoti šį projektą?',
    'project-summary-confirm-delete': 'Ar tikrai norite ištrinti šį projektą?',
    'project-summary-confirm-restore': 'Ar tikrai norite atkurti šį projektą?',
    'project-summary-delete': 'Ištrinti projektą',
    'project-summary-description': 'Aprašymas',
    'project-summary-edit': 'Redaguoti projektą',
    'project-summary-emblem': 'Emblema',
    'project-summary-name': 'Identifikatorius',
    'project-summary-new-members': 'Nauji nariai',
    'project-summary-new-members-auto-accept-guest': 'Svečiai priimami automatiškai',
    'project-summary-new-members-auto-accept-user': 'Reguliarūs vartotojai priimami automatiškai',
    'project-summary-new-members-join-guest': 'Svečiai gali paprašyti prisijungti prie projekto',
    'project-summary-new-members-join-user': 'Reguliarūs vartotojai gali paprašyti prisijungti prie projekto',
    'project-summary-new-members-manual': 'Nariai pridedami rankiniu būdu',
    'project-summary-other-actions': 'Kiti veiksmai',
    'project-summary-restore': 'Atkurti projektą',
    'project-summary-return': 'Grįžti į projektų sąrašą',
    'project-summary-save': 'Išsaugoti projektą',
    'project-summary-statistics': 'Veikla',
    'project-summary-title': 'Pavadinimas',

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, '1 kitas', '2 kiti', '10 kitų');
    },

    'repo-list-cancel': 'Atšaukti',
    'repo-list-column-date-range': 'Aktyvus laikotarpis',
    'repo-list-column-issue-tracker': 'Klaidų sekimas',
    'repo-list-column-last-modified': 'Pakeitimo data',
    'repo-list-column-last-month': 'Praėjusį mėnesį',
    'repo-list-column-server': 'Serveriai',
    'repo-list-column-this-month': 'Šį mėnesį',
    'repo-list-column-title': 'Pavadinimas',
    'repo-list-column-to-date': 'Iki šiol',
    'repo-list-confirm-remove-$count': (count) => {
        let repos = cardinal(count, 'pasirinktą saugyklą', 'šias 2 pasirinktas saugyklas', 'šias 10 pasirinktų saugyklų');
        return `Ar tikrai norite atsieti ${repos} nuo projekto?`;
    },
    'repo-list-edit': 'Redaguoti saugyklų sąrašą',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Įjungtas',
    'repo-list-save': 'Išsaugoti saugyklų sąrašą',
    'repo-list-title': 'Saugyklos',

    'repo-summary-$title': (title) => {
        let text = `Saugykla`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': 'Atšaukti',
    'repo-summary-confirm-remove': 'Ar tikrai norite atsieti šią saugyklą nuo projekto?',
    'repo-summary-confirm-restore': 'Ar tikrai norite atkurti šią saugyklą prie projekto?',
    'repo-summary-edit': 'Redaguoti saugyklą',
    'repo-summary-gitlab-name': 'GitLab projekto pavadinimas',
    'repo-summary-issue-tracker': 'Klaidų sekimas',
    'repo-summary-issue-tracker-disabled': 'Išjungtas',
    'repo-summary-issue-tracker-enabled': 'Įjungtas',
    'repo-summary-remove': 'Pašalinti saugyklą',
    'repo-summary-restore': 'Atkurti saugyklą',
    'repo-summary-return': 'Grįžti į saugyklų sąrašą',
    'repo-summary-save': 'Išsaugoti saugyklą',
    'repo-summary-statistics': 'Veikla',
    'repo-summary-title': 'Pavadinimas',

    'repository-tooltip-$count': (count) => {
        return cardinal(count, '1 saugykla', '2 saugyklos', '10 saugyklų');
    },

    'rest-list-add': 'Pridėti naują šaltinį',
    'rest-list-cancel': 'Atšaukti',
    'rest-list-column-identifier': 'Identifikatorius',
    'rest-list-column-last-modified': 'Pakeitimo data',
    'rest-list-column-type': 'Tipas',
    'rest-list-column-url': 'URL',
    'rest-list-confirm-disable-$count': (count) => {
        let sources = cardinal(count, 'šį šaltinį', 'šiuos 2 šaltinius', 'šiuos 10 šaltinių');
        return `Ar tikrai norite deaktyvuoti ${sources}?`;
    },
    'rest-list-confirm-reactivate-$count': (count) => {
        let sources = cardinal(count, 'šį šaltinį', 'šiuos 2 šaltinius', 'šiuos 10 šaltinių');
        return `Ar tikrai norite reaktyvuoti ${sources}?`;
    },
    'rest-list-edit': 'Redaguoti šaltinių sąrašą',
    'rest-list-save': 'Išsaugoti šaltinių sąrašą',
    'rest-list-status-deleted': 'Ištrintas',
    'rest-list-status-disabled': 'Deaktyvuotas',
    'rest-list-title': 'REST šaltiniai',

    'rest-summary-$title': (title) => {
        let text = 'REST šaltinis';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'rest-summary-add': 'Pridėti naują šaltinį',
    'rest-summary-cancel': 'Atšaukti',
    'rest-summary-confirm-delete': 'Ar tikrai norite ištrinti šį šaltinį?',
    'rest-summary-confirm-disable': 'Ar tikrai norite deaktyvuoti šį šaltinį?',
    'rest-summary-confirm-reactivate': 'Ar tikrai norite reaktyvuoti šį šaltinį?',
    'rest-summary-delete': 'Ištrinti šaltinį',
    'rest-summary-description': 'Aprašymas',
    'rest-summary-disable': 'Deaktyvuoti šaltinį',
    'rest-summary-edit': 'Redaguoti šaltinį',
    'rest-summary-max-age': 'Maksimalus amžius',
    'rest-summary-name': 'Identifikatorius',
    'rest-summary-reactivate': 'Reaktyvuoti šaltinį',
    'rest-summary-return': 'Grįžti į šaltinių sąrašą',
    'rest-summary-save': 'Išsaugoti šaltinį',
    'rest-summary-type': 'Tipas',
    'rest-summary-url': 'URL',

    'rest-type-generic': 'Bendras',
    'rest-type-wordpress': 'WordPress',

    'role-list-add': 'Pridėti naują vaidmenį',
    'role-list-cancel': 'Atšaukti',
    'role-list-column-last-modified': 'Pakeitimo data',
    'role-list-column-title': 'Pavadinimas',
    'role-list-column-users': 'Vartotojai',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'pasirinktą vaidmenį', 'šiuos 2 pasirinktus vaidmenis', 'šiuos 10 pasirinktų vaidmenų');
        return `Ar tikrai norite deaktyvuoti ${roles}?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'pasirinktą vaidmenį', 'šiuos 2 pasirinktus vaidmenis', 'šiuos 10 pasirinktų vaidmenų');
        return `Ar tikrai norite reaktyvuoti ${roles}?`;
    },
    'role-list-edit': 'Redaguoti vaidmenų sąrašą',
    'role-list-save': 'Išsaugoti vaidmenų sąrašą',
    'role-list-status-deleted': 'Ištrintas',
    'role-list-status-disabled': 'Deaktyvuotas',
    'role-list-title': 'Vaidmenys',

    'role-summary-$title': (title) => {
        let text = 'Vaidmuo';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': 'Pridėti naują vaidmenį',
    'role-summary-cancel': 'Atšaukti',
    'role-summary-confirm-delete': 'Ar tikrai norite ištrinti šį vaidmenį?',
    'role-summary-confirm-disable': 'Ar tikrai norite deaktyvuoti šį vaidmenį?',
    'role-summary-confirm-reactivate': 'Ar tikrai norite reaktyvuoti šį vaidmenį?',
    'role-summary-delete': 'Ištrinti vaidmenį',
    'role-summary-description': 'Aprašymas',
    'role-summary-disable': 'Deaktyvuoti vaidmenį',
    'role-summary-edit': 'Redaguoti vaidmenį',
    'role-summary-name': 'Identifikatorius',
    'role-summary-rating': 'Istorijos prioritetas',
    'role-summary-rating-high': 'Aukštas',
    'role-summary-rating-low': 'Žemas',
    'role-summary-rating-normal': 'Normalus',
    'role-summary-rating-very-high': 'Labai aukštas',
    'role-summary-rating-very-low': 'Labai žemas',
    'role-summary-reactivate': 'Reaktyvuoti vaidmenį',
    'role-summary-return': 'Grįžti į vaidmenų sąrašą',
    'role-summary-save': 'Išsaugoti vaidmenį',
    'role-summary-title': 'Pavadinimas',
    'role-summary-users': 'Vartotojai',

    'role-tooltip-$count-others': (count) => {
        return cardinal(count, '10 kitas', '10 kiti', '10 kitų');
    },

    'server-list-add': 'Pridėti naują serverį',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Įsigyta',
    'server-list-cancel': 'Atšaukti',
    'server-list-column-api-access': 'API prieiga',
    'server-list-column-last-modified': 'Pakeitimo data',
    'server-list-column-oauth': 'OAuth leidimas',
    'server-list-column-title': 'Pavadinimas',
    'server-list-column-type': 'Tipas',
    'server-list-column-users': 'Vartotojai',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'pasirinktą serverį', 'šiuos 2 pasirinktus serverius', 'šiuos 10 pasirinktų serverių');
        return `Ar tikrai norite deaktyvuoti ${servers}?`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'pasirinktą serverį', 'šiuos 2 pasirinktus serverius', 'šiuos 10 pasirinktų serverių');
        return `Ar tikrai norite reaktyvuoti ${servers}?`;
    },
    'server-list-edit': 'Redaguoti serverių sąrašą',
    'server-list-oauth-false': '',
    'server-list-oauth-true': 'Aktyvus',
    'server-list-save': 'Išsaugoti serverių sąrašą',
    'server-list-status-deleted': 'Ištrintas',
    'server-list-status-disabled': 'Deaktyvuotas',
    'server-list-title': 'Serveriai',

    'server-summary-acquire': 'Įsigyti API prieigą',
    'server-summary-activities': 'Veikla',
    'server-summary-add': 'Pridėti naują serverį',
    'server-summary-api-access': 'API prieiga',
    'server-summary-api-access-acquired': 'Įsigyta administracinė prieiga',
    'server-summary-api-access-not-applicable': 'Netaikoma',
    'server-summary-api-access-pending': 'Laukiama vartotojo veiksmų',
    'server-summary-cancel': 'Atšaukti',
    'server-summary-confirm-delete': 'Ar tikrai norite ištrinti šį serverį?',
    'server-summary-confirm-disable': 'Ar tikrai norite deaktyvuoti šį serverį?',
    'server-summary-confirm-reactivate': 'Ar tikrai norite reaktyvuoti šį serverį?',
    'server-summary-delete': 'Ištrinti serverį',
    'server-summary-disable': 'Deaktyvuoti serverį',
    'server-summary-edit': 'Redaguoti serverį',
    'server-summary-gitlab-admin': 'GitLab administratorius',
    'server-summary-gitlab-external-user': 'GitLab išorinis vartotojas',
    'server-summary-gitlab-regular-user': 'GitLab reguliarus vartotojas',
    'server-summary-member-$name': (name) => {
        return `Serveris: ${name}`;
    },
    'server-summary-name': 'Identifikatorius',
    'server-summary-new-user': 'Naujas vartotojas',
    'server-summary-new-users': 'Nauji vartotojai',
    'server-summary-oauth-app-id': 'Programos ID',
    'server-summary-oauth-app-key': 'Programos raktas',
    'server-summary-oauth-app-secret': 'Programos paslaptis',
    'server-summary-oauth-application-id': 'Programos ID',
    'server-summary-oauth-application-secret': 'Programos paslaptis',
    'server-summary-oauth-callback-url': 'OAuth atgalinio skambučio URL',
    'server-summary-oauth-client-id': 'Kliento ID',
    'server-summary-oauth-client-secret': 'Kliento paslaptis',
    'server-summary-oauth-deauthorize-callback-url': 'Deautorizacijo atgalinio skambučio URL',
    'server-summary-oauth-gitlab-url': 'GitLab serverio URL',
    'server-summary-oauth-redirect-uri': 'Nukreipimo URI',
    'server-summary-oauth-redirect-url': 'Nukreipimo URL',
    'server-summary-oauth-site-url': 'Svetainės URL',
    'server-summary-privacy-policy-url': 'Privatumo politikos URL',
    'server-summary-reactivate': 'Reaktyvuoti serveris',
    'server-summary-return': 'Grįžti į serverių sąrašą',
    'server-summary-role-none': 'Nepriskirti jokių vaidmenis naujiems vartotojams',
    'server-summary-roles': 'Vaidmenų priskyrimas',
    'server-summary-save': 'Išsaugoti serverį',
    'server-summary-system-address-missing': 'Sistemos adresas nenustatytas',
    'server-summary-terms-and-conditions-url': 'Terminų ir sąlygų URL',
    'server-summary-test-oauth': 'Patikrinti OAuth integravimą',
    'server-summary-title': 'Pavadinimas',
    'server-summary-type': 'Serverio tipas',
    'server-summary-user-automatic-approval': 'Patvirtinti naujus vartotojus automatiškai',
    'server-summary-user-import-disabled': 'Neregistruoti naujus vartotojus',
    'server-summary-user-import-gitlab-admin-disabled': 'Neimportuoti GitLab administratorių',
    'server-summary-user-import-gitlab-external-user-disabled': 'Neimportuoti GitLab išorinių vartotojų',
    'server-summary-user-import-gitlab-user-disabled': 'Neimportuoti GitLab vartotojų',
    'server-summary-user-type-admin': 'Administratorius',
    'server-summary-user-type-guest': 'Svečias',
    'server-summary-user-type-moderator': 'Moderatorius',
    'server-summary-user-type-regular': 'Reguliarus vartotojas',
    'server-summary-whitelist': 'E-pašto adresų baltasis sąrašas',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Nuotrauka fone',
    'settings-cancel': 'Atšaukti',
    'settings-company-name': 'Įmonės pavadinimas',
    'settings-edit': 'Redaguoti nustatymus',
    'settings-input-languages': 'Įvesties kalbos',
    'settings-push-relay': 'Push pranešimo relė',
    'settings-save': 'Išsaugoti nustatymus',
    'settings-site-address': 'Svetainės adresas',
    'settings-site-description': 'Aprašymas',
    'settings-site-title': 'Svetainės pavadinimas',
    'settings-title': 'Nustatymai',

    'sign-in-$title': (title) => {
        let text = `Prisijungti`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': 'Prieigos prašymas buvo atmestas',
    'sign-in-error-account-disabled': 'Vartotojo paskyra šiuo metu išjungta',
    'sign-in-error-existing-users-only': 'Ši sistema gali naudotis tik įgaliotais darbuotojais',
    'sign-in-error-restricted-area': 'Vartotojas nėra administratorius',
    'sign-in-oauth': 'Prisijungti per OAuth',
    'sign-in-password': 'Slaptažodis:',
    'sign-in-problem-incorrect-username-password': 'Neteisingas naudotojo vardas arba slaptažodis',
    'sign-in-problem-no-support-for-username-password': 'Sistema nepriima prisijungimo naudojant slaptažodį',
    'sign-in-problem-unexpected-error': 'Netikėta klaida',
    'sign-in-submit': 'Prisijungti',
    'sign-in-username': 'Vartotojo vardas:',

    'sign-off-menu-sign-off': 'Atsijungti',

    'spreadsheet-list-add': 'Pridėti naują nuorodą',
    'spreadsheet-list-cancel': 'Atšaukti',
    'spreadsheet-list-column-filename': 'Failo pavadinimas',
    'spreadsheet-list-column-last-modified': 'Pakeitimo data',
    'spreadsheet-list-column-sheets': 'Lapai',
    'spreadsheet-list-column-url': 'URL',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, 'šią nuorodą', 'šias 2 nuorodas', 'šias 10 nuorodų');
        return `Ar tikrai norite deaktyvuoti ${spreadsheets}?`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, 'this link', 'these 2 links');
        return `Ar tikrai norite reaktyvuoti ${spreadsheets}?`;
    },
    'spreadsheet-list-edit': 'Redaguoti nuorodų sąrašą',
    'spreadsheet-list-save': 'Išsaugoti nuorodų sąrašą',
    'spreadsheet-list-status-deleted': 'Ištrintas',
    'spreadsheet-list-status-disabled': 'Deaktyvuotas',
    'spreadsheet-list-title': 'Excel failai',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Excel failas';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': 'Pridėti naują nuorodą',
    'spreadsheet-summary-cancel': 'Atšaukti',
    'spreadsheet-summary-confirm-delete': 'Ar tikrai norite ištrinti šią nuorodą?',
    'spreadsheet-summary-confirm-disable': 'Ar tikrai norite deaktyvuoti šią nuorodą?',
    'spreadsheet-summary-confirm-reactivate': 'Ar tikrai norite reaktyvuoti šią nuorodą?',
    'spreadsheet-summary-delete': 'Ištrinti nuorodą',
    'spreadsheet-summary-description': 'Apibūdinimas',
    'spreadsheet-summary-disable': 'Deaktyvuoti nuorodą',
    'spreadsheet-summary-edit': 'Redaguoti nuorodą',
    'spreadsheet-summary-filename': 'Failo pavadinimas',
    'spreadsheet-summary-hidden': 'Paieška',
    'spreadsheet-summary-hidden-false': 'Atsiranda paieškos rezultatuose',
    'spreadsheet-summary-hidden-true': 'Paslėpta nuo paieškos',
    'spreadsheet-summary-name': 'Identifikatorius',
    'spreadsheet-summary-reactivate': 'Reaktyvuoti nuorodą',
    'spreadsheet-summary-return': 'Grįžti į nuorodų sąrašą',
    'spreadsheet-summary-save': 'Išsaugoti nuorodą',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Lapas ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': 'Pavadinimas',
    'spreadsheet-summary-url': 'URL',

    'task-$seconds': (seconds) => {
        return cardinal(seconds, '1 sekundė', '2 sekundės', '10 sekundžių');
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        return cardinal(count, '1 revizijos komentaras importuotas', '2 revizijos komentarai importuoti', '10 revizijos komentarų importuoti');
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        return cardinal(count, '1 įvykis importuotas', '2 įvykiai importuoti', '10 įvykių importuoti');
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        return cardinal(count, '1 klaidos ataskaitos komentaras importuotas', '2 klaidos ataskaitos komentarai importuoti', '10 klaidos ataskaitos komentarų importuoti');
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        return cardinal(count, '1 prašymo sujungti komentaras importuotas', '2 prašymo sujungti komentarai importuoti', '10 prašymo sujungti komentarų importuoti');
    },
    'task-imported-$count-repos': (count) => {
        return cardinal(count, '1 saugykla importuota', '2 saugyklos importuotos', '10 saugyklų importuotos');
    },
    'task-imported-$count-users': (count) => {
        return cardinal(count, '1 vartotojas importuotas', '2 vartotojai importuoti', '10 vartotojų importuoti');
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, '1 revizija', '2 rewizjomis', '5 rewizjomis');
        return `1 pakeitimų siuntimas į šaką „${branch}” su ${commits} importuotas iš projekto „${repo}”`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Importuojamos revizijos komentarus iš projekto „${repo}”`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Importuojamos įvykius iš projekto „${repo}”`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Importuojamos klaidos ataskaitos komentarus iš projekto „${repo}”`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Importuojamos prašymo sujungti komentarus iš projekto „${repo}”`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Importuojamos pakeitimų siuntimą iš projekto „${repo}”`;
    },
    'task-importing-repos': 'Importuojamos saugyklas',
    'task-importing-users': 'Importuojamos vartotojus',
    'task-installed-$count-hooks': (count) => {
        return cardinal(count, '1 kabliukas įrengtas', '2 kabliukai įrengti', '10 kabliukų įrengti');
    },
    'task-installing-hooks': 'Diegimas kabliukus',
    'task-removed-$count-hooks': (count) => {
        return cardinal(count, '1 kabliukas pašalintas', '2 kabliukai pašalinti', '10 kabliukų pašalinti');
    },
    'task-removed-$count-repos': (count) => {
        return cardinal(count, '1 saugykla ištrinta', '2 saugyklos ištrintos', '10 saugyklų ištrintos');
    },
    'task-removed-$count-users': (count) => {
        return cardinal(count, '1 vartotojas ištrintas', '2 vartotojai ištrinti', '10 vartotojų ištrinti');
    },
    'task-removing-hooks': 'Pašalinimas kabliukus',
    'task-updated-$count-repos': (count) => {
        return cardinal(count, '1 saugykla atnaujinta', '2 saugyklos atnaujintos', '10 saugyklų atnaujintos');
    },
    'task-updated-$count-users': (count) => {
        return cardinal(count, '1 vartotojas atnaujintas', '2 vartotojai atnaujinti', '10 vartotojų atnaujinti');
    },

    'text-field-placeholder-none': 'nieko',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' ir ', tooltip ];
    },
    'tooltip-more': 'Daugiau',

    'tz-name-abidjan': 'Abidžanas',
    'tz-name-accra': 'Akra',
    'tz-name-acre': 'Acre',
    'tz-name-act': 'Australijos sostinės teritorija',
    'tz-name-adak': 'Adak',
    'tz-name-addis-ababa': 'Adis Abeba',
    'tz-name-adelaide': 'Adelaidė',
    'tz-name-aden': 'Adenas',
    'tz-name-africa': 'Afrika',
    'tz-name-alaska': 'Aliaska',
    'tz-name-aleutian': 'Aleutas',
    'tz-name-algiers': 'Alžyras',
    'tz-name-almaty': 'Almata',
    'tz-name-america': 'Amerika',
    'tz-name-amman': 'Ammanas',
    'tz-name-amsterdam': 'Amsterdamas',
    'tz-name-anadyr': 'Anadyras',
    'tz-name-anchorage': 'Anchorage',
    'tz-name-andorra': 'Andora',
    'tz-name-anguilla': 'Angilija',
    'tz-name-antananarivo': 'Antananarivo',
    'tz-name-antarctica': 'Antarktida',
    'tz-name-antigua': 'Antigva',
    'tz-name-apia': 'Apia',
    'tz-name-aqtau': 'Aqtau',
    'tz-name-aqtobe': 'Aktobe',
    'tz-name-araguaina': 'Araguaina',
    'tz-name-arctic': 'Arktis',
    'tz-name-argentina': 'Argentina',
    'tz-name-arizona': 'Arizona',
    'tz-name-aruba': 'Aruba',
    'tz-name-ashgabat': 'Ašgabatas',
    'tz-name-ashkhabad': 'Ašhabadas',
    'tz-name-asia': 'Azija',
    'tz-name-asmara': 'Asmara',
    'tz-name-asmera': 'Asmera',
    'tz-name-astrakhan': 'Astrachanė',
    'tz-name-asuncion': 'Asunsjonas',
    'tz-name-athens': 'Atėnai',
    'tz-name-atikokan': 'Atikokan',
    'tz-name-atka': 'Atka',
    'tz-name-atlantic': 'Atlanto vandenynas',
    'tz-name-atyrau': 'Atyrau',
    'tz-name-auckland': 'Oklandas',
    'tz-name-australia': 'Australija',
    'tz-name-azores': 'Azorų salos',
    'tz-name-baghdad': 'Bagdadas',
    'tz-name-bahia': 'Bahia',
    'tz-name-bahia-banderas': 'Bahia Banderas',
    'tz-name-bahrain': 'Bahreinas',
    'tz-name-baja-norte': 'Baja Norte',
    'tz-name-baja-sur': 'Baja Sur',
    'tz-name-baku': 'Baku',
    'tz-name-bamako': 'Bamakas',
    'tz-name-bangkok': 'Bankokas',
    'tz-name-bangui': 'Bangui',
    'tz-name-banjul': 'Bandžulis',
    'tz-name-barbados': 'Barbadosas',
    'tz-name-barnaul': 'Barnaulas',
    'tz-name-beirut': 'Beirutas',
    'tz-name-belem': 'Belemas',
    'tz-name-belfast': 'Belfastas',
    'tz-name-belgrade': 'Belgradas',
    'tz-name-belize': 'Belizas',
    'tz-name-berlin': 'Berlynas',
    'tz-name-bermuda': 'Bermuda',
    'tz-name-beulah': 'Beulah',
    'tz-name-bishkek': 'Biškekas',
    'tz-name-bissau': 'Bisau',
    'tz-name-blanc-sablon': 'Blanc-Sablon',
    'tz-name-blantyre': 'Blantyre',
    'tz-name-boa-vista': 'Boa Vista',
    'tz-name-bogota': 'Bogota',
    'tz-name-boise': 'Boise',
    'tz-name-bougainville': 'Bougainville',
    'tz-name-bratislava': 'Bratislava',
    'tz-name-brazil': 'Brazilija',
    'tz-name-brazzaville': 'Brazavilis',
    'tz-name-brisbane': 'Brisbenas',
    'tz-name-broken-hill': 'Broken Hill',
    'tz-name-brunei': 'Brunėjus',
    'tz-name-brussels': 'Briuselis',
    'tz-name-bucharest': 'Bukareštas',
    'tz-name-budapest': 'Budapeštas',
    'tz-name-buenos-aires': 'Buenos Airės',
    'tz-name-bujumbura': 'Bujumbura',
    'tz-name-busingen': 'Busingen',
    'tz-name-cairo': 'Kairas',
    'tz-name-calcutta': 'Kalkuta',
    'tz-name-cambridge-bay': 'Kembridžo įlanka',
    'tz-name-campo-grande': 'Campo Grande',
    'tz-name-canada': 'Kanada',
    'tz-name-canary': 'Kanarų salos',
    'tz-name-canberra': 'Kanbera',
    'tz-name-cancun': 'Kankunas',
    'tz-name-cape-verde': 'Žaliasis Kyšulys',
    'tz-name-caracas': 'Karakasas',
    'tz-name-casablanca': 'Kasablanka',
    'tz-name-casey': 'Casey',
    'tz-name-catamarca': 'Catamarca',
    'tz-name-cayenne': 'Kajenas',
    'tz-name-cayman': 'Kaimanas',
    'tz-name-center': 'Centras',
    'tz-name-central': 'Centrinis',
    'tz-name-ceuta': 'Seuta',
    'tz-name-chagos': 'Chagosas',
    'tz-name-chatham': 'Chatham',
    'tz-name-chicago': 'Čikaga',
    'tz-name-chihuahua': 'Čihuahua',
    'tz-name-chile': 'Čilė',
    'tz-name-chisinau': 'Kišiniovas',
    'tz-name-chita': 'Chita',
    'tz-name-choibalsan': 'Choibalsanas',
    'tz-name-chongqing': 'Čongčingas',
    'tz-name-christmas': 'Kalėdų sala',
    'tz-name-chungking': 'Čongčingas',
    'tz-name-chuuk': 'Chuuk',
    'tz-name-cocos': 'Kokosų salos',
    'tz-name-colombo': 'Kolombas',
    'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
    'tz-name-comoro': 'Comoro',
    'tz-name-conakry': 'Conakry',
    'tz-name-continental': 'Continental',
    'tz-name-copenhagen': 'Kopenhaga',
    'tz-name-coral-harbour': 'Koralų uostas',
    'tz-name-cordoba': 'Kordoba',
    'tz-name-costa-rica': 'Kosta Rika',
    'tz-name-creston': 'Creston',
    'tz-name-cuiaba': 'Cuiaba',
    'tz-name-curacao': 'Curacao',
    'tz-name-currie': 'Currie',
    'tz-name-dacca': 'Dacca',
    'tz-name-dakar': 'Dakaras',
    'tz-name-damascus': 'Damaskas',
    'tz-name-danmarkshavn': 'Danmarkshavn',
    'tz-name-dar-es-salaam': 'Dar es Salamas',
    'tz-name-darwin': 'Darvinas',
    'tz-name-davis': 'Davis',
    'tz-name-dawson': 'Dawson',
    'tz-name-dawson-creek': 'Dawson Creek',
    'tz-name-de-noronha': 'De Noronha',
    'tz-name-denver': 'Denveris',
    'tz-name-detroit': 'Detroitas',
    'tz-name-dhaka': 'Daka',
    'tz-name-dili': 'Dili',
    'tz-name-djibouti': 'Džibutis',
    'tz-name-dominica': 'Dominika',
    'tz-name-douala': 'Douala',
    'tz-name-dubai': 'Dubajus',
    'tz-name-dublin': 'Dublinas',
    'tz-name-dumont-d-urville': 'Dumont d’Urville',
    'tz-name-dushanbe': 'Dušanbė',
    'tz-name-east': 'Rytai',
    'tz-name-east-indiana': 'Rytų Indiana',
    'tz-name-easter': 'Velykų sala',
    'tz-name-easter-island': 'Velykų sala',
    'tz-name-eastern': 'Rytų',
    'tz-name-edmonton': 'Edmontonas',
    'tz-name-efate': 'Efate',
    'tz-name-eirunepe': 'Eirunepe',
    'tz-name-el-aaiun': 'El Aaiun',
    'tz-name-el-salvador': 'Salvadoras',
    'tz-name-enderbury': 'Enderbury',
    'tz-name-ensenada': 'Ensenada',
    'tz-name-eucla': 'Eucla',
    'tz-name-europe': 'Europa',
    'tz-name-faeroe': 'Farerų salos',
    'tz-name-fakaofo': 'Fakaofo',
    'tz-name-famagusta': 'Famagusta',
    'tz-name-faroe': 'Farerų salos',
    'tz-name-fiji': 'Fidžis',
    'tz-name-fort-nelson': 'Fort Nelsonas',
    'tz-name-fort-wayne': 'Fort Veinas',
    'tz-name-fortaleza': 'Fortaleza',
    'tz-name-freetown': 'Fritaunas',
    'tz-name-funafuti': 'Funafuti',
    'tz-name-gaborone': 'Gaborone',
    'tz-name-galapagos': 'Galapagai',
    'tz-name-gambier': 'Gambier',
    'tz-name-gaza': 'Gaza',
    'tz-name-general': 'Bendra',
    'tz-name-gibraltar': 'Gibraltaras',
    'tz-name-glace-bay': 'Glace Bay',
    'tz-name-godthab': 'Godthabas',
    'tz-name-goose-bay': 'Goose Bay',
    'tz-name-grand-turk': 'Grand Turk',
    'tz-name-grenada': 'Grenada',
    'tz-name-guadalcanal': 'Guadalcanal',
    'tz-name-guadeloupe': 'Gvadelupa',
    'tz-name-guam': 'Guamas',
    'tz-name-guatemala': 'Gvatemala',
    'tz-name-guayaquil': 'Gvajakilis',
    'tz-name-guernsey': 'Gernsis',
    'tz-name-guyana': 'Gajana',
    'tz-name-halifax': 'Halifaksas',
    'tz-name-harare': 'Harare',
    'tz-name-harbin': 'Harbinas',
    'tz-name-havana': 'Havana',
    'tz-name-hawaii': 'Havajai',
    'tz-name-hebron': 'Hebronas',
    'tz-name-helsinki': 'Helsinkis',
    'tz-name-hermosillo': 'Hermosillo',
    'tz-name-ho-chi-minh': 'Ho Chi Minh',
    'tz-name-hobart': 'Hobartas',
    'tz-name-hong-kong': 'Honkongas',
    'tz-name-honolulu': 'Honolulu',
    'tz-name-hovd': 'Hovd',
    'tz-name-indian': 'Indijos vandenynas',
    'tz-name-indiana': 'Indiana',
    'tz-name-indiana-starke': 'Indiana-Starke',
    'tz-name-indianapolis': 'Indianapolis',
    'tz-name-inuvik': 'Inuvik',
    'tz-name-iqaluit': 'Iqaluit',
    'tz-name-irkutsk': 'Irkutskas',
    'tz-name-isle-of-man': 'Meno sala',
    'tz-name-istanbul': 'Stambulas',
    'tz-name-jakarta': 'Džakarta',
    'tz-name-jamaica': 'Jamaika',
    'tz-name-jan-mayen': 'Jan Mayen',
    'tz-name-jayapura': 'Jayapura',
    'tz-name-jersey': 'Džersis',
    'tz-name-jerusalem': 'Jeruzalė',
    'tz-name-johannesburg': 'Johanesburgas',
    'tz-name-johnston': 'Johnston',
    'tz-name-juba': 'Džuba',
    'tz-name-jujuy': 'Jujuy',
    'tz-name-juneau': 'Juneau',
    'tz-name-kabul': 'Kabulas',
    'tz-name-kaliningrad': 'Kaliningradas',
    'tz-name-kamchatka': 'Kamčatka',
    'tz-name-kampala': 'Kampala',
    'tz-name-karachi': 'Karačis',
    'tz-name-kashgar': 'Kashgar',
    'tz-name-kathmandu': 'Katmandu',
    'tz-name-katmandu': 'Katmandu',
    'tz-name-kentucky': 'Kentukis',
    'tz-name-kerguelen': 'Kerguelen',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': 'Chartumas',
    'tz-name-kiev': 'Kijevas',
    'tz-name-kigali': 'Kigalis',
    'tz-name-kinshasa': 'Kinšasa',
    'tz-name-kiritimati': 'Kiritimati',
    'tz-name-kirov': 'Kirovas',
    'tz-name-knox': 'Knoxas',
    'tz-name-knox-in': 'Knox, Indiana',
    'tz-name-kolkata': 'Kolkata',
    'tz-name-kosrae': 'Kosrae',
    'tz-name-kralendijk': 'Kralendijk',
    'tz-name-krasnoyarsk': 'Krasnojarskas',
    'tz-name-kuala-lumpur': 'Kuala Lumpūras',
    'tz-name-kuching': 'Kučingas',
    'tz-name-kuwait': 'Kuveitas',
    'tz-name-kwajalein': 'Kwajalein',
    'tz-name-la-paz': 'La Paz',
    'tz-name-la-rioja': 'La Rioja',
    'tz-name-lagos': 'Lagosas',
    'tz-name-lhi': 'Lord Howe sala',
    'tz-name-libreville': 'Librevilis',
    'tz-name-lima': 'Lima',
    'tz-name-lindeman': 'Lindemanas',
    'tz-name-lisbon': 'Lisabona',
    'tz-name-ljubljana': 'Liubliana',
    'tz-name-lome': 'Lomė',
    'tz-name-london': 'Londonas',
    'tz-name-longyearbyen': 'Longyearbyen',
    'tz-name-lord-howe': 'Lord Howe',
    'tz-name-los-angeles': 'Los Andželas',
    'tz-name-louisville': 'Louisville',
    'tz-name-lower-princes': 'Lower Prince’s Quarter',
    'tz-name-luanda': 'Luanda',
    'tz-name-lubumbashi': 'Lubumbashi',
    'tz-name-lusaka': 'Lusaka',
    'tz-name-luxembourg': 'Liuksemburgas',
    'tz-name-macao': 'Makao',
    'tz-name-macau': 'Makao',
    'tz-name-maceio': 'Maceio',
    'tz-name-macquarie': 'Macquarie',
    'tz-name-madeira': 'Madeira',
    'tz-name-madrid': 'Madridas',
    'tz-name-magadan': 'Magadanas',
    'tz-name-mahe': 'Mahe',
    'tz-name-majuro': 'Majuro',
    'tz-name-makassar': 'Makassaras',
    'tz-name-malabo': 'Malabo',
    'tz-name-maldives': 'Maldyvai',
    'tz-name-malta': 'Malta',
    'tz-name-managua': 'Managva',
    'tz-name-manaus': 'Manausas',
    'tz-name-manila': 'Manila',
    'tz-name-maputo': 'Maputu',
    'tz-name-marengo': 'Marengo',
    'tz-name-mariehamn': 'Mariehamn',
    'tz-name-marigot': 'Marigot',
    'tz-name-marquesas': 'Marquesas',
    'tz-name-martinique': 'Martinika',
    'tz-name-maseru': 'Maseru',
    'tz-name-matamoros': 'Matamoros',
    'tz-name-mauritius': 'Mauricijus',
    'tz-name-mawson': 'Mawson',
    'tz-name-mayotte': 'Majotas',
    'tz-name-mazatlan': 'Mazatlanas',
    'tz-name-mbabane': 'Mbabane',
    'tz-name-mc-murdo': 'McMurdo',
    'tz-name-melbourne': 'Melburnas',
    'tz-name-mendoza': 'Mendoza',
    'tz-name-menominee': 'Menominee',
    'tz-name-merida': 'Merida',
    'tz-name-metlakatla': 'Metlakatla',
    'tz-name-mexico': 'Meksika',
    'tz-name-mexico-city': 'Meksikas',
    'tz-name-michigan': 'Mičiganas',
    'tz-name-midway': 'Midway',
    'tz-name-minsk': 'Minskas',
    'tz-name-miquelon': 'Miquelon',
    'tz-name-mogadishu': 'Mogadishu',
    'tz-name-monaco': 'Monakas',
    'tz-name-moncton': 'Monctonas',
    'tz-name-monrovia': 'Monrovija',
    'tz-name-monterrey': 'Monterėjus',
    'tz-name-montevideo': 'Montevidėjas',
    'tz-name-monticello': 'Monticello',
    'tz-name-montreal': 'Monrealis',
    'tz-name-montserrat': 'Montseratas',
    'tz-name-moscow': 'Maskva',
    'tz-name-mountain': 'Kalnas',
    'tz-name-muscat': 'Maskatas',
    'tz-name-nairobi': 'Nairobis',
    'tz-name-nassau': 'Nasau',
    'tz-name-nauru': 'Nauru',
    'tz-name-ndjamena': 'Ndjamena',
    'tz-name-new-salem': 'New Salem',
    'tz-name-new-york': 'Niujorkas',
    'tz-name-newfoundland': 'Niufaundlandas',
    'tz-name-niamey': 'Niamey',
    'tz-name-nicosia': 'Nikosija',
    'tz-name-nipigon': 'Nipigonas',
    'tz-name-niue': 'Niue',
    'tz-name-nome': 'Nome',
    'tz-name-norfolk': 'Norfolkas',
    'tz-name-noronha': 'Noronha',
    'tz-name-north': 'Šiaurė',
    'tz-name-north-dakota': 'Šiaurės Dakota',
    'tz-name-nouakchott': 'Nuakšotas',
    'tz-name-noumea': 'Noumea',
    'tz-name-novokuznetsk': 'Novokuznetskas',
    'tz-name-novosibirsk': 'Novosibirskas',
    'tz-name-nsw': 'Naujasis Pietų Velsas',
    'tz-name-ojinaga': 'Ojinaga',
    'tz-name-omsk': 'Omskas',
    'tz-name-oral': 'Oralas',
    'tz-name-oslo': 'Oslas',
    'tz-name-ouagadougou': 'Vagadugu',
    'tz-name-pacific': 'Ramiojo vandenyno',
    'tz-name-pacific-new': 'Ramiojo vandenyno-Nauja',
    'tz-name-pago-pago': 'Pago Pago',
    'tz-name-palau': 'Palau',
    'tz-name-palmer': 'Palmer',
    'tz-name-panama': 'Panama',
    'tz-name-pangnirtung': 'Pangnirtung',
    'tz-name-paramaribo': 'Paramaribo',
    'tz-name-paris': 'Paryžius',
    'tz-name-perth': 'Pertas',
    'tz-name-petersburg': 'Sankt Peterburgas',
    'tz-name-phnom-penh': 'Pnompenis',
    'tz-name-phoenix': 'Phoenix',
    'tz-name-pitcairn': 'Pitkernas',
    'tz-name-podgorica': 'Podgorica',
    'tz-name-pohnpei': 'Pohnpei',
    'tz-name-ponape': 'Ponape',
    'tz-name-pontianak': 'Pontianak',
    'tz-name-port-au-prince': 'Port-au-Prince',
    'tz-name-port-moresby': 'Port Morsbis',
    'tz-name-port-of-spain': 'Port of Spain',
    'tz-name-porto-acre': 'Porto Acre',
    'tz-name-porto-novo': 'Porto-Novo',
    'tz-name-porto-velho': 'Porto Velho',
    'tz-name-prague': 'Praha',
    'tz-name-puerto-rico': 'Puerto Rikas',
    'tz-name-punta-arenas': 'Punta Arenas',
    'tz-name-pyongyang': 'Pchenjanas',
    'tz-name-qatar': 'Kataras',
    'tz-name-qostanay': 'Qostanay',
    'tz-name-queensland': 'Kvinslandas',
    'tz-name-qyzylorda': 'Qyzylorda',
    'tz-name-rainy-river': 'Lietinga upė',
    'tz-name-rangoon': 'Rangūnas',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': 'Rarotonga',
    'tz-name-recife': 'Resifė',
    'tz-name-regina': 'Regina',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': 'Reunionas',
    'tz-name-reykjavik': 'Reikjavikas',
    'tz-name-riga': 'Ryga',
    'tz-name-rio-branco': 'Rio Branco',
    'tz-name-rio-gallegos': 'Rio Gallegos',
    'tz-name-riyadh': 'Rijadas',
    'tz-name-rome': 'Roma',
    'tz-name-rosario': 'Rosarijas',
    'tz-name-rothera': 'Rothera',
    'tz-name-saigon': 'Saigonas',
    'tz-name-saipan': 'Saipanas',
    'tz-name-sakhalin': 'Sakhalinas',
    'tz-name-salta': 'Salta',
    'tz-name-samara': 'Samara',
    'tz-name-samarkand': 'Samarkandas',
    'tz-name-samoa': 'Samoa',
    'tz-name-san-juan': 'San Chuanas',
    'tz-name-san-luis': 'San Luisas',
    'tz-name-san-marino': 'San Marinas',
    'tz-name-santa-isabel': 'Santa Isabel',
    'tz-name-santarem': 'Santarem',
    'tz-name-santiago': 'Santjagas',
    'tz-name-santo-domingo': 'Santo Domingas',
    'tz-name-sao-paulo': 'San Paulas',
    'tz-name-sao-tome': 'San Tomė',
    'tz-name-sarajevo': 'Sarajevas',
    'tz-name-saratov': 'Saratovas',
    'tz-name-saskatchewan': 'Saskačevanas',
    'tz-name-scoresbysund': 'Scoresbysund',
    'tz-name-seoul': 'Seulas',
    'tz-name-shanghai': 'Šanchajus',
    'tz-name-shiprock': 'Shiprock',
    'tz-name-simferopol': 'Simferopolis',
    'tz-name-singapore': 'Singapūras',
    'tz-name-sitka': 'Sitka',
    'tz-name-skopje': 'Skopjė',
    'tz-name-sofia': 'Sofija',
    'tz-name-south': 'Pietų',
    'tz-name-south-georgia': 'Pietų Gruzija',
    'tz-name-south-pole': 'Pietų ašigalis',
    'tz-name-srednekolymsk': 'Srednekolymsk',
    'tz-name-st-barthelemy': 'St Barthelemy',
    'tz-name-st-helena': 'Šv. Helena',
    'tz-name-st-johns': 'St Johns',
    'tz-name-st-kitts': 'St Kitts',
    'tz-name-st-lucia': 'Sent Lusija',
    'tz-name-st-thomas': 'Šv. Tomas',
    'tz-name-st-vincent': 'St Vincent',
    'tz-name-stanley': 'Stanley',
    'tz-name-stockholm': 'Stokholmas',
    'tz-name-swift-current': 'Swift Current',
    'tz-name-sydney': 'Sidnėjus',
    'tz-name-syowa': 'Syowa',
    'tz-name-tahiti': 'Taitis',
    'tz-name-taipei': 'Taipėjus',
    'tz-name-tallinn': 'Talinas',
    'tz-name-tarawa': 'Tarawa',
    'tz-name-tashkent': 'Taškentas',
    'tz-name-tasmania': 'Tasmanija',
    'tz-name-tbilisi': 'Tbilisis',
    'tz-name-tegucigalpa': 'Tegusigalpa',
    'tz-name-tehran': 'Teheranas',
    'tz-name-tel-aviv': 'Tel Avivas',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': 'Thimbu',
    'tz-name-thimphu': 'Timfu',
    'tz-name-thule': 'Thule',
    'tz-name-thunder-bay': 'Thunder Bay',
    'tz-name-tijuana': 'Tichuana',
    'tz-name-timbuktu': 'Timbuktu',
    'tz-name-tirane': 'Tirane',
    'tz-name-tiraspol': 'Tiraspolis',
    'tz-name-tokyo': 'Tokijas',
    'tz-name-tomsk': 'Tomskas',
    'tz-name-tongatapu': 'Tongatapu',
    'tz-name-toronto': 'Torontas',
    'tz-name-tortola': 'Tortola',
    'tz-name-tripoli': 'Tripolis',
    'tz-name-troll': 'Troll',
    'tz-name-truk': 'Truk',
    'tz-name-tucuman': 'Tucuman',
    'tz-name-tunis': 'Tunisas',
    'tz-name-ujung-pandang': 'Ujung Pandang',
    'tz-name-ulaanbaatar': 'Ulanbatoras',
    'tz-name-ulan-bator': 'Ulan Bator',
    'tz-name-ulyanovsk': 'Uljanovskas',
    'tz-name-urumqi': 'Urumqi',
    'tz-name-us': 'Jungtinės Valstijos',
    'tz-name-ushuaia': 'Ušuaja',
    'tz-name-ust-nera': 'Ust-Nera',
    'tz-name-uzhgorod': 'Užhorodas',
    'tz-name-vaduz': 'Vaduz',
    'tz-name-vancouver': 'Vankuveris',
    'tz-name-vatican': 'Vatikanas',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': 'Viktorija',
    'tz-name-vienna': 'Viena',
    'tz-name-vientiane': 'Vientianas',
    'tz-name-vilnius': 'Vilnius',
    'tz-name-vincennes': 'Vincennes',
    'tz-name-virgin': 'Mergelių salos',
    'tz-name-vladivostok': 'Vladivostokas',
    'tz-name-volgograd': 'Volgogradas',
    'tz-name-vostok': 'Vostokas',
    'tz-name-wake': 'Wake Island',
    'tz-name-wallis': 'Wallis',
    'tz-name-warsaw': 'Varšuva',
    'tz-name-west': 'Vakarai',
    'tz-name-whitehorse': 'Whitehorse',
    'tz-name-winamac': 'Winamac',
    'tz-name-windhoek': 'Vindhukas',
    'tz-name-winnipeg': 'Vinipegas',
    'tz-name-yakutat': 'Jakutatas',
    'tz-name-yakutsk': 'Jakutskas',
    'tz-name-yancowinna': 'Yancowinna',
    'tz-name-yangon': 'Jangonas',
    'tz-name-yap': 'Yap',
    'tz-name-yekaterinburg': 'Jekaterinburgas',
    'tz-name-yellowknife': 'Yellowknife',
    'tz-name-yerevan': 'Jerevanas',
    'tz-name-yukon': 'Yukon',
    'tz-name-zagreb': 'Zagrebas',
    'tz-name-zaporozhye': 'Zaporožė',
    'tz-name-zurich': 'Ciurichas',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 failą', '2 failus', '10 failų');
        return `Siuntimas ${files}, likę ${size}`;
    },

    'user-list-add': 'Pridėti naują vartotoją',
    'user-list-approve-all': 'Patvirtinti visus prašymus',
    'user-list-cancel': 'Atšaukti',
    'user-list-column-email': 'E-paštas',
    'user-list-column-last-modified': 'Pakeitimo data',
    'user-list-column-name': 'Vardas ir pavardė',
    'user-list-column-projects': 'Projektai',
    'user-list-column-roles': 'Vaidmenys',
    'user-list-column-type': 'Tipas',
    'user-list-column-username': 'Vartotojo vardas',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'pasirinktą paskyrą', 'šias 2 pasirinktas paskyras', 'šias 10 pasirinktų paskyrų');
        return `Ar tikrai norite deaktyvuoti ${accounts}?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'pasirinktą paskyrą', 'šias 2 pasirinktas paskyras', 'šias 10 pasirinktų paskyrų');
        return `Ar tikrai norite reaktyvuoti ${accounts}?`;
    },
    'user-list-edit': 'Redaguoti vartotojų sąrašą',
    'user-list-reject-all': 'Atmesti visus prašymus',
    'user-list-save': 'Išsaugoti sąrašą vartotojų',
    'user-list-status-deleted': 'Ištrintas',
    'user-list-status-disabled': 'Deaktyvuotas',
    'user-list-status-pending': ' Laukiamas',
    'user-list-title': 'Vartotojai',
    'user-list-type-admin': 'Administratorius',
    'user-list-type-guest': 'Svečias',
    'user-list-type-moderator': 'Moderatorius',
    'user-list-type-regular': 'Reguliarus vartotojas',
    'user-summary-$name': (name) => {
        let text = 'Vartotojas';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': 'Pridėti naują vartotoją',
    'user-summary-cancel': 'Atšaukti',
    'user-summary-confirm-delete': 'Ar tikrai norite ištrinti šią paskyrą?',
    'user-summary-confirm-disable': 'Ar tikrai norite deaktyvuoti šią paskyrą?',
    'user-summary-confirm-reactivate': 'Ar tikrai norite reaktyvuoti šią paskyrą?',
    'user-summary-delete': 'Ištrinti vartotojo paskyrą',
    'user-summary-disable': 'Deaktyvuoti vartotojo paskyrą',
    'user-summary-edit': 'Redaguoti vartotoją',
    'user-summary-email': 'E-paštas',
    'user-summary-github': 'GitHub profilio URL',
    'user-summary-gitlab': 'GitLab profilio URL',
    'user-summary-ichat': 'iChat vardas',
    'user-summary-linkedin': 'LinkedIn profilio URL',
    'user-summary-member-$name': (name) => {
        let text = 'Narys';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': 'Redaguoti narį',
    'user-summary-member-return': 'Grįžti į narių sąrašą',
    'user-summary-member-save': 'Išsaugoti narį',
    'user-summary-name': 'Vardas ir pavardė',
    'user-summary-phone': 'Telefono numeris',
    'user-summary-profile-image': 'Profilio nuotrauka',
    'user-summary-reactivate': 'Reaktyvuoti vartotojo paskyrą',
    'user-summary-remove-membership': 'Pašalinti vartotoją iš projekto',
    'user-summary-restore-membership': 'Pridėti vartotoją prie projekto',
    'user-summary-return': 'Grįžti į vartotojų sąrašą',
    'user-summary-role-none': 'Jokio',
    'user-summary-roles': 'Vaidmenys',
    'user-summary-save': 'Išsaugoti vartotoją',
    'user-summary-skype': 'Skype vardas',
    'user-summary-slack': 'Slack vartotojo identifikatorius',
    'user-summary-slack-team': 'Slack komandos identifikatorius',
    'user-summary-social-links': 'Socialinių tinklų nuorodos',
    'user-summary-stackoverflow': 'Stack Overflow profilio URL',
    'user-summary-statistics': 'Veikla',
    'user-summary-twitter': 'Twitter vartotojo vardas',
    'user-summary-type': 'Vartotojo tipas',
    'user-summary-type-admin': 'Administratorius',
    'user-summary-type-guest': 'Svečias',
    'user-summary-type-moderator': 'Moderatorius',
    'user-summary-type-regular': 'Reguliarus vartotojas',
    'user-summary-username': 'Vartotojo vardas',

    'user-tooltip-$count': (count) => {
        return cardinal(count, '1 vartotojas', '2 vartotojai', '10 vartotojų');
    },

    'validation-duplicate-project-name': 'Projektas su šiuo identifikatoriumi jau yra',
    'validation-duplicate-role-name': 'Vaidmuo su šiuo identifikatoriumi jau yra',
    'validation-duplicate-server-name': 'Serveris su šiuo identifikatoriumi jau yra',
    'validation-duplicate-source-name': 'Šaltinis su šiuo identifikatoriumi jau yra',
    'validation-duplicate-spreadsheet-name': 'Nuoroda su šiuo identifikatoriumi jau yra',
    'validation-duplicate-user-name': 'Vartotojas šiuo vardu jau yra',
    'validation-illegal-project-name': 'Projekto identifikatorius negali būti „global”, „admin”, „public” ar „srv”',
    'validation-invalid-timezone': 'Neteisinga laiko juosta',
    'validation-localhost-is-wrong': '"localhost" ira netinkamas',
    'validation-password-for-admin-only': 'Tik administratoriai gali prisijungti naudodami slaptažodį',
    'validation-required': 'Privalomas',
    'validation-used-by-trambar': 'Naudojamas Trambar',

    'website-summary-cancel': 'Atšaukti',
    'website-summary-domain-names': 'Domenų vardai',
    'website-summary-edit': 'Redaguoti svetainę',
    'website-summary-save': 'Išsaugoti svetainę',
    'website-summary-template': 'Šablonas',
    'website-summary-template-disabled': 'Išjungta',
    'website-summary-template-generic': 'Bendras šablonas',
    'website-summary-timezone': 'Laiko zona',
    'website-summary-title': 'Interneto svetainė',
    'website-summary-traffic-report-time': 'Eismo ataskaitos paskelbimo laikas',
    'website-summary-versions': 'Versijos',

    'welcome': 'Sveiki!',

    'wiki-list-cancel': 'Atšaukti',
    'wiki-list-column-last-modified': 'Pakeitimo data',
    'wiki-list-column-public': 'Viešas',
    'wiki-list-column-repo': 'Saugykla',
    'wiki-list-column-title': 'Pavadinimas',
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, 'šio puslapio', 'šių 2 puslapių');
        return `Ar tikrai norite panaikinti ${pages} žymėjimą?`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, 'šį puslapį', 'šiuos 2 puslapius');
        return `Ar tikrai norite ${pages} paviešinti?`;
    },
    'wiki-list-edit': 'Redaguoti puslapių sąrašą',
    'wiki-list-public-always': 'visada',
    'wiki-list-public-no': 'ne',
    'wiki-list-public-referenced': 'nurodytas',
    'wiki-list-save': 'Išsaugoti puslapių sąrašą',
    'wiki-list-title': 'GitLab wiki',

    'wiki-summary-$title': (title) => {
        let text = 'GitLab wiki';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': 'Atšaukti',
    'wiki-summary-confirm-deselect': 'Ar tikrai norite panaikinti šio puslapio žymėjimą?',
    'wiki-summary-confirm-select': 'Ar tikrai norite šį puslapį paviešinti?',
    'wiki-summary-deselect': 'Panaikinkti puslapio pasirinkimą',
    'wiki-summary-edit': 'Redaguoti puslapį',
    'wiki-summary-hidden': 'Paieška',
    'wiki-summary-hidden-false': 'Atsiranda paieškos rezultatuose',
    'wiki-summary-hidden-true': 'Paslėpta nuo paieškos',
    'wiki-summary-page-contents': 'Turinys',
    'wiki-summary-public': 'Viešas',
    'wiki-summary-public-always': 'Visada',
    'wiki-summary-public-no': 'Ne',
    'wiki-summary-public-referenced': 'Taip (nurodytas kitame viešame puslapyje)',
    'wiki-summary-repo': 'Saugyklos identifikatorius',
    'wiki-summary-return': 'Grįžti į puslapių sąrašą',
    'wiki-summary-save': 'Išsaugoti puslapį',
    'wiki-summary-select': 'Pasirinkite puslapį',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': 'Pavadinimas',
};

export {
    phrases,
};
