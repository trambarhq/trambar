require('moment/locale/cs');

module.exports = function(localeCode) {
    return {
        'action-badge-add': 'přidat',
        'action-badge-approve': 'schválit',
        'action-badge-archive': 'archivovat',
        'action-badge-disable': 'deaktivovat',
        'action-badge-reactivate': 'reaktivovat',
        'action-badge-remove': 'odstranit',
        'action-badge-restore': 'obnovit',

        'activity-chart-legend-branch': 'Nové větve',
        'activity-chart-legend-issue': 'Problémy',
        'activity-chart-legend-member': 'Změny členství',
        'activity-chart-legend-merge': 'Sloučení kódu',
        'activity-chart-legend-merge-request': 'Žádosti o sloučení',
        'activity-chart-legend-milestone': 'Milníky',
        'activity-chart-legend-post': 'Příspěvky',
        'activity-chart-legend-push': 'Přesuny',
        'activity-chart-legend-repo': 'Změny repozitářů',
        'activity-chart-legend-survey': 'Ankety',
        'activity-chart-legend-tag': 'Tagy',
        'activity-chart-legend-task-list': 'Seznamy úkolů',
        'activity-chart-legend-wiki': 'Úpravy wiki',

        'activity-tooltip-$count': (count) => {
            if (singular(count)) {
                return `1 příběh`;
            } else if (plural(count)) {
                return `${count} příběhy`;
            } else {
                return `${count} příběhů`;
            }
        },
        'activity-tooltip-$count-branch': (count) => {
            if (singular(count)) {
                return `1 větev`;
            } else if (plural(count)) {
                return `${count} větve`;
            } else {
                return `${count} větví`;
            }
        },
        'activity-tooltip-$count-issue': (count) => {
            if (singular(count)) {
                return `1 problém`;
            } else if (plural(count)) {
                return `${count} problémy`;
            } else {
                return `${count} problémů`;
            }
        },
        'activity-tooltip-$count-member': (count) => {
            if (singular(count)) {
                return `1 změna členství`;
            } else if (plural(count)) {
                return `${count} změny členství`;
            } else {
                return `${count} změn členství`;
            }
        },
        'activity-tooltip-$count-merge': (count) => {
            if (singular(count)) {
                return `1 sloučení`;
            } else if (plural(count)) {
                return `${count} sloučení`;
            } else {
                return `${count} sloučeních`;
            }
        },
        'activity-tooltip-$count-merge-request': (count) => {
            if (singular(count)) {
                return `1 žádost o sloučení`;
            } else if (plural(count)) {
                return `${count} žádosti o sloučení`;
            } else {
                return `${count} žádostí o sloučení`;
            }
        },
        'activity-tooltip-$count-milestone': (count) => {
            if (singular(count)) {
                return `1 milník`;
            } else if (plural(count)) {
                return `${count} milníky`;
            } else {
                return `${count} milníků`;
            }
        },
        'activity-tooltip-$count-post': (count) => {
            if (singular(count)) {
                return `1 příspěvek`;
            } else if (plural(count)) {
                return `${count} příspěvky`;
            } else {
                return `${count} příspěvků`;
            }
        },
        'activity-tooltip-$count-push': (count) => {
            if (singular(count)) {
                return `1 přesun`;
            } else if (plural(count)) {
                return `${count} přesuny`;
            } else {
                return `${count} přesunů`;
            }
        },
        'activity-tooltip-$count-repo': (count) => {
            if (singular(count)) {
                return `1 změna repozitáře`;
            } else if (plural(count)) {
                return `${count} změny repozitářů`;
            } else {
                return `${count} změn repozitářů`;
            }
        },
        'activity-tooltip-$count-survey': (count) => {
            if (singular(count)) {
                return `1 anketa`;
            } else if (plural(count)) {
                return `${count} ankety`;
            } else {
                return `${count} anket`;
            }
        },
        'activity-tooltip-$count-tag': (count) => {
            if (singular(count)) {
                return `1 tag`;
            } else if (plural(count)) {
                return `${count} tagy`;
            } else {
                return `${count} tagů`;
            }
        },
        'activity-tooltip-$count-task-list': (count) => {
            if (singular(count)) {
                return `1 seznam úkolů`;
            } else if (plural(count)) {
                return `${count} seznamy úkolů`;
            } else {
                return `${count} seznamů úkolů`;
            }
        },
        'activity-tooltip-$count-wiki': (count) => {
            if (singular(count)) {
                return `1 úprava stránky wiki`;
            } else if (plural(count)) {
                return `${count} úpravy stránek wiki`;
            } else {
                return `${count} úprav stránek wiki`;
            }
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
        'nav-role-new': 'Nová role',
        'nav-roles': 'Role',
        'nav-server-new': 'Nový server',
        'nav-servers': 'Servery',
        'nav-settings': 'Nastavení',
        'nav-user-new': 'Nový uživatel',
        'nav-users': 'Uživatelé',

        'project-list-add': 'Přidat nový projekt',
        'project-list-cancel': 'Zrušit',
        'project-list-confirm-archive-$count': (count) => {
            if (singular(count)) {
                projects = `vybraný projekt`;
            } else if (plural(count)) {
                projects = `tyto ${count} projekty`;
            } else {
                projects = `těchto ${count} projektů`;
            }
            return `Opravdu chcete ${projects} archivovat?`;
        },
        'project-list-confirm-restore-$count': (count) => {
            if (singular(count)) {
                projects = `vybraný projekt`;
            } else if (plural(count)) {
                projects = `tyto ${count} projekty`;
            } else {
                projects = `těchto ${count} projektů`;
            }
            return `Opravdu chcete ${projects} obnovit?`;
        },
        'project-list-deleted': 'Smazány',
        'project-list-edit': 'Upravit seznam projektů',
        'project-list-save': 'Uložit seznam projektů',
        'project-list-status-archived': 'Archivovány',
        'project-list-status-deleted': 'Smazány',
        'project-list-title': 'Projekty',

        'project-summary-$title': (title) => {
            var text = 'Projekt';
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
        'project-summary-restore': 'Obnovit projekt',
        'project-summary-return': 'Návrat na seznam projektů',
        'project-summary-save': 'Uložit projekt',
        'project-summary-statistics': 'Aktivity',
        'project-summary-title': 'Název',

        'project-tooltip-$count-others': (count) => {
            if (singular(count)) {
                return `1 další`;
            } else if (plural(count)) {
                return `${count} další`;
            } else {
                return `${count} dalších`;
            }
        },

        'repo-list-cancel': 'Zrušit',
        'repo-list-confirm-remove-$count': (count) => {
            var repositories;
            if (singular(count)) {
                repositories = `tento repozitář`;
            } else if (plural(count)) {
                repositories = `tyto ${count} repozitáře`;
            } else {
                repositories = `těchto ${count} repozitářů`;
            }
            return `Opravdu chcete ${repositories} odstranit z projektu?`;
        },
        'repo-list-edit': 'Upravit seznam repozitářů',
        'repo-list-issue-tracker-enabled-false': '',
        'repo-list-issue-tracker-enabled-true': 'Zapnutý',
        'repo-list-save': 'Uložit seznam repozitářů',
        'repo-list-title': 'Úložiště',

        'repo-summary-$title': (title) => {
            var text = `Úložiště`;
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
        'repo-summary-restore': 'Obnovit repozitář',
        'repo-summary-return': 'Návrat na seznam repozitářů',
        'repo-summary-save': 'Uložit repozitář',
        'repo-summary-statistics': 'Aktivity',
        'repo-summary-title': 'Název',

        'repository-tooltip-$count': (count) => {
            if (singular(count)) {
                return `1 repozitář`;
            } else if (plural(count)) {
                return `${count} repozitáře`;
            } else {
                return `${count} repozitářů`;
            }
        },

        'role-list-add': 'Přidat novou roli',
        'role-list-cancel': 'Zrušit',
        'role-list-confirm-disable-$count': (count) => {
            var roles;
            if (singular(count)) {
                roles = `tuto roli`;
            } else if (plural(count)) {
                roles = `tyto ${count} role`;
            } else {
                roles = `těchto ${count} rolí`;
            }
            return `Opravdu chcete ${roles} deaktivovat?`;
        },
        'role-list-confirm-reactivate-$count': (count) => {
            var roles;
            if (singular(count)) {
                roles = `tuto roli`;
            } else if (plural(count)) {
                roles = `tyto ${count} role`;
            } else {
                roles = `těchto ${count} rolí`;
            }
            return `Opravdu chcete ${roles} reaktivovat?`;
        },
        'role-list-edit': 'Upravit seznam rolí',
        'role-list-save': 'Uložit seznam rolí',
        'role-list-status-deleted': 'Smazána',
        'role-list-status-disabled': 'Deaktivována',
        'role-list-title': 'Role',

        'role-summary-$title': (title) => {
            var text = 'Role';
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
            if (singular(count)) {
                return `1 další`;
            } else if (plural(count)) {
                return `${count} další`;
            } else {
                return `${count} dalších`;
            }
        },

        'server-list-add': 'Přidat nový server',
        'server-list-api-access-false': '',
        'server-list-api-access-true': 'Získaný',
        'server-list-cancel': 'Zrušit',
        'server-list-confirm-disable-$count': (count) => {
            var servers;
            if (singular(count)) {
                servers = `tento server`;
            } else if (plural(count)) {
                servers = `tyto ${count} servery`;
            } else {
                servers = `těchto ${count} serverů`;
            }
            return `Opravdu chcete ${servers} deaktivovat?`;
        },
        'server-list-confirm-reactivate-$count': (count) => {
            var servers;
            if (singular(count)) {
                servers = `tento server`;
            } else if (plural(count)) {
                servers = `tyto ${count} servery`;
            } else {
                servers = `těchto ${count} serverů`;
            }
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
            var text = `Přihlásit se`;
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

        'table-heading-api-access': 'Přístup k API',
        'table-heading-date-range': 'Aktivní období',
        'table-heading-email': 'Emailová adresa',
        'table-heading-issue-tracker': 'Bugtracker',
        'table-heading-last-modified': 'Změněno',
        'table-heading-last-month': 'Minulý měsíc',
        'table-heading-name': 'Jméno',
        'table-heading-oauth': 'Ověření OAuth',
        'table-heading-projects': 'Projekty',
        'table-heading-repositories': 'Repozitáře',
        'table-heading-roles': 'Role',
        'table-heading-server': 'Server',
        'table-heading-this-month': 'Tento měsíc',
        'table-heading-title': 'Název',
        'table-heading-to-date': 'K datu',
        'table-heading-type': 'Typ',
        'table-heading-username': 'Uživatelské jméno',
        'table-heading-users': 'Uživatelé',

        'task-$seconds': (seconds) => {
            if (singular(count)) {
                return `1 sekunda`;
            } else if (plural(count)) {
                return `${count} sekundy`;
            } else {
                return `${count} sekund`;
            }
        },
        'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
            var comments;
            if (singular(count)) {
                comments = `1 komentář`;
            } else if (plural(count)) {
                comments = `${count} komentáře`;
            } else {
                comments = `${count} komentářů`;
            }
            return `Importováno ${comments} k commitu z repozitářu „${repo}”`;
        },
        'task-imported-$count-events-from-$repo': (count, repo) => {
            var events;
            if (singular(count)) {
                events = `1 událost`;
            } else if (plural(count)) {
                events = `${count} události`;
            } else {
                events = `${count} událostí`;
            }
            return `Importováno ${events} z repozitářu „${repo}”`;
        },
        'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
            var comments;
            if (singular(count)) {
                comments = `1 komentář`;
            } else if (plural(count)) {
                comments = `${count} komentáře`;
            } else {
                comments = `${count} komentářů`;
            }
            return `Importováno ${comments} k problému from „${repo}”`;
        },
        'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
            var comments;
            if (singular(count)) {
                comments = `1 komentář`;
            } else if (plural(count)) {
                comments = `${count} komentáře`;
            } else {
                comments = `${count} komentářů`;
            }
            return `Importováno ${comments} k požadavku na sloučení z repozitářu „${repo}”`;
        },
        'task-imported-$count-repos': (count) => {
            var repos;
            if (singular(count)) {
                repos = `1 repozitář`;
            } else if (plural(count)) {
                repos = `${count} repozitáře`;
            } else {
                repos = `${count} repozitářů`;
            }
            return `Importováno ${repos}`;
        },
        'task-imported-$count-users': (count) => {
            var users;
            if (singular(count)) {
                users = `1 uživatel`;
            } else if (plural(count)) {
                users = `${count} uživatelé`;
            } else {
                users = `${count} uživatelů`;
            }
            return `Importováno ${users}`;
        },
        'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
            var commits;
            if (singular(count)) {
                commits = `1 commitu`;
            } else if (plural(count)) {
                commits = `${count} commitů`;
            } else {
                commits = `${count} commitů`;
            }
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
            var hooks;
            if (singular(count)) {
                hooks = `1 hák`;
            } else if (plural(count)) {
                hooks = `${count} háki`;
            } else {
                hooks = `${count} háků`;
            }
            return `Instalováno ${hooks}`;
        },
        'task-installing-hooks': 'Instalování háků',
        'task-removed-$count-hooks': (count) => {
            var hooks;
            if (singular(count)) {
                hooks = `1 hák`;
            } else if (plural(count)) {
                hooks = `${count} háki`;
            } else {
                hooks = `${count} háků`;
            }
            return `Odinstalováno ${hooks}`;
        },
        'task-removed-$count-repos': (count) => {
            var repos;
            if (singular(count)) {
                repos = `1 repozitář`;
            } else if (plural(count)) {
                repos = `${count} repozitáře`;
            } else {
                repos = `${count} repozitářů`;
            }
            return `Odstraněno ${repos}`;
        },
        'task-removed-$count-users': (count) => {
            var users;
            if (singular(count)) {
                users = `1 uživatel`;
            } else if (plural(count)) {
                users = `${count} uživatelé`;
            } else {
                users = `${count} uživatelů`;
            }
            return `Odstraněno ${users}`;
        },
        'task-removing-hooks': 'Odinstalování háků',
        'task-updated-$count-repos': (count) => {
            var repos;
            if (singular(count)) {
                repos = `1 repozitář`;
            } else if (plural(count)) {
                repos = `${count} repozitáře`;
            } else {
                repos = `${count} repozitářů`;
            }
            return `Aktualizováno ${repos}`;
        },
        'task-updated-$count-users': (count) => {
            var users;
            if (singular(count)) {
                users = `1 uživatel`;
            } else if (plural(count)) {
                users = `${count} uživatelé`;
            } else {
                users = `${count} uživatelů`;
            }
            return `Aktualizováno ${users}`;
        },

        'text-field-placeholder-none': 'žádné',

        'tooltip-$first-and-$tooltip': (first, tooltip) => {
            return [ first, ' a ', tooltip ];
        },
        'tooltip-more': 'Více',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 souboru` : `${count} souborů`;
            return `Nahrávání ${files}, zbývá ${size}`;
        },

        'user-list-add': 'Přidat nového uživatele',
        'user-list-approve-all': 'Schválit všechny požadavky',
        'user-list-cancel': 'Zrušit',
        'user-list-confirm-disable-$count': (count) => {
            var accounts;
            if (singular(count)) {
                accounts = `tohoto uživatele`;
            } else if (plural(count)) {
                accounts = `tyto ${count} uživatele`;
            } else {
                accounts = `těchto ${count} uživatelů`;
            }
            return `Opravdu chcete ${accounts} deaktivovat?`
        },
        'user-list-confirm-reactivate-$count': (count) => {
            var accounts;
            if (singular(count)) {
                accounts = `tohoto uživatele`;
            } else if (plural(count)) {
                accounts = `tyto ${count} uživatele`;
            } else {
                accounts = `těchto ${count} uživatelů`;
            }
            return `Opravdu chcete ${accounts} reaktivovat?`
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
            var text = 'Uživatel';
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
            var text = 'Člen';
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
            if (singular(count)) {
                return `1 uživatel`;
            } else if (plural(count)) {
                return `${count} uživatelé`;
            } else {
                return `${count} uživatelů`;
            }
        },

        'validation-duplicate-project-name': 'Projekt s tímto identifikátorem již existuje',
        'validation-duplicate-role-name': 'Role s tímto identifikátorem již existuje',
        'validation-duplicate-server-name': 'Server s tímto identifikátorem již existuje',
        'validation-duplicate-user-name': 'Uživatel s tímto uživatelským jménem již existuje',
        'validation-illegal-project-name': 'Identifikátor projektu nemůže být "global", "admin", "public" nebo "srv"',
        'validation-localhost-is-wrong': '"localhost" není platné',
        'validation-password-for-admin-only': 'Pouze administrátoři se mohou přihlásit pomocí hesla',
        'validation-required': 'Povinný',

        'welcome': 'Vítejte!',
    };
};

function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n === 2 || n === 3 || n === 4) {
        return true;
    }
    return false;
}
