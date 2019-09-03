import 'moment/locale/pl';
import {
    cardinal,
    genderize,
} from 'common/locale/grammars/polish.mjs';

const phrases = {
    'action-badge-add': 'dodaj',
    'action-badge-approve': 'zatwierdź',
    'action-badge-archive': 'zarchiwizuj',
    'action-badge-disable': 'dezaktywuj',
    'action-badge-reactivate': 'reaktywuj',
    'action-badge-remove': 'usuń',
    'action-badge-restore': 'przywróć',

    'activity-chart-legend-branch': 'Nowe gałęzi',
    'activity-chart-legend-issue': 'Zgłoszenia błędu',
    'activity-chart-legend-member': 'Zmiany członkostwa',
    'activity-chart-legend-merge': 'Scalania zmian',
    'activity-chart-legend-merge-request': 'Prośby o połączenie zmian',
    'activity-chart-legend-milestone': 'Kamienie milowe',
    'activity-chart-legend-post': 'Posty',
    'activity-chart-legend-push': 'Wgrywania zmian',
    'activity-chart-legend-repo': 'Zmiany repozytorium',
    'activity-chart-legend-survey': 'Ankiety',
    'activity-chart-legend-tag': 'Tagi',
    'activity-chart-legend-task-list': 'Listy zadań',
    'activity-chart-legend-wiki': 'Edycje strony wiki',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, '1 wiadomość', '2 wiadomości', '5 wiadomości');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 gałąź', '2 gałęzi', '5 gałęzi');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 zgłoszenie blędu', '2 zgłoszenia blędu', '5 zgłoszeń blędu');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, '1 zmiana członkostwa', '2 zmiany członkostwa', '5 zmian członkostwa');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 scalnie zmian', '2 scalenia zmian', '5 scaleń zmian');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 prośba o połączenie', '2 prośby o połączenie', '5 próśb o połączenie');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 kamień milowy', '2 kamienie milowe', '5 kamieni milowych');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, '1 post', '2 posty', '5 postów');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, '1 wgrywanie zmian', '2 wgrywania zmian', '5 wgrywań zmian');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 zmiana repozytorium', '2 zmiany repozytorium', '5 zmian repozytorium');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 ankieta', '2 ankiety', '5 ankiet');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tag', '2 tagi', '5 tagów');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 lista zadań', '2 listy zadań', '5 list zadań');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 edycja strony wiki', '2 edycje strony wiki', '5 edycji strony wiki');
    },

    'app-name': 'Trambar',
    'app-title': 'Trambar - Konsola administracyjna',

    'confirmation-cancel': 'Anuluj',
    'confirmation-confirm': 'Potwierdź',
    'confirmation-data-loss': 'Czy na pewno chcesz porzucić wprowadzone zmiany?',

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

    'image-album-cancel': 'Anuluj',
    'image-album-done': 'Ukończ',
    'image-album-manage': 'Zarządzaj albumem',
    'image-album-remove': 'Usuń wybrane',
    'image-album-select': 'Użyj wybranego',
    'image-album-upload': 'Prześlij pliki',

    'image-cropping-cancel': 'Anuluj',
    'image-cropping-select': 'OK',

    'image-selector-choose-from-album': 'Wybierz z albumu',
    'image-selector-crop-image': 'Dostosuj rozmiar/pozycję',
    'image-selector-upload-file': 'Prześlij zdjęcie',

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
    'member-list-add': 'Dodaj nowego użytkownika',
    'member-list-approve-all': 'Zatwierdź wszystkie prośby',
    'member-list-cancel': 'Anuluj',
    'member-list-column-date-range': 'Aktywny okres',
    'member-list-column-email': 'E-mail',
    'member-list-column-last-modified': 'Zmodyfikowano',
    'member-list-column-last-month': 'Zeszłym miesiąc',
    'member-list-column-name': 'Imię i nazwisko',
    'member-list-column-roles': 'Role',
    'member-list-column-this-month': 'Bieżący miesiąc',
    'member-list-column-to-date': 'Do tej pory',
    'member-list-column-type': 'Typ',
    'member-list-edit': 'Zmodyfikuj listę członków',
    'member-list-reject-all': 'Odrzuć wszystkie prośby',
    'member-list-save': 'Zapisz listę członków',
    'member-list-status-non-member': 'Nie jest członkiem',
    'member-list-status-pending': 'Prośba oczekująca na rozpatrzenie',
    'member-list-title': 'Członkowie',

    'nav-member-new': 'Nowy członek',
    'nav-members': 'Członkowie',
    'nav-project-new': 'Nowy projekt',
    'nav-projects': 'Projekty',
    'nav-repositories': 'Repozytoria',
    'nav-role-new': 'Nowa rola',
    'nav-roles': 'Role',
    'nav-server-new': 'Nowy serwer',
    'nav-servers': 'Serwery',
    'nav-settings': 'Ustawienia',
    'nav-spreadsheets': 'Pliki Excel',
    'nav-user-new': 'Nowy użytkownik',
    'nav-users': 'Użytkownicy',
    'nav-website': 'Strona internetowa',
    'nav-wikis': 'Wiki GitLab',

    'project-list-add': 'Dodaj nowy projekt',
    'project-list-cancel': 'Anuluj',
    'project-list-column-date-range': 'Aktywny okres',
    'project-list-column-last-modified': 'Zmodyfikowano',
    'project-list-column-last-month': 'Zeszłym miesiąc',
    'project-list-column-repositories': 'Repozytoria',
    'project-list-column-this-month': 'Bieżący miesiąc',
    'project-list-column-title': 'Nazwa',
    'project-list-column-to-date': 'Do tej pory',
    'project-list-column-users': 'Użytkownicy',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'wybrany projekt', 'te 2 wybrane projekty', 'tych 5 wybranych projektów');
        return `Czy na pewno chcesz zarchiwizować ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'wybrany projekt', 'te 2 wybrane projekty', 'tych 5 wybranych projektów');
        return `Czy na pewno chcesz przywrócić ${projects}?`;
    },
    'project-list-edit': 'Zmodyfikuj listę projektów',
    'project-list-save': 'Zapisz listę projektów',
    'project-list-status-archived': 'Zarchiwizowany',
    'project-list-status-deleted': 'Usunięty',
    'project-list-title': 'Projekty',

    'project-summary-$title': (title) => {
        let text = 'Projekt';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': 'Kontrola dostępu',
    'project-summary-access-control-member-only': 'Tylko członkowie mogą zobaczyć zawartość projektu',
    'project-summary-access-control-non-member-comment': 'Osoby niebędące członkami mogą komentować',
    'project-summary-access-control-non-member-view': 'Osoby niebędące członkami mogą zobaczyć zawartość projektu',
    'project-summary-add': 'Dodaj nowy projekt',
    'project-summary-archive': 'Zarchiwizuj projekt',
    'project-summary-cancel': 'Anuluj',
    'project-summary-confirm-archive': 'Czy na pewno chcesz zarchiwizować ten projekt?',
    'project-summary-confirm-delete': 'Czy na pewno chcesz usunąć ten projekt?',
    'project-summary-confirm-restore': 'Czy na pewno chcesz przywrócić ten projekt?',
    'project-summary-delete': 'Usuń projekt',
    'project-summary-description': 'Opis',
    'project-summary-edit': 'Zmodyfikuj projekt',
    'project-summary-emblem': 'Emblemat',
    'project-summary-name': 'Identyfikator',
    'project-summary-new-members': 'Nowe członkowie',
    'project-summary-new-members-auto-accept-guest': 'Goście są akceptowani automatycznie',
    'project-summary-new-members-auto-accept-user': 'Zwykli użytkownicy są akceptowani automatycznie',
    'project-summary-new-members-join-guest': 'Goście mogą poprosić o dołączenie do projektu',
    'project-summary-new-members-join-user': 'Zwykli użytkownicy mogą poprosić o dołączenie do projektu',
    'project-summary-new-members-manual': 'Członkowie są dodawani ręcznie',
    'project-summary-other-actions': 'Inne operacje',
    'project-summary-restore': 'Przywróć projekt',
    'project-summary-return': 'Powrót do listy projektów',
    'project-summary-save': 'Zapisz projekt',
    'project-summary-statistics': 'Działania',
    'project-summary-title': 'Nazwa',

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, '1 inny', '2 inne', '5 innych');
    },

    'repo-list-cancel': 'Anuluj',
    'repo-list-column-date-range': 'Aktywny okres',
    'repo-list-column-issue-tracker': 'Issue-tracker',
    'repo-list-column-last-modified': 'Zmodyfikowano',
    'repo-list-column-last-month': 'Zeszłym miesiąc',
    'repo-list-column-server': 'Serwery',
    'repo-list-column-this-month': 'Bieżący miesiąc',
    'repo-list-column-title': 'Nazwa',
    'repo-list-column-to-date': 'Do tej pory',
    'repo-list-confirm-remove-$count': (count) => {
        let repos = cardinal(count, 'wybrane repozytorium', 'te 2 wybrane repozytoria', 'tych 5 wybranych repozytoriów');
        return `Czy na pewno chcesz odłączyć ${repos} od projektu?`;
    },
    'repo-list-edit': 'Zmodyfikuj listę repozytoriów',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Włączony',
    'repo-list-save': 'Zapisz listę repozytoriów',
    'repo-list-title': 'Repozytoria',

    'repo-summary-$title': (title) => {
        let text = `Repozytorium`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': 'Anuluj',
    'repo-summary-confirm-remove': 'Czy na pewno chcesz odłączyć to repozytorium od projektu?',
    'repo-summary-confirm-restore': 'Czy na pewno chcesz ponownie połączyć to repozytorium do projektu?',
    'repo-summary-edit': 'Zmodyfikuj repozytorium',
    'repo-summary-gitlab-name': 'Nazwa projektu GitLaba',
    'repo-summary-issue-tracker': 'Issue-tracker',
    'repo-summary-issue-tracker-disabled': 'Wyłączony',
    'repo-summary-issue-tracker-enabled': 'Włączony',
    'repo-summary-remove': 'Usuń repozytorium',
    'repo-summary-restore': 'Przywróć repozytorium',
    'repo-summary-return': 'Powrót do listy repozytoriów',
    'repo-summary-save': 'Zapisz repozytorium',
    'repo-summary-statistics': 'Działania',
    'repo-summary-title': 'Nazwa',

    'repository-tooltip-$count': (count) => {
        return cardinal(count, '1 repozytorium', '2 repozytoria', '5 repozytoriów');
    },

    'role-list-add': 'Dodaj nową rolę',
    'role-list-cancel': 'Anuluj',
    'role-list-column-last-modified': 'Zmodyfikowano',
    'role-list-column-title': 'Nazwa',
    'role-list-column-users': 'Użytkownicy',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'wybraną rolę', 'te 2 wybrane role', 'tych 5 wybranych ról');
        return `Czy na pewno chcesz dezaktywować ${roles}?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'wybraną rolę', 'te 2 wybrane role', 'tych 5 wybranych ról');
        return `Czy na pewno chcesz reaktywować ${roles}?`;
    },
    'role-list-edit': 'Zmodyfikuj listę ról',
    'role-list-save': 'Zapisz listę ról',
    'role-list-status-deleted': 'Usunięta',
    'role-list-status-disabled': 'Nieaktywna',
    'role-list-title': 'Role',

    'role-summary-$title': (title) => {
        let text = 'Rola';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': 'Dodaj nową rolę',
    'role-summary-cancel': 'Anuluj',
    'role-summary-confirm-delete': 'Czy na pewno chcesz usunąć tę rolę?',
    'role-summary-confirm-disable': 'Czy na pewno chcesz dezaktywować tę rolę?',
    'role-summary-confirm-reactivate': 'Czy na pewno chcesz reaktywować tę rolę?',
    'role-summary-delete': 'Usuń rolę',
    'role-summary-description': 'Opis',
    'role-summary-disable': 'Dezaktywuj rolę',
    'role-summary-edit': 'Zmodyfikuj rolę',
    'role-summary-name': 'Identyfikator',
    'role-summary-rating': 'Priorytet wiadomości',
    'role-summary-rating-high': 'Wysoki',
    'role-summary-rating-low': 'Niski',
    'role-summary-rating-normal': 'Normalny',
    'role-summary-rating-very-high': 'Bardzo wysoki',
    'role-summary-rating-very-low': 'Bardzo nisk',
    'role-summary-reactivate': 'Reaktywuj rolę',
    'role-summary-return': 'Powrót do listy ról',
    'role-summary-save': 'Zapisz rolę',
    'role-summary-title': 'Nazwa',
    'role-summary-users': 'Użytkownicy',

    'role-tooltip-$count-others': (count) => {
        return cardinal(count, '1 inna', '2 inne', '5 innych');
    },

    'server-list-add': 'Dodaj nowy server',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Uzyskany',
    'server-list-cancel': 'Anuluj',
    'server-list-column-api-access': 'Dostęp API',
    'server-list-column-last-modified': 'Zmodyfikowano',
    'server-list-column-oauth': 'Autoryzacja OAuth',
    'server-list-column-title': 'Nazwa',
    'server-list-column-type': 'Typ',
    'server-list-column-users': 'Użytkownicy',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'wybrany serwer', 'te 2 wybrane serwery', 'tych 5 wybranych serwerów');
        return `Czy na pewno chcesz wyłączyć ${servers}?`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'wybrany serwer', 'te 2 wybrane serwery', 'tych 5 wybranych serwerów');
        return `Czy na pewno chcesz reaktywować ${servers}?`;
    },
    'server-list-edit': 'Zmodyfikuj listę serwerów',
    'server-list-oauth-false': '',
    'server-list-oauth-true': 'Aktywny',
    'server-list-save': 'Zapisz listę serwerów',
    'server-list-status-deleted': 'Usunięty',
    'server-list-status-disabled': 'Wyłączony',
    'server-list-title': 'Serwery',

    'server-summary-acquire': 'Uzyskaj dostęp API',
    'server-summary-activities': 'Działania',
    'server-summary-add': 'Dodaj nowy serwer',
    'server-summary-api-access': 'Dostęp API',
    'server-summary-api-access-acquired': 'Dostęp administracyjny uzyskany',
    'server-summary-api-access-not-applicable': 'Nie dotyczy',
    'server-summary-api-access-pending': 'Czekając na działania użytkownika',
    'server-summary-cancel': 'Anuluj',
    'server-summary-confirm-delete': 'Czy na pewno chcesz usunąć ten serwer?',
    'server-summary-confirm-disable': 'Czy na pewno chcesz wyłączyć ten serwer?',
    'server-summary-confirm-reactivate': 'Czy na pewno chcesz reaktywować ten serwer?',
    'server-summary-delete': 'Usuń serwer',
    'server-summary-disable': 'Wyłącz serwer',
    'server-summary-edit': 'Zmodyfikuj serwer',
    'server-summary-gitlab-admin': 'Administrator GitLaba',
    'server-summary-gitlab-external-user': 'Zewnętrzny użytkownik GitLaba',
    'server-summary-gitlab-regular-user': 'Zwykły użytkownik GitLaba',
    'server-summary-member-$name': (name) => {
        return `Serwer: ${name}`;
    },
    'server-summary-name': 'Identyfikator',
    'server-summary-new-user': 'Nowy użytkownik',
    'server-summary-new-users': 'Nowi użytkownicy',
    'server-summary-oauth-app-id': 'Identyfikator aplikacji',
    'server-summary-oauth-app-key': 'Klucz aplikacji',
    'server-summary-oauth-app-secret': 'Sekret aplikacji',
    'server-summary-oauth-application-id': 'Identyfikator aplikacji',
    'server-summary-oauth-application-secret': 'Sekret aplikacji',
    'server-summary-oauth-callback-url': 'Zwrotny URL OAuth',
    'server-summary-oauth-client-id': 'Identyfikator klienta',
    'server-summary-oauth-client-secret': 'Sekret klienta',
    'server-summary-oauth-deauthorize-callback-url': 'Zwrotny URL cofnięcia autoryzacji',
    'server-summary-oauth-gitlab-url': 'URL serwera GitLab',
    'server-summary-oauth-redirect-uri': 'Zwrotny URI',
    'server-summary-oauth-redirect-url': 'Zwrotny URL',
    'server-summary-oauth-site-url': 'URL witryny',
    'server-summary-privacy-policy-url': 'URL polityki prywatności',
    'server-summary-reactivate': 'Reaktywuj serwer',
    'server-summary-return': 'Powrót do listy serwerów',
    'server-summary-role-none': 'Nie przypisuj żadnych ról nowym użytkownikom',
    'server-summary-roles': 'Przypisanie ról',
    'server-summary-save': 'Zapisz serwer',
    'server-summary-system-address-missing': 'Adres systemowy nie został ustawiony',
    'server-summary-terms-and-conditions-url': 'URL regulamin',
    'server-summary-test-oauth': 'Przetestuj integrację OAuth',
    'server-summary-title': 'Nazwa',
    'server-summary-type': 'Typ serwera',
    'server-summary-user-automatic-approval': 'Zatwierdź nowych użytkowników automatyczne',
    'server-summary-user-import-disabled': 'Nie rejestruj nowych użytkowników',
    'server-summary-user-import-gitlab-admin-disabled': 'Nie importuj administratorów GitLaba',
    'server-summary-user-import-gitlab-external-user-disabled': 'Nie importuj zewnętrznych użytkowników GitLaba',
    'server-summary-user-import-gitlab-user-disabled': 'Nie importuj użytkowników GitLaba',
    'server-summary-user-type-admin': 'Administrator',
    'server-summary-user-type-guest': 'Gość',
    'server-summary-user-type-moderator': 'Moderator',
    'server-summary-user-type-regular': 'Zwykły użytkownik',
    'server-summary-whitelist': 'Biała lista adresów e-mail',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Zdjęcie w tle',
    'settings-cancel': 'Anuluj',
    'settings-company-name': 'Nazwa firmy',
    'settings-edit': 'Zmodyfikuj ustawienia',
    'settings-input-languages': 'Języki wprowadzania',
    'settings-push-relay': 'Przekaźnik notyfikacji push',
    'settings-save': 'Zapisz ustawienia',
    'settings-site-address': 'Adres internetowy',
    'settings-site-description': 'Opis',
    'settings-site-title': 'Nazwa witryny',
    'settings-title': 'Ustawienia',

    'sign-in-$title': (title) => {
        let text = `Zaloguj się`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': 'Wniosek o dostęp odrzucono',
    'sign-in-error-account-disabled': 'Konto jest obecnie wyłączone',
    'sign-in-error-existing-users-only': 'Tylko upoważniony personel może uzyskać dostęp do tego systemu',
    'sign-in-error-restricted-area': 'Użytkownik nie jest administratorem',
    'sign-in-oauth': 'Zaloguj się przez OAuth',
    'sign-in-password': 'Hasło:',
    'sign-in-problem-incorrect-username-password': 'Niepoprawna nazwa użytkownika lub hasło',
    'sign-in-problem-no-support-for-username-password': 'System nie akceptuje logowania za pomocą hasła',
    'sign-in-problem-unexpected-error': 'Nieoczekiwany błąd',
    'sign-in-submit': 'Zaloguj się',
    'sign-in-username': 'Nazwa użytkownika:',

    'sign-off-menu-sign-off': 'Wyloguj się',

    'spreadsheet-list-add': 'Dodaj nowy link',
    'spreadsheet-list-cancel': 'Anuluj',
    'spreadsheet-list-column-filename': 'Nazwa pliku',
    'spreadsheet-list-column-last-modified': 'Zmodyfikowano',
    'spreadsheet-list-column-sheets': 'Arkuszy',
    'spreadsheet-list-column-url': 'URL',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, 'ten link', 'te 2 linki', 'tych 5 linków');
        return `Czy na pewno chcesz wyłączyć ${spreadsheets}?`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, 'ten link', 'te 2 linki', 'tych 5 linków');
        return `Czy na pewno chcesz ponownie aktywować ${spreadsheets}?`;
    },
    'spreadsheet-list-edit': 'Edytuj listę linków',
    'spreadsheet-list-save': 'Zapisz listę linków',
    'spreadsheet-list-status-deleted': 'Usunięty',
    'spreadsheet-list-status-disabled': 'Wyłączony',
    'spreadsheet-list-title': 'Pliki Excel',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Plik Excel';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': 'Dodaj nowy link',
    'spreadsheet-summary-cancel': 'Anuluj',
    'spreadsheet-summary-confirm-delete': 'Czy na pewno chcesz usunąć ten link?',
    'spreadsheet-summary-confirm-disable': 'Czy na pewno chcesz wyłączyć ten link?',
    'spreadsheet-summary-confirm-reactivate': 'Czy na pewno chcesz ponownie aktywować ten link?',
    'spreadsheet-summary-delete': 'Usuń link',
    'spreadsheet-summary-description': 'Opis',
    'spreadsheet-summary-disable': 'Wyłącz link',
    'spreadsheet-summary-edit': 'Edytuj link',
    'spreadsheet-summary-filename': 'Nazwa pliku',
    'spreadsheet-summary-name': 'Identyfikator',
    'spreadsheet-summary-reactivate': 'Ponownie aktywuj link',
    'spreadsheet-summary-return': 'Wróć do listy linków',
    'spreadsheet-summary-save': 'Zapisz link',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Arkusz ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': 'Tytul',
    'spreadsheet-summary-url': 'URL',

    'task-$seconds': (seconds) => {
        return cardinal(seconds, '1 sekunda', '2 sekundy', '5 sekund');
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentarz rewizji', '2 komentarzy rewizji', '5 komentarzy rewizji');
        return `Zaimportowano ${comments} z projektu „${repo}”`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, '1 wydarzenie', '2 wydarzenia', '5 wydarzeń');
        return `Zaimportowano ${events} z projektu „${repo}”`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentarz zgłoszenia błędu', '2 komentarzy zgłoszenia błędu', '5 komentarzy zgłoszenia błędu');
        return `Zaimportowano ${comments} z projektu „${repo}”`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentarz prośby o połączenie', '2 komentarzy prośby o połączenie', '5 komentarzy prośby o połączenie');
        return `Zaimportowano ${comments} z „${repo}”`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozytorium', '2 repozytoria', '5 repozytoriów');
        return `Zaimportowano ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, '1 użytkownika', '2 użytkowników');
        return `Zaimportowano ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, '1 rewizją', '2 rewizjami', '5 rewizjami');
        return `Zaimportowano wgrywanie z ${commits} do gałęzi „${branch}” projektu „${repo}”`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Importowanie komentarzy rewizji projektu „${repo}”`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Importowanie wydarzeń z projektu „${repo}”`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Importowanie komentarzy zgłowszenia błędu z projektu „${repo}”`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Importowanie komentarzy prośby o połączenie z projektu „${repo}”`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Importowanie wgrywań zmian z projektu „${repo}”`;
    },
    'task-importing-repos': 'Importowanie repozytoriów',
    'task-importing-users': 'Importowanie użytkowników',
    'task-installed-$count-hooks': (count) => {
        let hooks = cardinal(count, '1 hak', '2 haki', '5 haków');
        return `Zainstalowano ${hooks}`;
    },
    'task-installing-hooks': 'Instalowanie haków',
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, '1 hak', '2 haki', '5 haków');
        return `Odinstalowano ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozytorium', '2 repozytoria', '5 repozytoriów');
        return `Usunięto ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, '1 użytkownik', '2 użytkowników');
        return `Usunięto ${users}`;
    },
    'task-removing-hooks': 'Odinstalowanie haków',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozytorium', '2 repozytoria', '5 repozytoriów');
        return `Zaktualizowano ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, '1 użytkownik', '2 użytkowników');
        return `Zaktualizowano ${users}`;
    },

    'text-field-placeholder-none': 'brak',

    'tz-name-abidjan': 'Abidżan',
    'tz-name-accra': 'Akra',
    'tz-name-acre': 'Acre',
    'tz-name-act': 'Terytorium Stolicy Australii',
    'tz-name-adak': 'Adak',
    'tz-name-addis-ababa': 'Addis Abeba',
    'tz-name-adelaide': 'Adelaida',
    'tz-name-aden': 'Aden',
    'tz-name-africa': 'Afryka',
    'tz-name-alaska': 'Alaska',
    'tz-name-aleutian': 'Wyspy Aleuckie',
    'tz-name-algiers': 'Algier',
    'tz-name-almaty': 'Almaty',
    'tz-name-america': 'Ameryka',
    'tz-name-amman': 'Amman',
    'tz-name-amsterdam': 'Amsterdam',
    'tz-name-anadyr': 'Anadyr',
    'tz-name-anchorage': 'Anchorage',
    'tz-name-andorra': 'Andora',
    'tz-name-anguilla': 'Anguilla',
    'tz-name-antananarivo': 'Antananarywa',
    'tz-name-antarctica': 'Antarktyda',
    'tz-name-antigua': 'Antigua',
    'tz-name-apia': 'Apia',
    'tz-name-aqtau': 'Aqtau',
    'tz-name-aqtobe': 'Aqtobe',
    'tz-name-araguaina': 'Araguaina',
    'tz-name-arctic': 'Arktyczny',
    'tz-name-argentina': 'Argentyna',
    'tz-name-arizona': 'Arizona',
    'tz-name-aruba': 'Aruba',
    'tz-name-ashgabat': 'Aszchabad',
    'tz-name-ashkhabad': 'Ashkhabad',
    'tz-name-asia': 'Azja',
    'tz-name-asmara': 'Asmara',
    'tz-name-asmera': 'Asmera',
    'tz-name-astrakhan': 'Astrachań',
    'tz-name-asuncion': 'Asuncion',
    'tz-name-athens': 'Ateny',
    'tz-name-atikokan': 'Atikokan',
    'tz-name-atka': 'Atka',
    'tz-name-atlantic': 'Atlantycki',
    'tz-name-atyrau': 'Atyrau',
    'tz-name-auckland': 'Okland',
    'tz-name-australia': 'Australia',
    'tz-name-azores': 'Azory',
    'tz-name-baghdad': 'Bagdad',
    'tz-name-bahia': 'Bahia',
    'tz-name-bahia-banderas': 'Bahia Banderas',
    'tz-name-bahrain': 'Bahrajn',
    'tz-name-baja-norte': 'Baja Norte',
    'tz-name-baja-sur': 'Baja Sur',
    'tz-name-baku': 'Baku',
    'tz-name-bamako': 'Bamako',
    'tz-name-bangkok': 'Bangkok',
    'tz-name-bangui': 'Bangi',
    'tz-name-banjul': 'Bandżul',
    'tz-name-barbados': 'Barbados',
    'tz-name-barnaul': 'Barnaul',
    'tz-name-beirut': 'Bejrut',
    'tz-name-belem': 'Belem',
    'tz-name-belfast': 'Belfast',
    'tz-name-belgrade': 'Belgrad',
    'tz-name-belize': 'Belize',
    'tz-name-berlin': 'Berlin',
    'tz-name-bermuda': 'Bermudy',
    'tz-name-beulah': 'Beulah',
    'tz-name-bishkek': 'Biszkek',
    'tz-name-bissau': 'Bissau',
    'tz-name-blanc-sablon': 'Blanc-Sablon',
    'tz-name-blantyre': 'Blantyre',
    'tz-name-boa-vista': 'Boa Vista',
    'tz-name-bogota': 'Bogota',
    'tz-name-boise': 'Boise',
    'tz-name-bougainville': 'Bougainville',
    'tz-name-bratislava': 'Bratysława',
    'tz-name-brazil': 'Brazylia',
    'tz-name-brazzaville': 'Brazzaville',
    'tz-name-brisbane': 'Brisbane',
    'tz-name-broken-hill': 'Broken Hill',
    'tz-name-brunei': 'Brunei',
    'tz-name-brussels': 'Bruksela',
    'tz-name-bucharest': 'Bukareszt',
    'tz-name-budapest': 'Budapeszt',
    'tz-name-buenos-aires': 'Buenos Aires',
    'tz-name-bujumbura': 'Bujumbura',
    'tz-name-busingen': 'Busingen',
    'tz-name-cairo': 'Kair',
    'tz-name-calcutta': 'Kalkuta',
    'tz-name-cambridge-bay': 'Cambridge Bay',
    'tz-name-campo-grande': 'Campo Grande',
    'tz-name-canada': 'Kanada',
    'tz-name-canary': 'Wyspy Kanaryjskie',
    'tz-name-canberra': 'Canberra',
    'tz-name-cancun': 'Cancun',
    'tz-name-cape-verde': 'Wyspy Zielonego Przylądka',
    'tz-name-caracas': 'Carakas',
    'tz-name-casablanca': 'Casablanka',
    'tz-name-casey': 'Casey',
    'tz-name-catamarca': 'Catamarca',
    'tz-name-cayenne': 'Cayenne',
    'tz-name-cayman': 'Kajman',
    'tz-name-center': 'Środek',
    'tz-name-central': 'Centralny',
    'tz-name-ceuta': 'Ceuta',
    'tz-name-chagos': 'Chagos',
    'tz-name-chatham': 'Chatham',
    'tz-name-chicago': 'Chicago',
    'tz-name-chihuahua': 'Chihuahua',
    'tz-name-chile': 'Chile',
    'tz-name-chisinau': 'Kiszyniów',
    'tz-name-chita': 'Chita',
    'tz-name-choibalsan': 'Choibalsan',
    'tz-name-chongqing': 'Chongqing',
    'tz-name-christmas': 'Wyspa Bożego Narodzenia',
    'tz-name-chungking': 'Chongqing',
    'tz-name-chuuk': 'Chuuk',
    'tz-name-cocos': 'Wyspy Kokosowe',
    'tz-name-colombo': 'Colombo',
    'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
    'tz-name-comoro': 'Komoro',
    'tz-name-conakry': 'Konakri',
    'tz-name-continental': 'Kontynentalny',
    'tz-name-copenhagen': 'Kopenhaga',
    'tz-name-coral-harbour': 'Coral Harbour',
    'tz-name-cordoba': 'Kordoba',
    'tz-name-costa-rica': 'Kostaryka',
    'tz-name-creston': 'Creston',
    'tz-name-cuiaba': 'Cuiaba',
    'tz-name-curacao': 'Curacao',
    'tz-name-currie': 'Currie',
    'tz-name-dacca': 'Dhaka',
    'tz-name-dakar': 'Dakar',
    'tz-name-damascus': 'Damaszek',
    'tz-name-danmarkshavn': 'Danmarkshavn',
    'tz-name-dar-es-salaam': 'Dar es Salaam',
    'tz-name-darwin': 'Darwin',
    'tz-name-davis': 'Davis',
    'tz-name-dawson': 'Dawson',
    'tz-name-dawson-creek': 'Dawson Creek',
    'tz-name-de-noronha': 'De Noronha',
    'tz-name-denver': 'Denver',
    'tz-name-detroit': 'Detroit',
    'tz-name-dhaka': 'Dhaka',
    'tz-name-dili': 'Dili',
    'tz-name-djibouti': 'Dżibuti',
    'tz-name-dominica': 'Dominika',
    'tz-name-douala': 'Douala',
    'tz-name-dubai': 'Dubai',
    'tz-name-dublin': 'Dublin',
    'tz-name-dumont-d-urville': 'Dumont d’Urville',
    'tz-name-dushanbe': 'Duszanbe',
    'tz-name-east': 'Wschód',
    'tz-name-east-indiana': 'Indiana (wschodnia)',
    'tz-name-easter': 'Wyspa Wielkanocna',
    'tz-name-easter-island': 'Wyspa Wielkanocna',
    'tz-name-eastern': 'Wschodni',
    'tz-name-edmonton': 'Edmonton',
    'tz-name-efate': 'Efate',
    'tz-name-eirunepe': 'Eirunepe',
    'tz-name-el-aaiun': 'El Aaiun',
    'tz-name-el-salvador': 'Salwador',
    'tz-name-enderbury': 'Enderbury',
    'tz-name-ensenada': 'Ensenada',
    'tz-name-eucla': 'Eucla',
    'tz-name-europe': 'Europa',
    'tz-name-faeroe': 'Wyspy Owcze',
    'tz-name-fakaofo': 'Fakaofo',
    'tz-name-famagusta': 'Famagusta',
    'tz-name-faroe': 'Faroe',
    'tz-name-fiji': 'Fidżi',
    'tz-name-fort-nelson': 'Fort Nelson',
    'tz-name-fort-wayne': 'Fort Wayne',
    'tz-name-fortaleza': 'Fortaleza',
    'tz-name-freetown': 'Freetown',
    'tz-name-funafuti': 'Funafuti',
    'tz-name-gaborone': 'Gaborone',
    'tz-name-galapagos': 'Galapagos',
    'tz-name-gambier': 'Gambir',
    'tz-name-gaza': 'Gaza',
    'tz-name-general': 'Generał',
    'tz-name-gibraltar': 'Gibraltar',
    'tz-name-glace-bay': 'Glace Bay',
    'tz-name-godthab': 'Godthab',
    'tz-name-goose-bay': 'Goose Bay',
    'tz-name-grand-turk': 'Grand Turk',
    'tz-name-grenada': 'Grenada',
    'tz-name-guadalcanal': 'Guadalcanal',
    'tz-name-guadeloupe': 'Gwadelupa',
    'tz-name-guam': 'Guam',
    'tz-name-guatemala': 'Gwatemala',
    'tz-name-guayaquil': 'Guayaquil',
    'tz-name-guernsey': 'Guernsey',
    'tz-name-guyana': 'Gujana',
    'tz-name-halifax': 'Halifax',
    'tz-name-harare': 'Harare',
    'tz-name-harbin': 'Harbin',
    'tz-name-havana': 'Hawana',
    'tz-name-hawaii': 'Hawaje',
    'tz-name-hebron': 'Hebron',
    'tz-name-helsinki': 'Helsinki',
    'tz-name-hermosillo': 'Hermosillo',
    'tz-name-ho-chi-minh': 'Ho Chi Minh',
    'tz-name-hobart': 'Hobart',
    'tz-name-hong-kong': 'Hongkong',
    'tz-name-honolulu': 'Honolulu',
    'tz-name-hovd': 'Hovd',
    'tz-name-indian': 'Ocean Indyjski',
    'tz-name-indiana': 'Indiana',
    'tz-name-indiana-starke': 'Indiana-Starke',
    'tz-name-indianapolis': 'Indianapolis',
    'tz-name-inuvik': 'Inuvik',
    'tz-name-iqaluit': 'Iqaluit',
    'tz-name-irkutsk': 'Irkuck',
    'tz-name-isle-of-man': 'Wyspa Man',
    'tz-name-istanbul': 'Stambuł',
    'tz-name-jakarta': 'Djakarta',
    'tz-name-jamaica': 'Jamajka',
    'tz-name-jan-mayen': 'Jan Mayen',
    'tz-name-jayapura': 'Jayapura',
    'tz-name-jersey': 'Jersey',
    'tz-name-jerusalem': 'Jerozolima',
    'tz-name-johannesburg': 'Johannesburg',
    'tz-name-johnston': 'Johnston',
    'tz-name-juba': 'Juba',
    'tz-name-jujuy': 'Jujuy',
    'tz-name-juneau': 'Juneau',
    'tz-name-kabul': 'Kabul',
    'tz-name-kaliningrad': 'Kaliningrad',
    'tz-name-kamchatka': 'Kamczatka',
    'tz-name-kampala': 'Kampala',
    'tz-name-karachi': 'Karaczi',
    'tz-name-kashgar': 'Kashgar',
    'tz-name-kathmandu': 'Kathmandu',
    'tz-name-katmandu': 'Katmandu',
    'tz-name-kentucky': 'Kentucky',
    'tz-name-kerguelen': 'Kerguelen',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': 'Chartum',
    'tz-name-kiev': 'Kijów',
    'tz-name-kigali': 'Kigali',
    'tz-name-kinshasa': 'Kinszasa',
    'tz-name-kiritimati': 'Kiritimati',
    'tz-name-kirov': 'Kirov',
    'tz-name-knox': 'Knox',
    'tz-name-knox-in': 'Knox, Indiana',
    'tz-name-kolkata': 'Kalkuta',
    'tz-name-kosrae': 'Kosrae',
    'tz-name-kralendijk': 'Kralendijk',
    'tz-name-krasnoyarsk': 'Krasnojarsk',
    'tz-name-kuala-lumpur': 'Kuala Lumpur',
    'tz-name-kuching': 'Kuching',
    'tz-name-kuwait': 'Kuwejt',
    'tz-name-kwajalein': 'Kwajalein',
    'tz-name-la-paz': 'La Paz',
    'tz-name-la-rioja': 'La Rioja',
    'tz-name-lagos': 'Lagos',
    'tz-name-lhi': 'Lord Howe Island',
    'tz-name-libreville': 'Libreville',
    'tz-name-lima': 'Lima',
    'tz-name-lindeman': 'Lindeman',
    'tz-name-lisbon': 'Lizbona',
    'tz-name-ljubljana': 'Ljubljana',
    'tz-name-lome': 'Lome',
    'tz-name-london': 'Londyn',
    'tz-name-longyearbyen': 'Longyearbyen',
    'tz-name-lord-howe': 'Lord Howe',
    'tz-name-los-angeles': 'Los Angeles',
    'tz-name-louisville': 'Louisville',
    'tz-name-lower-princes': 'Lower Prince’s Quarter',
    'tz-name-luanda': 'Luanda',
    'tz-name-lubumbashi': 'Łubumbaszy',
    'tz-name-lusaka': 'Lusaka',
    'tz-name-luxembourg': 'Luksemburg',
    'tz-name-macao': 'Makao',
    'tz-name-macau': 'Macau',
    'tz-name-maceio': 'Maceió',
    'tz-name-macquarie': 'Macquarie',
    'tz-name-madeira': 'Madera',
    'tz-name-madrid': 'Madryt',
    'tz-name-magadan': 'Magadan',
    'tz-name-mahe': 'Mahe',
    'tz-name-majuro': 'Majuro',
    'tz-name-makassar': 'Makassar',
    'tz-name-malabo': 'Malabo',
    'tz-name-maldives': 'Malediwy',
    'tz-name-malta': 'Malta',
    'tz-name-managua': 'Managua',
    'tz-name-manaus': 'Manaus',
    'tz-name-manila': 'Manila',
    'tz-name-maputo': 'Maputo',
    'tz-name-marengo': 'Marengo',
    'tz-name-mariehamn': 'Mariehamn',
    'tz-name-marigot': 'Marigot',
    'tz-name-marquesas': 'Markizy',
    'tz-name-martinique': 'Martynika',
    'tz-name-maseru': 'Maseru',
    'tz-name-matamoros': 'Matamoros',
    'tz-name-mauritius': 'Mauritius',
    'tz-name-mawson': 'Mawson',
    'tz-name-mayotte': 'Majotta',
    'tz-name-mazatlan': 'Mazatlan',
    'tz-name-mbabane': 'Mbabane',
    'tz-name-mc-murdo': 'McMurdo',
    'tz-name-melbourne': 'Melbourne',
    'tz-name-mendoza': 'Mendoza',
    'tz-name-menominee': 'Menominee',
    'tz-name-merida': 'Merida',
    'tz-name-metlakatla': 'Metlakatla',
    'tz-name-mexico': 'Meksyk',
    'tz-name-mexico-city': 'Meksyk',
    'tz-name-michigan': 'Michigan',
    'tz-name-midway': 'Midway',
    'tz-name-minsk': 'Mińsk',
    'tz-name-miquelon': 'Miquelon',
    'tz-name-mogadishu': 'Mogadiszu',
    'tz-name-monaco': 'Monako',
    'tz-name-moncton': 'Moncton',
    'tz-name-monrovia': 'Monrovia',
    'tz-name-monterrey': 'Monterrey',
    'tz-name-montevideo': 'Montevideo',
    'tz-name-monticello': 'Monticello',
    'tz-name-montreal': 'Montreal',
    'tz-name-montserrat': 'Montserrat',
    'tz-name-moscow': 'Moskwa',
    'tz-name-mountain': 'Góra',
    'tz-name-muscat': 'Muskat',
    'tz-name-nairobi': 'Nairobi',
    'tz-name-nassau': 'Nassau',
    'tz-name-nauru': 'Nauru',
    'tz-name-ndjamena': 'Ndjamena',
    'tz-name-new-salem': 'Nowy Salem',
    'tz-name-new-york': 'Nowy Jork',
    'tz-name-newfoundland': 'Nowa Fundlandia',
    'tz-name-niamey': 'Niamey',
    'tz-name-nicosia': 'Nikozja',
    'tz-name-nipigon': 'Nipigon',
    'tz-name-niue': 'Niue',
    'tz-name-nome': 'Nome',
    'tz-name-norfolk': 'Norfolk',
    'tz-name-noronha': 'Noronha',
    'tz-name-north': 'Północ',
    'tz-name-north-dakota': 'Północna Dakota',
    'tz-name-nouakchott': 'Nawakszut',
    'tz-name-noumea': 'Numea',
    'tz-name-novokuznetsk': 'Nowokuźnieck',
    'tz-name-novosibirsk': 'Nowosybirsk',
    'tz-name-nsw': 'Nowa Południowa Walia',
    'tz-name-ojinaga': 'Ojinaga',
    'tz-name-omsk': 'Omsk',
    'tz-name-oral': 'Uralsk',
    'tz-name-oslo': 'Osło',
    'tz-name-ouagadougou': 'Wagadugu',
    'tz-name-pacific': 'Pacyfik',
    'tz-name-pacific-new': 'Pacyfik-Nowy',
    'tz-name-pago-pago': 'Pago Pago',
    'tz-name-palau': 'Palau',
    'tz-name-palmer': 'Palmer',
    'tz-name-panama': 'Panama',
    'tz-name-pangnirtung': 'Pangnirtung',
    'tz-name-paramaribo': 'Paramaribo',
    'tz-name-paris': 'Paryż',
    'tz-name-perth': 'Pert',
    'tz-name-petersburg': 'Petersburg',
    'tz-name-phnom-penh': 'Phnom Penh',
    'tz-name-phoenix': 'Phoenix',
    'tz-name-pitcairn': 'Pitcairn',
    'tz-name-podgorica': 'Podgorica',
    'tz-name-pohnpei': 'Pohnpei',
    'tz-name-ponape': 'Ponape',
    'tz-name-pontianak': 'Pontiniak',
    'tz-name-port-au-prince': 'Port-au-Prince',
    'tz-name-port-moresby': 'Port Moresby',
    'tz-name-port-of-spain': 'Port Hiszpanii',
    'tz-name-porto-acre': 'Porto Acre',
    'tz-name-porto-novo': 'Porto-Novo',
    'tz-name-porto-velho': 'Porto Velho',
    'tz-name-prague': 'Praga',
    'tz-name-puerto-rico': 'Portoryko',
    'tz-name-punta-arenas': 'Punta Arenas',
    'tz-name-pyongyang': 'Phenian',
    'tz-name-qatar': 'Katar',
    'tz-name-qostanay': 'Qostanay',
    'tz-name-queensland': 'Queensland',
    'tz-name-qyzylorda': 'Qyzylorda',
    'tz-name-rainy-river': 'Rainy River',
    'tz-name-rangoon': 'Rangun',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': 'Rarotonga',
    'tz-name-recife': 'Recife',
    'tz-name-regina': 'Regina',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': 'Reunion',
    'tz-name-reykjavik': 'Reykjavik',
    'tz-name-riga': 'Ryga',
    'tz-name-rio-branco': 'Rio Branco',
    'tz-name-rio-gallegos': 'Rio Gallegos',
    'tz-name-riyadh': 'Rijad',
    'tz-name-rome': 'Rzym',
    'tz-name-rosario': 'Rosario',
    'tz-name-rothera': 'Rothera',
    'tz-name-saigon': 'Sajgon',
    'tz-name-saipan': 'Saipan',
    'tz-name-sakhalin': 'Sachalin',
    'tz-name-salta': 'Salta',
    'tz-name-samara': 'Skrzydlak',
    'tz-name-samarkand': 'Samarkanda',
    'tz-name-samoa': 'Samoa',
    'tz-name-san-juan': 'San Juan',
    'tz-name-san-luis': 'San Luis',
    'tz-name-san-marino': 'San Marino',
    'tz-name-santa-isabel': 'Santa Isabel',
    'tz-name-santarem': 'Santarem',
    'tz-name-santiago': 'Santiago',
    'tz-name-santo-domingo': 'Santo Domingo',
    'tz-name-sao-paulo': 'San Paulo',
    'tz-name-sao-tome': 'Sao Tome',
    'tz-name-sarajevo': 'Sarajewo',
    'tz-name-saratov': 'Saratow',
    'tz-name-saskatchewan': 'Saskatchewan',
    'tz-name-scoresbysund': 'Scoresbysund',
    'tz-name-seoul': 'Seul',
    'tz-name-shanghai': 'Szanghaj',
    'tz-name-shiprock': 'Shiprock',
    'tz-name-simferopol': 'Symferopol',
    'tz-name-singapore': 'Singapur',
    'tz-name-sitka': 'Sitka',
    'tz-name-skopje': 'Skopje',
    'tz-name-sofia': 'Sofia',
    'tz-name-south': 'Południe',
    'tz-name-south-georgia': 'Georgia Południowa',
    'tz-name-south-pole': 'Biegun południowy',
    'tz-name-srednekolymsk': 'Srednekolymsk',
    'tz-name-st-barthelemy': 'St Barthelemy',
    'tz-name-st-helena': 'St Helena',
    'tz-name-st-johns': 'Świętego Jana',
    'tz-name-st-kitts': 'St Kitts',
    'tz-name-st-lucia': 'St Lucia',
    'tz-name-st-thomas': 'St Thomas',
    'tz-name-st-vincent': 'St Vincent',
    'tz-name-stanley': 'Stanley',
    'tz-name-stockholm': 'Sztokholm',
    'tz-name-swift-current': 'Swift Current',
    'tz-name-sydney': 'Sydnej',
    'tz-name-syowa': 'Syowa',
    'tz-name-tahiti': 'Tahiti',
    'tz-name-taipei': 'Tajpej',
    'tz-name-tallinn': 'Tallinn',
    'tz-name-tarawa': 'Tarawa',
    'tz-name-tashkent': 'Taszkent',
    'tz-name-tasmania': 'Tasmania',
    'tz-name-tbilisi': 'Tbilisi',
    'tz-name-tegucigalpa': 'Tegucigalpa',
    'tz-name-tehran': 'Teheran',
    'tz-name-tel-aviv': 'Tel Awiw',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': 'Thimbu',
    'tz-name-thimphu': 'Thimphu',
    'tz-name-thule': 'Thule',
    'tz-name-thunder-bay': 'Thunder Bay',
    'tz-name-tijuana': 'Tijuana',
    'tz-name-timbuktu': 'Timbuktu',
    'tz-name-tirane': 'Tirane',
    'tz-name-tiraspol': 'Tyraspol',
    'tz-name-tokyo': 'Tokio',
    'tz-name-tomsk': 'Tomsk',
    'tz-name-tongatapu': 'Tongatapu',
    'tz-name-toronto': 'Toronto',
    'tz-name-tortola': 'Tortola',
    'tz-name-tripoli': 'Trypolis',
    'tz-name-troll': 'Troll',
    'tz-name-truk': 'Truk',
    'tz-name-tucuman': 'Tucuman',
    'tz-name-tunis': 'Tunis',
    'tz-name-ujung-pandang': 'Ujung Pandang',
    'tz-name-ulaanbaatar': 'Ułan Bator',
    'tz-name-ulan-bator': 'Ułan Bator',
    'tz-name-ulyanovsk': 'Uljanowsk',
    'tz-name-urumqi': 'Urumczi',
    'tz-name-us': 'Stany Zjednoczone',
    'tz-name-ushuaia': 'Ushuaia',
    'tz-name-ust-nera': 'Ust-Nera',
    'tz-name-uzhgorod': 'Użhorod',
    'tz-name-vaduz': 'Vaduz',
    'tz-name-vancouver': 'Vancouver',
    'tz-name-vatican': 'Watykan',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': 'Wiktoria',
    'tz-name-vienna': 'Wiedeń',
    'tz-name-vientiane': 'Wientian',
    'tz-name-vilnius': 'Wilno',
    'tz-name-vincennes': 'Vincennes',
    'tz-name-virgin': 'Wyspy Dziewicze',
    'tz-name-vladivostok': 'Władywostok',
    'tz-name-volgograd': 'Wołgograd',
    'tz-name-vostok': 'Wostok',
    'tz-name-wake': 'Wyspa Wake',
    'tz-name-wallis': 'Wallis',
    'tz-name-warsaw': 'Warszawa',
    'tz-name-west': 'Zachód',
    'tz-name-whitehorse': 'Whitehorse',
    'tz-name-winamac': 'Winamac',
    'tz-name-windhoek': 'Windhoek',
    'tz-name-winnipeg': 'Winnipeg',
    'tz-name-yakutat': 'Yakutat',
    'tz-name-yakutsk': 'Jakuck',
    'tz-name-yancowinna': 'Yancowinna',
    'tz-name-yangon': 'Yangon',
    'tz-name-yap': 'Yap',
    'tz-name-yekaterinburg': 'Jekaterynburg',
    'tz-name-yellowknife': 'Yellowknife',
    'tz-name-yerevan': 'Erewan',
    'tz-name-yukon': 'Yukon',
    'tz-name-zagreb': 'Zagrzeb',
    'tz-name-zaporozhye': 'Zaporoże',
    'tz-name-zurich': 'Zurych',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' i ', tooltip ];
    },
    'tooltip-more': 'Więcej',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 płiku', '2 płików');
        return `Przesyłanie ${files}, pozostało ${size}`;
    },

    'user-list-add': 'Dodaj nowego użytkownika',
    'user-list-approve-all': 'Zatwierdź wszystkie prośby',
    'user-list-cancel': 'Anuluj',
    'user-list-column-email': 'E-mail',
    'user-list-column-last-modified': 'Zmodyfikowano',
    'user-list-column-name': 'Imię i nazwisko',
    'user-list-column-projects': 'Projekty',
    'user-list-column-roles': 'Role',
    'user-list-column-type': 'Typ',
    'user-list-column-username': 'Nazwa użytkownika',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'wybrane konto', 'te 2 wybrane konta', 'tych 5 wybranych kont');
        return `Czy na pewno chcesz wyłączyć ${accounts}?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'wybrane konto', 'te 2 wybrane konta', 'tych 5 wybranych kont');
        return `Czy jesteś pewien, że chcesz reaktywować ${accounts}?`;
    },
    'user-list-edit': 'Zmodyfikuj listę użytkowników',
    'user-list-reject-all': 'Odrzuć wszystkie prośby',
    'user-list-save': 'Zapisz listę użytkowników',
    'user-list-status-deleted': 'Usunięty',
    'user-list-status-disabled': 'Konto Wyłączone',
    'user-list-status-pending': ' Czekając na zatwierdzenie',
    'user-list-title': 'Użytkownicy',
    'user-list-type-admin': 'Administrator',
    'user-list-type-guest': 'Gość',
    'user-list-type-moderator': 'Moderator',
    'user-list-type-regular': 'Zwykły użytkownik',
    'user-summary-$name': (name) => {
        let text = 'Użytkownik';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': 'Dodaj nowego użytkownika',
    'user-summary-cancel': 'Anuluj',
    'user-summary-confirm-delete': 'Czy na pewno chcesz usunąć to konto?',
    'user-summary-confirm-disable': 'Czy na pewno chcesz wyłączyć to konto?',
    'user-summary-confirm-reactivate': 'Czy na pewno chcesz reaktywować to konto?',
    'user-summary-delete': 'Usuń konto użytkownika',
    'user-summary-disable': 'Wyłącz konto użytkownika',
    'user-summary-edit': 'Zmodyfikuj użytkownika',
    'user-summary-email': 'E-mail',
    'user-summary-github': 'URL profilu na GitHubie',
    'user-summary-gitlab': 'URL profilu na GitLabie',
    'user-summary-ichat': 'Nazwa użytkownika iChat',
    'user-summary-linkedin': 'URL profilu na LinkedInie',
    'user-summary-member-$name': (name) => {
        let text = 'Członek';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': 'Zmodyfikuj członka',
    'user-summary-member-return': 'Powrót do listy członków',
    'user-summary-member-save': 'Zapisz członka',
    'user-summary-name': 'Imię i nazwisko',
    'user-summary-phone': 'Numer telefonu',
    'user-summary-profile-image': 'Zdjęcie profilowe',
    'user-summary-reactivate': 'Reaktywuj konto użytkownika',
    'user-summary-remove-membership': 'Usuń użytkownika z projektu',
    'user-summary-restore-membership': 'Dodaj użytkownika do projektu',
    'user-summary-return': 'Powrót do listy użytkowników',
    'user-summary-role-none': 'Żadna',
    'user-summary-roles': 'Role',
    'user-summary-save': 'Zapisz użytkownika',
    'user-summary-skype': 'Nazwa użytkownika Skype',
    'user-summary-slack': 'Identyfikator użytkownika Slack',
    'user-summary-slack-team': 'Identyfikator zespółu Slack',
    'user-summary-social-links': 'Linki społecznościowe',
    'user-summary-stackoverflow': 'URL profilu na StackOverflowie',
    'user-summary-statistics': 'Działania',
    'user-summary-twitter': 'Nazwa użytkownika na Twitterze',
    'user-summary-type': 'Typ użytkownika',
    'user-summary-type-admin': 'Administrator',
    'user-summary-type-guest': 'Gość',
    'user-summary-type-moderator': 'Moderator',
    'user-summary-type-regular': 'Zwykły użytkownik',
    'user-summary-username': 'Nazwa użytkownika',

    'user-tooltip-$count': (count) => {
        return cardinal(count, '1 użytkownik', '2 użytkownicy', '5 użytkowników');
    },

    'validation-duplicate-project-name': 'Projekt z tym identyfikatorem już istnieje',
    'validation-duplicate-role-name': 'Rola z tym identyfikatorem już istnieje',
    'validation-duplicate-server-name': 'Serwer z tym identyfikatorem już istnieje',
    'validation-duplicate-user-name': 'Użytkownik o tej nazwie już istnieje',
    'validation-illegal-project-name': 'Identyfikator projektu nie może być „global”, „admin”, „public” ani „srv”',
    'validation-localhost-is-wrong': '"localhost" jest nieprawidłowy',
    'validation-password-for-admin-only': 'Tylko administratorzy mogą logować się przy użyciu hasła',
    'validation-required': 'Wymagany',

    'website-summary-cancel': 'Anuluj',
    'website-summary-domain-names': 'Nazwy domen',
    'website-summary-edit': 'Edytuj stronę',
    'website-summary-save': 'Zapisz stronę',
    'website-summary-template': 'Szablon',
    'website-summary-template-disabled': 'Disabled',
    'website-summary-template-generic': 'Ogólny szablon',
    'website-summary-title': 'Strona internetowa',

    'welcome': 'Witamy!',

    'wiki-list-cancel': 'Anuluj',
    'wiki-list-column-last-modified': 'Zmodyfikowano',
    'wiki-list-column-public': 'Publiczna',
    'wiki-list-column-repo': 'Repozytorium',
    'wiki-list-column-title': 'Tytuł',
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, 'tę stronę', 'te 2 strony', 'tych 5 stron');
        return `Czy na pewno chcesz upublicznić ${pages}?`;
    },
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, 'tę stronę', 'te 2 strony', 'tych 5 stron');
        return `Czy na pewno chcesz odznaczyć ${pages}?`;
    },
    'wiki-list-edit': 'Edytuj listę stron',
    'wiki-list-public-always': 'zawsze',
    'wiki-list-public-no': 'nie',
    'wiki-list-public-referenced': 'powiązana',
    'wiki-list-save': 'Zapisz listę stron',
    'wiki-list-title': 'Wiki GitLab',

    'wiki-summary-$title': (title) => {
        let text = 'Wiki GitLab';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': 'Anuluj',
    'wiki-summary-confirm-select': 'Czy na pewno chcesz upublicznić tę stronę?',
    'wiki-summary-confirm-deselect': 'Czy na pewno chcesz odznaczyć tę stronę?',
    'wiki-summary-edit': 'Edytuj stronę',
    'wiki-summary-page-contents': 'Treść',
    'wiki-summary-public': 'Publiczna',
    'wiki-summary-public-always': 'Zawsze',
    'wiki-summary-public-no': 'Nie',
    'wiki-summary-public-referenced': 'Tak (powiązana przez inną stroną publiczną)',
    'wiki-summary-repo': 'Identyfikator repozytorium',
    'wiki-summary-return': 'Wróć do listy stron',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': 'Tytuł',
};

export {
    phrases,
    genderize,
};
