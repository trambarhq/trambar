import 'moment/locale/lt';
import {
    cardinal,
} from 'locale/grammars/lithuanian';

const phrases = {
    'action-badge-add': 'pridėti',
    'action-badge-approve': 'patvirtinti',
    'action-badge-archive': 'archyvuoti',
    'action-badge-disable': 'deaktyvuoti',
    'action-badge-reactivate': 'reaktyvuoti',
    'action-badge-remove': 'pašalinti',
    'action-badge-restore': 'atkurti',

    'activity-chart-legend-branch': 'Naujos šakos',
    'activity-chart-legend-issue': 'Klaidos ataskaitos',
    'activity-chart-legend-member': 'Narystės pakeitimai',
    'activity-chart-legend-merge': 'Pakeitimų sujungimai',
    'activity-chart-legend-merge-request': 'Prašymai sujungti',
    'activity-chart-legend-milestone': 'Etapai',
    'activity-chart-legend-post': 'Įrašai',
    'activity-chart-legend-push': 'Pakeitimų siuntimai',
    'activity-chart-legend-repo': 'Saugyklos pakeitimai',
    'activity-chart-legend-survey': 'Anketos',
    'activity-chart-legend-tag': 'Naujos žymos',
    'activity-chart-legend-task-list': 'Užduočių sąrašai',
    'activity-chart-legend-wiki': 'Wiki redagavimai',

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
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 anketos', '10 anketų');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 žyma', '2 žymos', '10 žymų');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 užduočių sąrašas', '2 užduočių sąrašai', '10 užduočių sąrašų');
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
    'nav-role-new': 'Naujas vaidmuo',
    'nav-roles': 'Vaidmenys',
    'nav-server-new': 'Naujas serveris',
    'nav-servers': 'Serveriai',
    'nav-settings': 'Nustatymai',
    'nav-user-new': 'Naujas vartotojas',
    'nav-users': 'Vartotojai',

    'project-list-add': 'Pridėti naują projektą',
    'project-list-cancel': 'Atšaukti',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'pasirinktą projektą', 'šiuos 2 pasirinktus projektus', 'šiuos 10 pasirinktų projektų');
        return `Ar tikrai norite archyvuoti ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'pasirinktą projektą', 'šiuos 2 pasirinktus projektus', 'šiuos 10 pasirinktų projektų');
        return `Ar tikrai norite atkurti ${projects}?`;
    },
    'project-list-deleted': 'Ištrintas',
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

    'role-list-add': 'Pridėti naują vaidmenį',
    'role-list-cancel': 'Atšaukti',
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
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'pasirinktą serverį', 'šiuos 2 pasirinktus serverius', 'šiuos 10 pasirinktų serverių');
        return `Ar tikrai norite deaktyvuoti ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'pasirinktą serverį', 'šiuos 2 pasirinktus serverius', 'šiuos 10 pasirinktų serverių');
        return `Ar tikrai norite reaktyvuoti ${servers}?`
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

    'table-heading-api-access': 'API prieiga',
    'table-heading-date-range': 'Aktyvus laikotarpis',
    'table-heading-email': 'E-paštas',
    'table-heading-issue-tracker': 'Klaidų sekimas',
    'table-heading-last-modified': 'Pakeitimo data',
    'table-heading-last-month': 'Praėjusį mėnesį',
    'table-heading-name': 'Vardas ir pavardė',
    'table-heading-oauth': 'OAuth leidimas',
    'table-heading-projects': 'Projektai',
    'table-heading-repositories': 'Saugyklos',
    'table-heading-roles': 'Vaidmenys',
    'table-heading-server': 'Serveriai',
    'table-heading-this-month': 'Šį mėnesį',
    'table-heading-title': 'Pavadinimas',
    'table-heading-to-date': 'Iki šiol',
    'table-heading-type': 'Tipas',
    'table-heading-username': 'Vartotojo vardas',
    'table-heading-users': 'Vartotojai',

    'task-$seconds': (seconds) => {
        return cardinal(count, '1 sekundė', '2 sekundės', '10 sekundžių');
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

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 failą', '2 failus', '10 failų');
        return `Siuntimas ${files}, likę ${size}`;
    },

    'user-list-add': 'Pridėti naują vartotoją',
    'user-list-approve-all': 'Patvirtinti visus prašymus',
    'user-list-cancel': 'Atšaukti',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'pasirinktą paskyrą', 'šias 2 pasirinktas paskyras', 'šias 10 pasirinktų paskyrų');
        return `Ar tikrai norite deaktyvuoti ${accouns}?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'pasirinktą paskyrą', 'šias 2 pasirinktas paskyras', 'šias 10 pasirinktų paskyrų');
        return `Ar tikrai norite reaktyvuoti ${acounts}?`;
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
    'validation-duplicate-user-name': 'Vartotojas šiuo vardu jau yra',
    'validation-illegal-project-name': 'Projekto identifikatorius negali būti „global”, „admin”, „public” ar „srv”',
    'validation-localhost-is-wrong': '"localhost" ira netinkamas',
    'validation-password-for-admin-only': 'Tik administratoriai gali prisijungti naudodami slaptažodį',
    'validation-required': 'Privalomas',

    'welcome': 'Sveiki!',
};

export {
    phrases,
};
