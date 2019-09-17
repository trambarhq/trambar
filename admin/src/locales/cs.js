import 'moment/locale/cs';
import {
    cardinal,
    genderize,
} from 'common/locale/grammars/czech.mjs';

const phrases = {
    'action-badge-add': 'přidat',
    'action-badge-approve': 'schválit',
    'action-badge-archive': 'archivovat',
    'action-badge-deselect': 'deselect',
    'action-badge-disable': 'odznačit',
    'action-badge-reactivate': 'reaktivovat',
    'action-badge-remove': 'odstranit',
    'action-badge-restore': 'obnovit',
    'action-badge-select': 'vybrat',

    'activity-chart-legend-branch': 'Nové větve',
    'activity-chart-legend-issue': 'Problémy',
    'activity-chart-legend-member': 'Změny členství',
    'activity-chart-legend-merge': 'Sloučení kódu',
    'activity-chart-legend-merge-request': 'Žádosti o sloučení',
    'activity-chart-legend-milestone': 'Milníky',
    'activity-chart-legend-post': 'Příspěvky',
    'activity-chart-legend-push': 'Přesuny',
    'activity-chart-legend-repo': 'Změny repozitářů',
    'activity-chart-legend-snapshot': 'Revize webových stránek',
    'activity-chart-legend-survey': 'Ankety',
    'activity-chart-legend-tag': 'Tagy',
    'activity-chart-legend-task-list': 'Seznamy úkolů',
    'activity-chart-legend-website-traffic': 'Dopravní zprávy',
    'activity-chart-legend-wiki': 'Úpravy wiki',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, '1 příběh', '2 příběhy', '5 příběhů');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 větev', '2 větve', '5 větví');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 problém', '2 problémy', '5 problémů');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, '1 změna členství', '2 změny členství', '5 změn členství');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 sloučení', '2 sloučení', '5 sloučeních');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 žádost o sloučení', '2 žádosti o sloučení', '5 žádostí o sloučení');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 milník', '2 milníky', '5 milníků');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, '1 příspěvek', '2 příspěvky', '5 příspěvků');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, '1 přesun', '2 přesuny', '5 přesunů');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 změna repozitáře', '2 změny repozitářů', '5 změn repozitářů');
    },
    'activity-tooltip-$count-snapshot': (count) => {
        return cardinal(count, '1 revize webové stránky', '2 revize webových stránek', '5 revizí webových stránek');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 anketa', '2 ankety', '5 anket');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 tag', '2 tagy', '5 tagů');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 seznam úkolů', '2 seznamy úkolů', '5 seznamů úkolů');
    },
    'activity-tooltip-$count-website-traffic': (count) => {
        return cardinal(count, '1 dopravní zpráva', '2 dopravní zprávy', '5 dopravních zpráv');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 úprava stránky wiki', '2 úpravy stránek wiki', '5 úprav stránek wiki');
    },

    'app-name': 'Trambar',
    'app-title': 'Trambar - Administrativní konzole',

    'confirmation-cancel': 'Zrušit',
    'confirmation-confirm': 'Potvrdit',
    'confirmation-data-loss': 'Opravdu chcete opustit změny, které jste provedli?',

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

    'image-album-cancel': 'Zrušit',
    'image-album-done': 'Hotovo',
    'image-album-manage': 'Spravovat album',
    'image-album-remove': 'Smazat vybrané',
    'image-album-select': 'Použít vybrané',
    'image-album-upload': 'Nahrát soubory',

    'image-cropping-cancel': 'Zrušit',
    'image-cropping-select': 'OK',

    'image-preview-close': 'Zavřít',
    'image-preview-dropbox': 'Dropbox',
    'image-preview-onedrive': 'OneDrive',

    'image-selector-choose-from-album': 'Vybrat si z alba',
    'image-selector-crop-image': 'Upravit velikost/polohu',
    'image-selector-upload-file': 'Nahrát obrázek',

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
    'member-list-add': 'Přidat nového uživatele',
    'member-list-approve-all': 'Schválit všechny požadavky',
    'member-list-cancel': 'Zrušit',
    'member-list-column-date-range': 'Aktivní období',
    'member-list-column-email': 'Emailová adresa',
    'member-list-column-last-modified': 'Změněno',
    'member-list-column-last-month': 'Minulý měsíc',
    'member-list-column-name': 'Jméno',
    'member-list-column-roles': 'Role',
    'member-list-column-this-month': 'Tento měsíc',
    'member-list-column-to-date': 'K datu',
    'member-list-column-type': 'Typ',
    'member-list-edit': 'Upravit seznam členů',
    'member-list-reject-all': 'Odmítnout všechny požadavky',
    'member-list-save': 'Uložit seznam členů',
    'member-list-status-non-member': 'Nebýt člen',
    'member-list-status-pending': 'Žádost čeká na vyřízení',
    'member-list-title': 'Členové',

    'nav-member-new': 'Nový člen',
    'nav-members': 'Členové',
    'nav-project-new': 'Nový projekt',
    'nav-projects': 'Projekty',
    'nav-repositories': 'Repozitáře',
    'nav-rest-sources': 'Zdroje REST',
    'nav-role-new': 'Nová role',
    'nav-roles': 'Role',
    'nav-server-new': 'Nový server',
    'nav-servers': 'Servery',
    'nav-settings': 'Nastavení',
    'nav-spreadsheets': 'Excel soubory',
    'nav-user-new': 'Nový uživatel',
    'nav-users': 'Uživatelé',
    'nav-website': 'Webová stránka',
    'nav-wiki': 'Wiki GitLab',

    'project-list-add': 'Přidat nový projekt',
    'project-list-cancel': 'Zrušit',
    'project-list-column-date-range': 'Aktivní období',
    'project-list-column-last-modified': 'Změněno',
    'project-list-column-last-month': 'Minulý měsíc',
    'project-list-column-repositories': 'Repozitáře',
    'project-list-column-this-month': 'Tento měsíc',
    'project-list-column-title': 'Název',
    'project-list-column-to-date': 'K datu',
    'project-list-column-users': 'Uživatelé',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'vybraný projekt', 'tyto 2 projekty', 'těchto 5 projektů');
        return `Opravdu chcete ${projects} archivovat?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'vybraný projekt', 'tyto 2 projekty', 'těchto 5 projektů');
        return `Opravdu chcete ${projects} obnovit?`;
    },
    'project-list-edit': 'Upravit seznam projektů',
    'project-list-save': 'Uložit seznam projektů',
    'project-list-status-archived': 'Archivovány',
    'project-list-status-deleted': 'Smazán',
    'project-list-title': 'Projekty',

    'project-summary-$title': (title) => {
        let text = 'Projekt';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': 'Řízení přístupu',
    'project-summary-access-control-member-only': 'Obsah projektu je omezen pouze na členy',
    'project-summary-access-control-non-member-comment': 'Nečlenové mohou komentovat příběhy',
    'project-summary-access-control-non-member-view': 'Nečlenové mohou zobrazit obsah',
    'project-summary-add': 'Přidat nový projekt',
    'project-summary-archive': 'Archivovat projekt',
    'project-summary-cancel': 'Zrušit',
    'project-summary-confirm-archive': 'Opravdu chcete tento projekt archivovat?',
    'project-summary-confirm-delete': 'Opravdu chcete tento projekt smazat?',
    'project-summary-confirm-restore': 'Opravdu chcete tento projekt obnovit?',
    'project-summary-delete': 'Smazat projekt',
    'project-summary-description': 'Popis',
    'project-summary-edit': 'Upravit projekt',
    'project-summary-emblem': 'Odznak',
    'project-summary-name': 'Identifikátor',
    'project-summary-new-members': 'Noví členové',
    'project-summary-new-members-auto-accept-guest': 'Hosté jsou přijímáni automaticky',
    'project-summary-new-members-auto-accept-user': 'Pravidelní uživatelé jsou přijímáni automaticky',
    'project-summary-new-members-join-guest': 'Hosté mohou požádat o připojení k projektu',
    'project-summary-new-members-join-user': 'Pravidelní uživatelé mohou požádat o připojení k projektu',
    'project-summary-new-members-manual': 'Členové se přidávají ručně',
    'project-summary-other-actions': 'Jiné akce',
    'project-summary-restore': 'Reaktivovat projekt',
    'project-summary-return': 'Návrat na seznam projektů',
    'project-summary-save': 'Uložit projekt',
    'project-summary-statistics': 'Aktivity',
    'project-summary-title': 'Název',

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, '1 další', '2 další', '5 dalších');
    },

    'repo-list-cancel': 'Zrušit',
    'repo-list-column-date-range': 'Aktivní období',
    'repo-list-column-issue-tracker': 'Bugtracker',
    'repo-list-column-last-modified': 'Změněno',
    'repo-list-column-last-month': 'Minulý měsíc',
    'repo-list-column-server': 'Server',
    'repo-list-column-this-month': 'Tento měsíc',
    'repo-list-column-title': 'Název',
    'repo-list-column-to-date': 'K datu',
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, 'tento repozitář', 'tyto 2 repozitáře', 'těchto 5 repozitářů');
        return `Opravdu chcete ${repositories} odstranit z projektu?`;
    },
    'repo-list-edit': 'Upravit seznam repozitářů',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Zapnutý',
    'repo-list-save': 'Uložit seznam repozitářů',
    'repo-list-title': 'Úložiště',

    'repo-summary-$title': (title) => {
        let text = `Úložiště`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': 'Zrušit',
    'repo-summary-confirm-remove': 'Opravdu chcete tento repozitář odstranit z projektu?',
    'repo-summary-confirm-restore': 'Opravdu chcete přidat tento repozitář do projektu znovu?',
    'repo-summary-edit': 'Upravit repozitář',
    'repo-summary-gitlab-name': 'Název projektu GitLab',
    'repo-summary-issue-tracker': 'Bugtracker',
    'repo-summary-issue-tracker-disabled': 'Vypnutý',
    'repo-summary-issue-tracker-enabled': 'Zapnutý',
    'repo-summary-remove': 'Odstranit repozitář',
    'repo-summary-restore': 'Reaktivovat repozitář',
    'repo-summary-return': 'Návrat na seznam repozitářů',
    'repo-summary-save': 'Uložit repozitář',
    'repo-summary-statistics': 'Aktivity',
    'repo-summary-title': 'Název',

    'repository-tooltip-$count': (count) => {
        return cardinal(count, '1 repozitář', '2 repozitáře', '5 repozitářů');
    },

    'rest-list-add': 'Přidat nový zdroj',
    'rest-list-cancel': 'Zrušit',
    'rest-list-column-identifier': 'Identifikátor',
    'rest-list-column-last-modified': 'Změněno',
    'rest-list-column-type': 'Typ',
    'rest-list-column-url': 'URL',
    'rest-list-confirm-disable-$count': (count) => {
        let sources = cardinal(count, 'tento zdroj', 'tyto 2 zdroje', 'těchto 5 zdrojů');
        return `Opravdu chcete ${sources} deaktivovat?`;
    },
    'rest-list-confirm-reactivate-$count': (count) => {
        let sources = cardinal(count, 'tento zdroj', 'tyto 2 zdroje', 'těchto 5 zdrojů');
        return `Opravdu chcete ${sources} znovu aktivovat?`;
    },
    'rest-list-edit': 'Upravit seznam zdrojů',
    'rest-list-save': 'Uložit seznam zdrojů',
    'rest-list-status-deleted': 'Smazán',
    'rest-list-status-disabled': 'Deaktivován',
    'rest-list-title': 'Zdroje REST',

    'rest-summary-$title': (title) => {
        let text = 'Zdroj REST';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'rest-summary-add': 'Přidat nový zdroj',
    'rest-summary-cancel': 'Zrušit',

    'rest-summary-confirm-delete': 'Opravdu chcete tento zdroj smazat?',
    'rest-summary-confirm-disable': 'Opravdu chcete tento zdroj deaktivovat?',
    'rest-summary-confirm-reactivate': 'Opravdu chcete tento zdroj znovu aktivovat?',
    'rest-summary-delete': 'Smazat zdroj',
    'rest-summary-description': 'Popis',
    'rest-summary-disable': 'Deaktivovat zdroj',
    'rest-summary-edit': 'Upravit zdroj',
    'rest-summary-max-age': 'Maximální věk',
    'rest-summary-name': 'Identifikátor',
    'rest-summary-reactivate': 'Reaktivovat zdroj',
    'rest-summary-return': 'Návrat na seznam zdrojů',
    'rest-summary-save': 'Uložit zdroj',
    'rest-summary-type': 'Typ',
    'rest-summary-url': 'URL',

    'rest-type-generic': 'Obecný',
    'rest-type-wordpress': 'WordPress',

    'role-list-add': 'Přidat novou roli',
    'role-list-cancel': 'Zrušit',
    'role-list-column-last-modified': 'Změněno',
    'role-list-column-title': 'Název',
    'role-list-column-users': 'Uživatelé',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'tuto roli', 'tyto 2 role', 'těchto 5 rolí');
        return `Opravdu chcete ${roles} deaktivovat?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'tuto roli', 'tyto 2 role', 'těchto 5 rolí');
        return `Opravdu chcete ${roles} reaktivovat?`;
    },
    'role-list-edit': 'Upravit seznam rolí',
    'role-list-save': 'Uložit seznam rolí',
    'role-list-status-deleted': 'Smazána',
    'role-list-status-disabled': 'Deaktivována',
    'role-list-title': 'Role',

    'role-summary-$title': (title) => {
        let text = 'Role';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': 'Přidat novou roli',
    'role-summary-cancel': 'Zrušit',
    'role-summary-confirm-delete': 'Opravdu chcete tuto roli smazat?',
    'role-summary-confirm-disable': 'Opravdu chcete tuto roli deaktivovat?',
    'role-summary-confirm-reactivate': 'Opravdu chcete tuto roli znovu aktivovat?',
    'role-summary-delete': 'Smazat roli',
    'role-summary-description': 'Popis',
    'role-summary-disable': 'Deaktivovat roli',
    'role-summary-edit': 'Upravit roli',
    'role-summary-name': 'Identifikátor',
    'role-summary-rating': 'Priorita příběhů',
    'role-summary-rating-high': 'Vysoká',
    'role-summary-rating-low': 'Nízká',
    'role-summary-rating-normal': 'Normální',
    'role-summary-rating-very-high': 'Velmi vysoká',
    'role-summary-rating-very-low': 'Velmi nízká',
    'role-summary-reactivate': 'Reaktivovat roli',
    'role-summary-return': 'Návrat na seznam rolí',
    'role-summary-save': 'Uložit roli',
    'role-summary-title': 'Název',
    'role-summary-users': 'Uživatelé',

    'role-tooltip-$count-others': (count) => {
        return cardinal(count, '1 další', '2 další', '5 dalších');
    },

    'server-list-add': 'Přidat nový server',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Získaný',
    'server-list-cancel': 'Zrušit',
    'server-list-column-api-access': 'Přístup k API',
    'server-list-column-last-modified': 'Změněno',
    'server-list-column-oauth': 'Ověření OAuth',
    'server-list-column-title': 'Název',
    'server-list-column-type': 'Typ',
    'server-list-column-users': 'Uživatelé',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'tento server', 'tyto 2 servery', 'těchto 5 serverů');
        return `Opravdu chcete ${servers} deaktivovat?`;
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'tento server', 'tyto 2 servery', 'těchto 5 serverů');
        return `Opravdu chcete ${servers} reaktivovat?`;
    },
    'server-list-edit': 'Upravit seznam serverů',
    'server-list-oauth-false': '',
    'server-list-oauth-true': 'Aktivní',
    'server-list-save': 'Uložit seznam serverů',
    'server-list-status-deleted': 'Smazán',
    'server-list-status-disabled': 'Deaktivován',
    'server-list-title': 'Servery',

    'server-summary-acquire': 'Získat přístup k API',
    'server-summary-activities': 'Aktivity',
    'server-summary-add': 'Přidat nový server',
    'server-summary-api-access': 'Přístup k API',
    'server-summary-api-access-acquired': 'Získaný administrativní přístup',
    'server-summary-api-access-not-applicable': 'Nevztahuje se',
    'server-summary-api-access-pending': 'Čekání na akci uživatele',
    'server-summary-cancel': 'Zrušit',
    'server-summary-confirm-delete': 'Opravdu chcete tento server smazat?',
    'server-summary-confirm-disable': 'Opravdu chcete tento server deaktivovat?',
    'server-summary-confirm-reactivate': 'Opravdu chcete tento server reaktivovat?',
    'server-summary-delete': 'Smazat server',
    'server-summary-disable': 'Deaktivovat server',
    'server-summary-edit': 'Upravit server',
    'server-summary-gitlab-admin': 'Administrátor GitLab',
    'server-summary-gitlab-external-user': 'Externí uživatel GitLab',
    'server-summary-gitlab-regular-user': 'Běžný uživatel GitLab',
    'server-summary-member-$name': (name) => {
        return `Server: ${name}`;
    },
    'server-summary-name': 'Identifikátor',
    'server-summary-new-user': 'Nový uživatel',
    'server-summary-new-users': 'Noví uživatelé',
    'server-summary-oauth-app-id': 'ID aplikace',
    'server-summary-oauth-app-key': 'Klíč aplikace',
    'server-summary-oauth-app-secret': 'Tajemství aplikace',
    'server-summary-oauth-application-id': 'ID aplikace',
    'server-summary-oauth-application-secret': 'Tajemství aplikace',
    'server-summary-oauth-callback-url': 'URL zpětného volání',
    'server-summary-oauth-client-id': 'ID klienta',
    'server-summary-oauth-client-secret': 'Tajemství klienta',
    'server-summary-oauth-deauthorize-callback-url': 'URL zpětného volání odautorizace',
    'server-summary-oauth-gitlab-url': 'URL GitLab',
    'server-summary-oauth-redirect-uri': 'URI přesměrování',
    'server-summary-oauth-redirect-url': 'URL přesměrování',
    'server-summary-oauth-site-url': 'URL webu',
    'server-summary-privacy-policy-url': 'URL zásad ochrany osobních údajů',
    'server-summary-reactivate': 'Reaktivovat server',
    'server-summary-return': 'Návrat na seznam serverů',
    'server-summary-role-none': 'Nepřiřazovat žádné role novým uživatelům',
    'server-summary-roles': 'Přiřazení rolí',
    'server-summary-save': 'Uložit server',
    'server-summary-system-address-missing': 'Adresa systému nebyla nastavena',
    'server-summary-terms-and-conditions-url': 'URL smluvních podmínek',
    'server-summary-test-oauth': 'Testovat integraci OAuth',
    'server-summary-title': 'Název',
    'server-summary-type': 'Typ serveru',
    'server-summary-user-automatic-approval': 'Schvalovat nové uživatele automaticky',
    'server-summary-user-import-disabled': 'Nezaregistrovat nové uživatele',
    'server-summary-user-import-gitlab-admin-disabled': 'Neimportovat administrátory GitLabu',
    'server-summary-user-import-gitlab-external-user-disabled': 'Neimportovat externí uživatele GitLab',
    'server-summary-user-import-gitlab-user-disabled': 'Neimportovat uživatele GitLab',
    'server-summary-user-type-admin': 'Administrátor',
    'server-summary-user-type-guest': 'Host',
    'server-summary-user-type-moderator': 'Moderátor',
    'server-summary-user-type-regular': 'Běžný uživatel',
    'server-summary-whitelist': 'Whitelist e-mailových adres',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Obrázek na pozadí',
    'settings-cancel': 'Zrušit',
    'settings-company-name': 'Název firmy',
    'settings-edit': 'Upravit nastavení',
    'settings-input-languages': 'Vstupní jazyky',
    'settings-push-relay': 'Relé upozornění push',
    'settings-save': 'Uložit nastavení',
    'settings-site-address': 'Adresa',
    'settings-site-description': 'Popis',
    'settings-site-title': 'Název webu',
    'settings-title': 'Nastavení',

    'sign-in-$title': (title) => {
        let text = `Přihlásit se`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': 'Žádost o přístup byla zamítnuta',
    'sign-in-error-account-disabled': 'Účet je momentálně vypnutý',
    'sign-in-error-existing-users-only': 'Do tohoto systému mohou přistupovat pouze oprávnění pracovníci',
    'sign-in-error-restricted-area': 'Uživatel není administrátorem',
    'sign-in-oauth': 'Přihlaste se přes OAuth',
    'sign-in-password': 'Heslo:',
    'sign-in-problem-incorrect-username-password': 'Nesprávné uživatelské jméno nebo heslo',
    'sign-in-problem-no-support-for-username-password': 'Systém nepřijímá heslo',
    'sign-in-problem-unexpected-error': 'Došlo k neočekávané chybě',
    'sign-in-submit': 'Přihlásit se',
    'sign-in-username': 'Uživatelské jméno:',

    'sign-off-menu-sign-off': 'Odhlásit se',

    'spreadsheet-list-add': 'Přidat nový odkaz',
    'spreadsheet-list-cancel': 'Zrušit',
    'spreadsheet-list-column-filename': 'Název souboru',
    'spreadsheet-list-column-last-modified': 'Změněno',
    'spreadsheet-list-column-sheets': 'Tabulky',
    'spreadsheet-list-column-url': 'URL',
    'spreadsheet-list-confirm-disable-$count': (count) => {
        let spreadsheets = cardinal(count, 'tento odkaz', 'tyto 2 odkazy', 'těchto 5 odkazů');
        return `Opravdu chcete ${spreadsheets} deaktivovat?`;
    },
    'spreadsheet-list-confirm-reactivate-$count': (count) => {
        let spreadsheets = cardinal(count, 'tento odkaz', 'tyto 2 odkazy', 'těchto 5 odkazů');
        return `Opravdu chcete ${spreadsheets} znovu aktivovat?`;
    },
    'spreadsheet-list-edit': 'Upravit seznam odkazů',
    'spreadsheet-list-save': 'Uložit seznam odkazů',
    'spreadsheet-list-status-deleted': 'Smazán',
    'spreadsheet-list-status-disabled': 'Deaktivován',
    'spreadsheet-list-title': 'Excel soubory',

    'spreadsheet-summary-$title': (title) => {
        let text = 'Excel soubor';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'spreadsheet-summary-add': 'Přidat nový odkaz',
    'spreadsheet-summary-cancel': 'Zrušit',
    'spreadsheet-summary-confirm-delete': 'Opravdu chcete tento odkaz smazat?',
    'spreadsheet-summary-confirm-disable': 'Opravdu chcete tento odkaz deaktivovat?',
    'spreadsheet-summary-confirm-reactivate': 'Opravdu chcete tento odkaz znovu aktivovat?',
    'spreadsheet-summary-delete': 'Smazat odkaz',
    'spreadsheet-summary-description': 'Popis',
    'spreadsheet-summary-disable': 'Deaktivovat odkaz',
    'spreadsheet-summary-edit': 'Upravit odkaz',
    'spreadsheet-summary-filename': 'Název souboru',
    'spreadsheet-summary-hidden': 'Vyhledávání',
    'spreadsheet-summary-hidden-false': 'Objeví se ve výsledcích vyhledávání',
    'spreadsheet-summary-hidden-true': 'Skryté před vyhledáváním',
    'spreadsheet-summary-name': 'Identifikátor',
    'spreadsheet-summary-reactivate': 'Reaktivovat odkaz',
    'spreadsheet-summary-return': 'Návrat na seznam odkazů',
    'spreadsheet-summary-save': 'Uložit odkaz',
    'spreadsheet-summary-sheet-$number-$name': (number, name) => {
        let text = `Tabulka ${number}`;
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'spreadsheet-summary-title': 'Titul',
    'spreadsheet-summary-url': 'URL',

    'task-$seconds': (count) => {
        return cardinal(count, '1 sekunda', '2 sekundy', '5 sekund');
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentář', '2 komentáře', '5 komentářů');
        return `Importováno ${comments} k commitu z repozitářu „${repo}”`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, '1 událost', '2 události', '5 událostí');
        return `Importováno ${events} z repozitářu „${repo}”`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentář', '2 komentáře', '5 komentářů');
        return `Importováno ${comments} k problému from „${repo}”`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, '1 komentář', '2 komentáře', '5 komentářů');
        return `Importováno ${comments} k požadavku na sloučení z repozitářu „${repo}”`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozitář', '2 repozitáře', '5 repozitářů');
        return `Importováno ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, '1 uživatel', '2 uživatelé', '5 uživatelů');
        return `Importováno ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, '1 commitu', '2 commitů');
        return `Importováno přesun ${commits} z větve „${branch}” repozitářu „${repo}”`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Importování komentářů k commitu z repozitářu „${repo}”`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Importování událostí od „${repo}”`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Importování komentářů k problému z repozitářu „${repo}”`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Importování komentářů k požadavku na sloučení z repozitářu „${repo}”`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Importování přesunu z repozitářu „${repo}”`;
    },
    'task-importing-repos': 'Importování repozitářů',
    'task-importing-users': 'Importování uživatelů',
    'task-installed-$count-hooks': (count) => {
        let hooks = cardinal(count, '1 hák', '2 háki', '5 háků');
        return `Instalováno ${hooks}`;
    },
    'task-installing-hooks': 'Instalování háků',
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, '1 hák', '2 háki', '5 háků');
        return `Odinstalováno ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozitář', '2 repozitáře', '5 repozitářů');
        return `Odstraněno ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, '1 uživatel', '2 uživatelé', '5 uživatelů');
        return `Odstraněno ${users}`;
    },
    'task-removing-hooks': 'Odinstalování háků',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, '1 repozitář', '2 repozitáře', '5 repozitářů');
        return `Aktualizováno ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, '1 uživatel', '2 uživatelé', '5 uživatelů');
        return `Aktualizováno ${users}`;
    },

    'text-field-placeholder-none': 'žádné',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' a ', tooltip ];
    },
    'tooltip-more': 'Více',

    'tz-name-abidjan': 'Abidjan',
    'tz-name-accra': 'Accra',
    'tz-name-acre': 'Acre',
    'tz-name-act': 'Australské hlavní území',
    'tz-name-adak': 'Adak',
    'tz-name-addis-ababa': 'Addis Abeba',
    'tz-name-adelaide': 'Adelaide',
    'tz-name-aden': 'Aden',
    'tz-name-africa': 'Afrika',
    'tz-name-alaska': 'Aljaška',
    'tz-name-aleutian': 'Aleutské ostrovy',
    'tz-name-algiers': 'Alžír',
    'tz-name-almaty': 'Almaty',
    'tz-name-america': 'Amerika',
    'tz-name-amman': 'Amman',
    'tz-name-amsterdam': 'Amsterdam',
    'tz-name-anadyr': 'Anadyr',
    'tz-name-anchorage': 'Anchorage',
    'tz-name-andorra': 'Andorra',
    'tz-name-anguilla': 'Anguilla',
    'tz-name-antananarivo': 'Antananarivo',
    'tz-name-antarctica': 'Antarktida',
    'tz-name-antigua': 'Antigua',
    'tz-name-apia': 'Apia',
    'tz-name-aqtau': 'Aqtau',
    'tz-name-aqtobe': 'Aqtobe',
    'tz-name-araguaina': 'Araguaina',
    'tz-name-arctic': 'Arktický',
    'tz-name-argentina': 'Argentina',
    'tz-name-arizona': 'Arizona',
    'tz-name-aruba': 'Aruba',
    'tz-name-ashgabat': 'Ašchabad',
    'tz-name-ashkhabad': 'Ašchabad',
    'tz-name-asia': 'Asie',
    'tz-name-asmara': 'Asmara',
    'tz-name-asmera': 'Asmera',
    'tz-name-astrakhan': 'Astrakhan',
    'tz-name-asuncion': 'Asuncion',
    'tz-name-athens': 'Athény',
    'tz-name-atikokan': 'Atikokan',
    'tz-name-atka': 'Atka',
    'tz-name-atlantic': 'Atlantik',
    'tz-name-atyrau': 'Atyrau',
    'tz-name-auckland': 'Auckland',
    'tz-name-australia': 'Austrálie',
    'tz-name-azores': 'Azory',
    'tz-name-baghdad': 'Bagdád',
    'tz-name-bahia': 'Bahia',
    'tz-name-bahia-banderas': 'Bahia Banderas',
    'tz-name-bahrain': 'Bahrajn',
    'tz-name-baja-norte': 'Baja Norte',
    'tz-name-baja-sur': 'Baja Sur',
    'tz-name-baku': 'Baku',
    'tz-name-bamako': 'Bamako',
    'tz-name-bangkok': 'Bangkok',
    'tz-name-bangui': 'Bangui',
    'tz-name-banjul': 'Banjul',
    'tz-name-barbados': 'Barbados',
    'tz-name-barnaul': 'Barnaul',
    'tz-name-beirut': 'Beirut',
    'tz-name-belem': 'Belem',
    'tz-name-belfast': 'Belfast',
    'tz-name-belgrade': 'Bělehrad',
    'tz-name-belize': 'Belize',
    'tz-name-berlin': 'Berlín',
    'tz-name-bermuda': 'Bermudy',
    'tz-name-beulah': 'Beulah',
    'tz-name-bishkek': 'Biškek',
    'tz-name-bissau': 'Bissau',
    'tz-name-blanc-sablon': 'Blanc-Sablon',
    'tz-name-blantyre': 'Blantyre',
    'tz-name-boa-vista': 'Boa Vista',
    'tz-name-bogota': 'Bogota',
    'tz-name-boise': 'Boise',
    'tz-name-bougainville': 'Bougainville',
    'tz-name-bratislava': 'Bratislava',
    'tz-name-brazil': 'Brazílie',
    'tz-name-brazzaville': 'Brazzaville',
    'tz-name-brisbane': 'Brisbane',
    'tz-name-broken-hill': 'Broken Hill',
    'tz-name-brunei': 'Brunej',
    'tz-name-brussels': 'Brusel',
    'tz-name-bucharest': 'Bukurešť',
    'tz-name-budapest': 'Budapešť',
    'tz-name-buenos-aires': 'Buenos Aires',
    'tz-name-bujumbura': 'Bujumbura',
    'tz-name-busingen': 'Busingen',
    'tz-name-cairo': 'Káhira',
    'tz-name-calcutta': 'Kalkata',
    'tz-name-cambridge-bay': 'Cambridge Bay',
    'tz-name-campo-grande': 'Campo Grande',
    'tz-name-canada': 'Kanada',
    'tz-name-canary': 'Kanárský ostrov',
    'tz-name-canberra': 'Canberra',
    'tz-name-cancun': 'Cancun',
    'tz-name-cape-verde': 'Kapverdy',
    'tz-name-caracas': 'Caracas',
    'tz-name-casablanca': 'Casablanca',
    'tz-name-casey': 'Casey',
    'tz-name-catamarca': 'Catamarca',
    'tz-name-cayenne': 'Cayenne',
    'tz-name-cayman': 'Cayman',
    'tz-name-center': 'Centrum',
    'tz-name-central': 'Centrální',
    'tz-name-ceuta': 'Ceuta',
    'tz-name-chagos': 'Chagos',
    'tz-name-chatham': 'Chatham',
    'tz-name-chicago': 'Chicago',
    'tz-name-chihuahua': 'Čivava',
    'tz-name-chile': 'Chile',
    'tz-name-chisinau': 'Kišiněv',
    'tz-name-chita': 'Chita',
    'tz-name-choibalsan': 'Choibalsan',
    'tz-name-chongqing': 'Chongqing',
    'tz-name-christmas': 'Vánoční ostrov',
    'tz-name-chungking': 'Chongqing',
    'tz-name-chuuk': 'Chuuk',
    'tz-name-cocos': 'Kokosové ostrovy',
    'tz-name-colombo': 'Colombo',
    'tz-name-comod-rivadavia': 'Comodoro Rivadavia',
    'tz-name-comoro': 'Comoro',
    'tz-name-conakry': 'Conakry',
    'tz-name-continental': 'Kontinentální',
    'tz-name-copenhagen': 'Kodaň',
    'tz-name-coral-harbour': 'Coral Harbour',
    'tz-name-cordoba': 'Cordoba',
    'tz-name-costa-rica': 'Kostarika',
    'tz-name-creston': 'Crestone',
    'tz-name-cuiaba': 'Cuiaba',
    'tz-name-curacao': 'Curacao',
    'tz-name-currie': 'Currie',
    'tz-name-dacca': 'Dacca',
    'tz-name-dakar': 'Dakar',
    'tz-name-damascus': 'Damašek',
    'tz-name-danmarkshavn': 'Danmarkshavn',
    'tz-name-dar-es-salaam': 'Dar es Salaam',
    'tz-name-darwin': 'Darwin',
    'tz-name-davis': 'Davis',
    'tz-name-dawson': 'Dawsone',
    'tz-name-dawson-creek': 'Dawson Creek',
    'tz-name-de-noronha': 'De Noronha',
    'tz-name-denver': 'Denver',
    'tz-name-detroit': 'Detroit',
    'tz-name-dhaka': 'Dhaka',
    'tz-name-dili': 'Dili',
    'tz-name-djibouti': 'Džibutsko',
    'tz-name-dominica': 'Dominika',
    'tz-name-douala': 'Douala',
    'tz-name-dubai': 'Dubaj',
    'tz-name-dublin': 'Dublin',
    'tz-name-dumont-d-urville': 'Dumont d´Urville',
    'tz-name-dushanbe': 'Dušanbe',
    'tz-name-east': 'Východní',
    'tz-name-east-indiana': 'Východní Indiana',
    'tz-name-easter': 'Velikonoční ostrov',
    'tz-name-easter-island': 'Velikonoční ostrov',
    'tz-name-eastern': 'Východní',
    'tz-name-edmonton': 'Edmonton',
    'tz-name-efate': 'Efate',
    'tz-name-eirunepe': 'Eirunepe',
    'tz-name-el-aaiun': 'El Aaiun',
    'tz-name-el-salvador': 'El Salvador',
    'tz-name-enderbury': 'Enderbury',
    'tz-name-ensenada': 'Ensenada',
    'tz-name-eucla': 'Eucla',
    'tz-name-europe': 'Evropa',
    'tz-name-faeroe': 'Faeroe',
    'tz-name-fakaofo': 'Fakaofo',
    'tz-name-famagusta': 'Famagusta',
    'tz-name-faroe': 'Faerské ostrovy',
    'tz-name-fiji': 'Fidži',
    'tz-name-fort-nelson': 'Fort Nelson',
    'tz-name-fort-wayne': 'Fort Wayne',
    'tz-name-fortaleza': 'Fortaleza',
    'tz-name-freetown': 'Freetown',
    'tz-name-funafuti': 'Funafuti',
    'tz-name-gaborone': 'Gaborone',
    'tz-name-galapagos': 'Galapágy',
    'tz-name-gambier': 'Gambier',
    'tz-name-gaza': 'Gaza',
    'tz-name-general': 'Všeobecné',
    'tz-name-gibraltar': 'Gibraltar',
    'tz-name-glace-bay': 'Glace Bay',
    'tz-name-godthab': 'Godthab',
    'tz-name-goose-bay': 'Goose Bay',
    'tz-name-grand-turk': 'Velký Turek',
    'tz-name-grenada': 'Grenada',
    'tz-name-guadalcanal': 'Guadalcanal',
    'tz-name-guadeloupe': 'Guadeloupe',
    'tz-name-guam': 'Guam',
    'tz-name-guatemala': 'Guatemala',
    'tz-name-guayaquil': 'Guayaquil',
    'tz-name-guernsey': 'Guernsey',
    'tz-name-guyana': 'Guyana',
    'tz-name-halifax': 'Halifax',
    'tz-name-harare': 'Harare',
    'tz-name-harbin': 'Harbin',
    'tz-name-havana': 'Havana',
    'tz-name-hawaii': 'Havaj',
    'tz-name-hebron': 'Hebron',
    'tz-name-helsinki': 'Helsinki',
    'tz-name-hermosillo': 'Hermosillo',
    'tz-name-ho-chi-minh': 'Ho Či Minovo',
    'tz-name-hobart': 'Hobart',
    'tz-name-hong-kong': 'Hongkong',
    'tz-name-honolulu': 'Honolulu',
    'tz-name-hovd': 'Hovd',
    'tz-name-indian': 'Indický oceán',
    'tz-name-indiana': 'Indiana',
    'tz-name-indiana-starke': 'Indiana-Starke',
    'tz-name-indianapolis': 'Indianapolis',
    'tz-name-inuvik': 'Inuvik',
    'tz-name-iqaluit': 'Iqaluit',
    'tz-name-irkutsk': 'Irkutsk',
    'tz-name-isle-of-man': 'Ostrov Man',
    'tz-name-istanbul': 'Istanbul',
    'tz-name-jakarta': 'Jakarta',
    'tz-name-jamaica': 'Jamaica',
    'tz-name-jan-mayen': 'Jan Mayen',
    'tz-name-jayapura': 'Jayapura',
    'tz-name-jersey': 'Trikot',
    'tz-name-jerusalem': 'Jeruzalém',
    'tz-name-johannesburg': 'Johannesburg',
    'tz-name-johnston': 'Johnston',
    'tz-name-juba': 'Juba',
    'tz-name-jujuy': 'Jujuy',
    'tz-name-juneau': 'Juneau',
    'tz-name-kabul': 'Kabul',
    'tz-name-kaliningrad': 'Kaliningrad',
    'tz-name-kamchatka': 'Kamčatka',
    'tz-name-kampala': 'Kampala',
    'tz-name-karachi': 'Karáčí',
    'tz-name-kashgar': 'Kashgar',
    'tz-name-kathmandu': 'Káthmándú',
    'tz-name-katmandu': 'Katmandu',
    'tz-name-kentucky': 'Kentucky',
    'tz-name-kerguelen': 'Kerguelen',
    'tz-name-khandyga': 'Khandyga',
    'tz-name-khartoum': 'Chartúm',
    'tz-name-kiev': 'Kyjev',
    'tz-name-kigali': 'Kigali',
    'tz-name-kinshasa': 'Kinshasa',
    'tz-name-kiritimati': 'Kiritimati',
    'tz-name-kirov': 'Kirov',
    'tz-name-knox': 'Knox',
    'tz-name-knox-in': 'Knox, Indiana',
    'tz-name-kolkata': 'Kalkata',
    'tz-name-kosrae': 'Kosrae',
    'tz-name-kralendijk': 'Kralendijk',
    'tz-name-krasnoyarsk': 'Krasnojarsk',
    'tz-name-kuala-lumpur': 'Kuala Lumpur',
    'tz-name-kuching': 'Kuching',
    'tz-name-kuwait': 'Kuvajt',
    'tz-name-kwajalein': 'Kwajalein',
    'tz-name-la-paz': 'La Paz',
    'tz-name-la-rioja': 'La Rioja',
    'tz-name-lagos': 'Lagos',
    'tz-name-lhi': 'Lord Howe Island',
    'tz-name-libreville': 'Libreville',
    'tz-name-lima': 'Lima',
    'tz-name-lindeman': 'Lindeman',
    'tz-name-lisbon': 'Lisabon',
    'tz-name-ljubljana': 'Lublaň',
    'tz-name-lome': 'Lome',
    'tz-name-london': 'Londýn',
    'tz-name-longyearbyen': 'Longyearbyen',
    'tz-name-lord-howe': 'Lord Howe',
    'tz-name-los-angeles': 'Los Angeles',
    'tz-name-louisville': 'Louisville',
    'tz-name-lower-princes': 'Lower Prince’s Quarter ',
    'tz-name-luanda': 'Luanda',
    'tz-name-lubumbashi': 'Lubumbashi',
    'tz-name-lusaka': 'Lusaka',
    'tz-name-luxembourg': 'Lucembursko',
    'tz-name-macao': 'Macao',
    'tz-name-macau': 'Macau',
    'tz-name-maceio': 'Maceio',
    'tz-name-macquarie': 'Macquarie',
    'tz-name-madeira': 'Madeira',
    'tz-name-madrid': 'Madrid',
    'tz-name-magadan': 'Magadan',
    'tz-name-mahe': 'Mahe',
    'tz-name-majuro': 'Majuro',
    'tz-name-makassar': 'Makassare',
    'tz-name-malabo': 'Malabo',
    'tz-name-maldives': 'Maledivy',
    'tz-name-malta': 'Malta',
    'tz-name-managua': 'Managua',
    'tz-name-manaus': 'Manaus',
    'tz-name-manila': 'Manila',
    'tz-name-maputo': 'Maputo',
    'tz-name-marengo': 'Marengo',
    'tz-name-mariehamn': 'Mariehamn',
    'tz-name-marigot': 'Marigot',
    'tz-name-marquesas': 'Marquesas',
    'tz-name-martinique': 'Martinik',
    'tz-name-maseru': 'Maseru',
    'tz-name-matamoros': 'Matamoros',
    'tz-name-mauritius': 'Mauricius',
    'tz-name-mawson': 'Mawsone',
    'tz-name-mayotte': 'Mayotte',
    'tz-name-mazatlan': 'Mazatlan',
    'tz-name-mbabane': 'Mbabane',
    'tz-name-mc-murdo': 'McMurdo',
    'tz-name-melbourne': 'Melbourne',
    'tz-name-mendoza': 'Mendoza',
    'tz-name-menominee': 'Menominee',
    'tz-name-merida': 'Merida',
    'tz-name-metlakatla': 'Metlakatla',
    'tz-name-mexico': 'Mexiko',
    'tz-name-mexico-city': 'Mexico City',
    'tz-name-michigan': 'Michigan',
    'tz-name-midway': 'Midway',
    'tz-name-minsk': 'Minsk',
    'tz-name-miquelon': 'Miquelon',
    'tz-name-mogadishu': 'Mogadišo',
    'tz-name-monaco': 'Monako',
    'tz-name-moncton': 'Moncton',
    'tz-name-monrovia': 'Monrovia',
    'tz-name-monterrey': 'Monterrey',
    'tz-name-montevideo': 'Montevideo',
    'tz-name-monticello': 'Monticello',
    'tz-name-montreal': 'Montreal',
    'tz-name-montserrat': 'Montserrat',
    'tz-name-moscow': 'Moskva',
    'tz-name-mountain': 'Hora',
    'tz-name-muscat': 'Muscat',
    'tz-name-nairobi': 'Nairobi',
    'tz-name-nassau': 'Nassau',
    'tz-name-nauru': 'Nauru',
    'tz-name-ndjamena': 'Ndjamena',
    'tz-name-new-salem': 'New Salem',
    'tz-name-new-york': 'New York',
    'tz-name-newfoundland': 'Newfoundland',
    'tz-name-niamey': 'Niamey',
    'tz-name-nicosia': 'Nicosia',
    'tz-name-nipigon': 'Nipigon',
    'tz-name-niue': 'Niue',
    'tz-name-nome': 'Nome',
    'tz-name-norfolk': 'Norfolk',
    'tz-name-noronha': 'Noronha',
    'tz-name-north': 'Severní',
    'tz-name-north-dakota': 'Severní Dakota',
    'tz-name-nouakchott': 'Nouakchott',
    'tz-name-noumea': 'Noumea',
    'tz-name-novokuznetsk': 'Novokuznetsk',
    'tz-name-novosibirsk': 'Novosibirsk',
    'tz-name-nsw': 'Nový Jížní Wales',
    'tz-name-ojinaga': 'Ojinaga',
    'tz-name-omsk': 'Omsk',
    'tz-name-oral': 'Oral',
    'tz-name-oslo': 'Oslo',
    'tz-name-ouagadougou': 'Ouagadougou',
    'tz-name-pacific': 'Pacifik',
    'tz-name-pacific-new': 'Pacifik-nový',
    'tz-name-pago-pago': 'Pago Pago',
    'tz-name-palau': 'Palau',
    'tz-name-palmer': 'Palmer',
    'tz-name-panama': 'Panama',
    'tz-name-pangnirtung': 'Pangnirtung',
    'tz-name-paramaribo': 'Paramaribo',
    'tz-name-paris': 'Paříž',
    'tz-name-perth': 'Perth',
    'tz-name-petersburg': 'Petersburg',
    'tz-name-phnom-penh': 'Phnom Penh',
    'tz-name-phoenix': 'Phoenix',
    'tz-name-pitcairn': 'Pitcairn',
    'tz-name-podgorica': 'Podgorica',
    'tz-name-pohnpei': 'Pohnpei',
    'tz-name-ponape': 'Ponape',
    'tz-name-pontianak': 'Pontianak',
    'tz-name-port-au-prince': 'Port-au-Prince',
    'tz-name-port-moresby': 'Port Moresby',
    'tz-name-port-of-spain': 'Španělský přístav',
    'tz-name-porto-acre': 'Porto Acre',
    'tz-name-porto-novo': 'Porto-Novo',
    'tz-name-porto-velho': 'Porto Velho',
    'tz-name-prague': 'Praha',
    'tz-name-puerto-rico': 'Portoriko',
    'tz-name-punta-arenas': 'Punta Arenas',
    'tz-name-pyongyang': 'Pchjongjang',
    'tz-name-qatar': 'Katar',
    'tz-name-qostanay': 'Qostanay',
    'tz-name-queensland': 'Queensland',
    'tz-name-qyzylorda': 'Qyzylorda',
    'tz-name-rainy-river': 'Rainy River',
    'tz-name-rangoon': 'Rangún',
    'tz-name-rankin-inlet': 'Rankin Inlet',
    'tz-name-rarotonga': 'Rarotonga',
    'tz-name-recife': 'Recife',
    'tz-name-regina': 'Regina',
    'tz-name-resolute': 'Resolute',
    'tz-name-reunion': 'Réunion',
    'tz-name-reykjavik': 'Reykjavík',
    'tz-name-riga': 'Riga',
    'tz-name-rio-branco': 'Rio Branco',
    'tz-name-rio-gallegos': 'Rio Gallegos',
    'tz-name-riyadh': 'Rijád',
    'tz-name-rome': 'Řím',
    'tz-name-rosario': 'Rosario',
    'tz-name-rothera': 'Rothera',
    'tz-name-saigon': 'Saigon',
    'tz-name-saipan': 'Saipan',
    'tz-name-sakhalin': 'Sakhalin',
    'tz-name-salta': 'Salta',
    'tz-name-samara': 'Samara',
    'tz-name-samarkand': 'Samarkand',
    'tz-name-samoa': 'Samoa',
    'tz-name-san-juan': 'San Juan',
    'tz-name-san-luis': 'San Luis',
    'tz-name-san-marino': 'San Marino',
    'tz-name-santa-isabel': 'Santa Isabel',
    'tz-name-santarem': 'Santarem',
    'tz-name-santiago': 'Santiago',
    'tz-name-santo-domingo': 'Santo Domingo',
    'tz-name-sao-paulo': 'Sao Paulo',
    'tz-name-sao-tome': 'Svatý Tomáš',
    'tz-name-sarajevo': 'Sarajevo',
    'tz-name-saratov': 'Saratov',
    'tz-name-saskatchewan': 'Saskatchewan',
    'tz-name-scoresbysund': 'Scoresbysund',
    'tz-name-seoul': 'Soul',
    'tz-name-shanghai': 'Šanghaj',
    'tz-name-shiprock': 'Shiprock',
    'tz-name-simferopol': 'Simferopol',
    'tz-name-singapore': 'Singapur',
    'tz-name-sitka': 'Sitka',
    'tz-name-skopje': 'Skopje',
    'tz-name-sofia': 'Sofia',
    'tz-name-south': 'Jižní',
    'tz-name-south-georgia': 'Jižní Georgie',
    'tz-name-south-pole': 'Jižní pól',
    'tz-name-srednekolymsk': 'Srednekolymsk',
    'tz-name-st-barthelemy': 'Svatý Bartoloměj',
    'tz-name-st-helena': 'St Helena',
    'tz-name-st-johns': 'St Johns',
    'tz-name-st-kitts': 'St Kitts',
    'tz-name-st-lucia': 'Svatá Lucie',
    'tz-name-st-thomas': 'St Thomas',
    'tz-name-st-vincent': 'Svatý Vincenc',
    'tz-name-stanley': 'Stanley',
    'tz-name-stockholm': 'Stockholm',
    'tz-name-swift-current': 'Swift Current',
    'tz-name-sydney': 'Sydney',
    'tz-name-syowa': 'Syowa',
    'tz-name-tahiti': 'Tahiti',
    'tz-name-taipei': 'Tchaj-pej',
    'tz-name-tallinn': 'Tallinn',
    'tz-name-tarawa': 'Tarawa',
    'tz-name-tashkent': 'Taškent',
    'tz-name-tasmania': 'Tasmánie',
    'tz-name-tbilisi': 'Tbilisi',
    'tz-name-tegucigalpa': 'Tegucigalpa',
    'tz-name-tehran': 'Teherán',
    'tz-name-tel-aviv': 'Tel Aviv',
    'tz-name-tell-city': 'Tell City',
    'tz-name-thimbu': 'Thimbu',
    'tz-name-thimphu': 'Thimphu',
    'tz-name-thule': 'Thule',
    'tz-name-thunder-bay': 'Thunder Bay',
    'tz-name-tijuana': 'Tijuana',
    'tz-name-timbuktu': 'Timbuktu',
    'tz-name-tirane': 'Tirane',
    'tz-name-tiraspol': 'Tiraspol',
    'tz-name-tokyo': 'Tokio',
    'tz-name-tomsk': 'Tomsk',
    'tz-name-tongatapu': 'Tongatapu',
    'tz-name-toronto': 'Toronto',
    'tz-name-tortola': 'Tortola',
    'tz-name-tripoli': 'Tripoli',
    'tz-name-troll': 'Troll',
    'tz-name-truk': 'Truk',
    'tz-name-tucuman': 'Tucuman',
    'tz-name-tunis': 'Tunis',
    'tz-name-ujung-pandang': 'Ujung Pandang',
    'tz-name-ulaanbaatar': 'Ulánbátar',
    'tz-name-ulan-bator': 'Ulan Bator',
    'tz-name-ulyanovsk': 'Uljanovsk',
    'tz-name-urumqi': 'Urumči',
    'tz-name-us': 'Spojené státy',
    'tz-name-ushuaia': 'Ushuaia',
    'tz-name-ust-nera': 'Ust-Nera',
    'tz-name-uzhgorod': 'Užhorod',
    'tz-name-vaduz': 'Vaduz',
    'tz-name-vancouver': 'Vancouver',
    'tz-name-vatican': 'Vatikán',
    'tz-name-vevay': 'Vevay',
    'tz-name-victoria': 'Victoria',
    'tz-name-vienna': 'Vídeň',
    'tz-name-vientiane': 'Vientiane',
    'tz-name-vilnius': 'Vilnius',
    'tz-name-vincennes': 'Vincennes',
    'tz-name-virgin': 'Panenské Ostrovy',
    'tz-name-vladivostok': 'Vladivostok',
    'tz-name-volgograd': 'Volgograd',
    'tz-name-vostok': 'Vostok',
    'tz-name-wake': 'Wake Island',
    'tz-name-wallis': 'Wallis',
    'tz-name-warsaw': 'Varšava',
    'tz-name-west': 'Západ',
    'tz-name-whitehorse': 'Whitehorse',
    'tz-name-winamac': 'Winamac',
    'tz-name-windhoek': 'Windhoek',
    'tz-name-winnipeg': 'Winnipeg',
    'tz-name-yakutat': 'Yakutat',
    'tz-name-yakutsk': 'Jakutsk',
    'tz-name-yancowinna': 'Yancowinna',
    'tz-name-yangon': 'Yangon',
    'tz-name-yap': 'Yap',
    'tz-name-yekaterinburg': 'Jekatěrinburg',
    'tz-name-yellowknife': 'Yellowknife',
    'tz-name-yerevan': 'Jerevan',
    'tz-name-yukon': 'Yukon',
    'tz-name-zagreb': 'Záhřeb',
    'tz-name-zaporozhye': 'Záporoží',
    'tz-name-zurich': 'Curych',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, '1 souboru', '2 souborů');
        return `Nahrávání ${files}, zbývá ${size}`;
    },

    'user-list-add': 'Přidat nového uživatele',
    'user-list-approve-all': 'Schválit všechny požadavky',
    'user-list-cancel': 'Zrušit',
    'user-list-column-email': 'Emailová adresa',
    'user-list-column-last-modified': 'Změněno',
    'user-list-column-name': 'Jméno',
    'user-list-column-projects': 'Projekty',
    'user-list-column-roles': 'Role',
    'user-list-column-type': 'Typ',
    'user-list-column-username': 'Uživatelské jméno',
    'user-list-confirm-disable-$count': (count) => {
        let accounts = cardinal(count, 'tohoto uživatele', 'tyto 2 uživatele', 'těchto 5 uživatelů');
        return `Opravdu chcete ${accounts} deaktivovat?`;
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let accounts = cardinal(count, 'tohoto uživatele', 'tyto 2 uživatele', 'těchto 5 uživatelů');
        return `Opravdu chcete ${accounts} reaktivovat?`;
    },
    'user-list-edit': 'Upravit seznam uživatelů',
    'user-list-reject-all': 'Odmítnout všechny požadavky',
    'user-list-save': 'Uložit seznam uživatelů',
    'user-list-status-deleted': 'Smazán',
    'user-list-status-disabled': 'Deaktivován',
    'user-list-status-pending': 'Schválení čeká',
    'user-list-title': 'Uživatelé',
    'user-list-type-admin': 'Administrátor',
    'user-list-type-guest': 'Host',
    'user-list-type-moderator': 'Moderátor',
    'user-list-type-regular': 'Běžný uživatel',
    'user-summary-$name': (name) => {
        let text = 'Uživatel';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': 'Přidat nového uživatele',
    'user-summary-cancel': 'Zrušit',
    'user-summary-confirm-delete': 'Opravdu chcete smazat tohoto uživatele?',
    'user-summary-confirm-disable': 'Opravdu chcete deaktivovat tohoto uživatele?',
    'user-summary-confirm-reactivate': 'Opravdu chcete reaktivovat tohoto uživatele?',
    'user-summary-delete': 'Smazat uživatele',
    'user-summary-disable': 'Deaktivovat uživatele',
    'user-summary-edit': 'Upravit uživatele',
    'user-summary-email': 'Emailová adresa',
    'user-summary-github': 'URL profilu GitHub',
    'user-summary-gitlab': 'URL profilu GitLab',
    'user-summary-ichat': 'Uživatelské jméno iChat',
    'user-summary-linkedin': 'URL profilu Linkedin',
    'user-summary-member-$name': (name) => {
        let text = 'Člen';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': 'Upravit člena',
    'user-summary-member-return': 'Návrat na seznam členů',
    'user-summary-member-save': 'Uložit člena',
    'user-summary-name': 'Jméno',
    'user-summary-phone': 'Telefonní číslo',
    'user-summary-profile-image': 'Profilový obrázek',
    'user-summary-reactivate': 'Reaktivovat uživatele',
    'user-summary-remove-membership': 'Odebrat uživatele z projektu',
    'user-summary-restore-membership': 'Přidat uživatele do projektu',
    'user-summary-return': 'Návrat na seznam uživatelů',
    'user-summary-role-none': 'Žádné',
    'user-summary-roles': 'Role',
    'user-summary-save': 'Uložit uživatele',
    'user-summary-skype': 'Uživatelské jméno Skype',
    'user-summary-slack': 'Uživatelské ID Slack',
    'user-summary-slack-team': 'ID týmu Slack',
    'user-summary-social-links': 'Sociální sítě',
    'user-summary-stackoverflow': 'URL profilu Stack Overflow',
    'user-summary-statistics': 'Aktivity',
    'user-summary-twitter': 'Uživatelské jméno Twitter',
    'user-summary-type': 'Typ uživatele',
    'user-summary-type-admin': 'Administrátor',
    'user-summary-type-guest': 'Host',
    'user-summary-type-moderator': 'Moderátor',
    'user-summary-type-regular': 'Běžný uživatel',
    'user-summary-username': 'Uživatelské jméno',

    'user-tooltip-$count': (count) => {
        return cardinal(count, '1 uživatel', '2 uživatelé', '5 uživatelů');
    },

    'validation-duplicate-project-name': 'Projekt s tímto identifikátorem již existuje',
    'validation-duplicate-role-name': 'Role s tímto identifikátorem již existuje',
    'validation-duplicate-server-name': 'Server s tímto identifikátorem již existuje',
    'validation-duplicate-source-name': 'Zdroj s tímto identifikátorem již existuje',
    'validation-duplicate-spreadsheet-name': 'Okaz s tímto identifikátorem již existuje',
    'validation-duplicate-user-name': 'Uživatel s tímto uživatelským jménem již existuje',
    'validation-illegal-project-name': 'Identifikátor projektu nemůže být "global", "admin", "public" nebo "srv"',
    'validation-invalid-timezone': 'Neplatné časové pásmo',
    'validation-localhost-is-wrong': '"localhost" není platné',
    'validation-password-for-admin-only': 'Pouze administrátoři se mohou přihlásit pomocí hesla',
    'validation-required': 'Povinný',
    'validation-used-by-trambar': 'Používá Trambar',

    'website-summary-cancel': 'Zrušit',
    'website-summary-domain-names': 'Doménová jména',
    'website-summary-edit': 'Upravit webové stránky',
    'website-summary-save': 'Uložit webové stránky',
    'website-summary-template': 'Šablona',
    'website-summary-template-disabled': 'Stránka deaktivovaná',
    'website-summary-template-generic': 'Obecná šablona',
    'website-summary-timezone': 'Časové pásmo',
    'website-summary-title': 'Webová stránka',
    'website-summary-traffic-report-time': 'Čas zveřejnění dopravní zprávy',
    'website-summary-versions': 'Verze',

    'welcome': 'Vítejte!',

    'wiki-list-cancel': 'Zrušit',
    'wiki-list-column-last-modified': 'Změněno',
    'wiki-list-column-public': 'Veřejná',
    'wiki-list-column-repo': 'Úložiště',
    'wiki-list-column-title': 'Titul',
    'wiki-list-confirm-deselect-$count': (count) => {
        let pages = cardinal(count, 'této stránky', 'těchto 2 stránek', 'těchto 5 stránek');
        return `Opravdu chcete zrušit výběr ${pages}?`;
    },
    'wiki-list-confirm-select-$count': (count) => {
        let pages = cardinal(count, 'tuto stránku', 'tyto 2 stránky', 'těchto 5 stránek');
        return `Opravdu chcete tyto ${pages} zveřejnit?`;
    },
    'wiki-list-edit': 'Upravit seznam stránek',
    'wiki-list-public-always': 'vždy',
    'wiki-list-public-no': 'ne',
    'wiki-list-public-referenced': 'odkazovaná',
    'wiki-list-save': 'Uložit seznam stránek',
    'wiki-list-title': 'Wiki GitLabu',

    'wiki-summary-$title': (title) => {
        let text = 'Wiki GitLabu';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'wiki-summary-cancel': 'Zrušit',
    'wiki-summary-confirm-deselect': 'Opravdu chcete zrušit výběr této stránky?',
    'wiki-summary-confirm-select': 'Opravdu chcete tuto stránku zveřejnit?',
    'wiki-summary-deselect': 'Zrušit výběr stránky',
    'wiki-summary-edit': 'Upravit stránku',
    'wiki-summary-hidden': 'Vyhledávání',
    'wiki-summary-hidden-false': 'Objeví se ve výsledcích vyhledávání',
    'wiki-summary-hidden-true': 'Skryté před vyhledáváním',
    'wiki-summary-page-contents': 'Obsah',
    'wiki-summary-public': 'Veřejná',
    'wiki-summary-public-always': 'Vždy',
    'wiki-summary-public-no': 'Ne',
    'wiki-summary-public-referenced': 'Ano (odkazovaná na jinou veřejnou stránku)',
    'wiki-summary-repo': 'Identifikátor úložiště',
    'wiki-summary-return': 'Návrat na seznam stránek',
    'wiki-summary-save': 'Uložit stránku',
    'wiki-summary-select': 'Vyberte stránku',
    'wiki-summary-slug': 'Slug',
    'wiki-summary-title': 'Titul',
};

export {
    phrases,
    genderize,
};
