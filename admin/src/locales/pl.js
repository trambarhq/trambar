module.exports = function(languageCode) {
    return {
        'activity-chart-legend-push': 'Wysłania zmian',
        'activity-chart-legend-issue': 'Zgłoszenia problemu',
        'activity-chart-legend-member': 'Zmiany członkostwa',
        'activity-chart-legend-milestone': 'Kamienia milowe',
        'activity-chart-legend-repo': 'Zmiany katalogu',
        'activity-chart-legend-story': 'komunikaty',
        'activity-chart-legend-survey': 'Ankiety',
        'activity-chart-legend-task-list': 'Listy zadań',
        'activity-chart-legend-wiki': 'Zmiany Wiki',

        'app-name': 'Trambar',
        'app-title': 'Trambar - Konsola administracyjna',

        'confirmation-cancel': 'Anuluj',
        'confirmation-confirm': 'Przyjmij',
        'confirmation-data-loss': 'Czy na pewno chcesz wyrzucić zmiany?',

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
        'member-list-cancel': 'Anuluj',
        'member-list-edit': 'Zmień listę członków',
        'member-list-new': 'Nowy członek',
        'member-list-save': 'Zapisz listę członków',
        'member-list-title': 'Członkowie',

        'nav-member-new': 'Nowy członek',
        'nav-members': 'Członkowie',
        'nav-projects': 'Projekty',
        'nav-project-new': 'Nowy projekt',
        'nav-repositories': 'Katalogi',
        'nav-roles': 'Role',
        'nav-role-new': 'Nowa rola',
        'nav-servers': 'Serwery',
        'nav-server-new': 'Nowy serwer',
        'nav-settings': 'Ustawienia',
        'nav-users': 'Użytkownicy',
        'nav-user-new': 'Nowy użytkownik',

        'project-list-$title-with-$name': (title, name) => {
            if (title) {
                return `${title} (${name})`;
            } else {
                return name;
            }
        },
        'project-list-new': 'Nowy projekt',
        'project-list-title': 'Projekty',

        'project-tooltip-$count-others': (count) => {
            if (singular(count)) {
                return `1 inny`;
            } else {
                return `${count} innych`;
            }
        },

        'repo-list-cancel': 'Anuluj',
        'repo-list-edit': 'Zmień listę katalogów',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Włączony',
        'repo-list-save': 'Zapisz listę katalogów',
        'repo-list-title': 'Katalogi',

        'role-list-new': 'Nowa rola',
        'role-list-title': 'Role',

        'role-summary-$title': (title) => {
            var text = 'Rola';
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'role-summary-cancel': 'Anuluj',
        'role-summary-description': 'Opis',
        'role-summary-edit': 'Zmień rolę',
        'role-summary-name': 'URL Slug',
        'role-summary-save': 'Zapisz rolę',
        'role-summary-title': 'Nazwa',

        'role-tooltip-$count-others': (count) => {
            if (singular(count)) {
                return `1 inny`;
            } else {
                return `${count} innych`
            }
        },

        'server-list-new': 'Nowy serwer',
        'server-list-title': 'Serwery',

        'server-summary-api-token': 'API token',
        'server-summary-api-url': 'API URL',
        'server-summary-cancel': 'Anuluj',
        'server-summary-edit': 'Edytuj serwer',
        'server-summary-member-$name': (name) => {
            return `Server: ${name}`;
        },
        'server-summary-oauth-id': 'OAuth client ID',
        'server-summary-oauth-secret': 'OAuth client secret',
        'server-summary-oauth-url': 'OAuth URL',
        'server-summary-save': 'Zapisz serwer',
        'server-summary-title': 'Nazwa',
        'server-summary-type': 'Typ serwera',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-gitlab': 'GitLab',
        'server-type-github': 'GitHub',
        'server-type-google': 'Google',

        'settings-cancel': 'Anuluj',
        'settings-edit': 'Edytuj ustawienia',
        'settings-input-languages': 'Języki wpisywania',
        'settings-save': 'Zapisz ustawienia',
        'settings-site-title': 'Nazwa systemu',
        'settings-site-description': 'Opis',
        'settings-site-domain-name': 'Nazwa domeny',
        'settings-title': 'Ustawienia',

        'sign-in-password': 'Hasło:',
        'sign-in-submit': 'Zaloguj się',
        'sign-in-title': 'Logowanie',
        'sign-in-title-oauth': 'Zaloguj się przez OAuth',
        'sign-in-username': 'Nazwa użytkownika:',

        'table-heading-date-range': 'Okres aktywności',
        'table-heading-email': 'Adres mailowy',
        'table-heading-issue-tracker': 'Bugtracker',
        'table-heading-last-modified': 'Zmodyfikowany',
        'table-heading-last-month': 'W zeszłym miesiącu',
        'table-heading-name': 'Imię i nazwisko',
        'table-heading-projects': 'Projekty',
        'table-heading-repositories': 'Katalogi',
        'table-heading-roles': 'Role',
        'table-heading-server': 'Serwer',
        'table-heading-this-month': 'W tym miesiącu',
        'table-heading-title': 'Nazwa',
        'table-heading-to-date': 'Do tej pory',
        'table-heading-type': 'Typ',
        'table-heading-users': 'Użytkownicy',

        'text-field-placeholder-none': 'brak',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' i ', tooltip ];
        },
        'tooltip-more': 'Więcej',

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
        'user-list-approve': 'Zatwierdź użytkowników',
        'user-list-cancel': 'Anuluj',
        'user-list-new': 'Nowy użytkownik',
        'user-list-save': 'Zatwierdź wybranych',
        'user-list-title': 'Użytkownicy',
        'user-list-user-$type-$approved': (type, approved) => {
            var text;
            switch(type) {
                case 'guest':
                    text = 'Gość';
                    break;
                case 'member':
                    text = 'Członek zespołu';
                    break;
                case 'admin':
                    text = 'Administrator';
                    break;
            }
            if (!approved) {
                text += ' (niezatwierdzony)';
            }
            return text;
        },
    };
};

function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n < 10 || (n > 20 && n < 100)) {
        var ld = n % 10;
        if (ld === 2 || ld === 3 || ld === 4) {
            return true;
        }
    }
    return false;
}
