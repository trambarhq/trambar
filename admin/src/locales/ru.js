import 'moment/locale/ru';
import {
    cardinal,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/russian';

const phrases = {
    'action-badge-add': 'добавить',
    'action-badge-approve': 'утверждать',
    'action-badge-archive': 'архивировать',
    'action-badge-disable': 'отключить',
    'action-badge-reactivate': 'реактивировать',
    'action-badge-remove': 'удалить',
    'action-badge-restore': 'восстановить',

    'activity-chart-legend-branch': 'Ветки',
    'activity-chart-legend-issue': 'Отчёты об ошибке',
    'activity-chart-legend-member': 'Изменения членства',
    'activity-chart-legend-merge': 'Слияния',
    'activity-chart-legend-merge-request': 'Запросы слияния',
    'activity-chart-legend-milestone': 'Вехи',
    'activity-chart-legend-post': 'Сообщения',
    'activity-chart-legend-push': 'Помещения',
    'activity-chart-legend-repo': 'Изменения репозитория',
    'activity-chart-legend-survey': 'Опросы',
    'activity-chart-legend-tag': 'теги',
    'activity-chart-legend-task-list': 'Списки задач',
    'activity-chart-legend-wiki': 'Правки wiki',

    'activity-tooltip-$count': (count) => {
        return cardinal(count, 'рассказ', 'рассказа', 'рассказов');
    },
    'activity-tooltip-$count-branch': (count) => {
        return cardinal(count, 'ветка', 'ветки', 'веток');
    },
    'activity-tooltip-$count-issue': (count) => {
        return cardinal(count, 'отчёт', 'отчёта', 'отчётов');
    },
    'activity-tooltip-$count-member': (count) => {
        return cardinal(count, 'изменение членства', 'изменения членства', 'изменений членства');
    },
    'activity-tooltip-$count-merge': (count) => {
        return cardinal(count, 'слияние', 'слияния', 'слияний');
    },
    'activity-tooltip-$count-merge-request': (count) => {
        return cardinal(count, 'запрос слияния', 'запроса слияния', 'запросов слияния');
    },
    'activity-tooltip-$count-milestone': (count) => {
        return cardinal(count, 'веха', 'вехи', 'вех');
    },
    'activity-tooltip-$count-post': (count) => {
        return cardinal(count, 'сообщение', 'сообщений', 'сообщений');
    },
    'activity-tooltip-$count-push': (count) => {
        return cardinal(count, 'помещение', 'помещения', 'помещений');
    },
    'activity-tooltip-$count-repo': (count) => {
        return cardinal(count, 'изменение репозитория', 'изменения репозитория', 'изменений репозитория');
    },
    'activity-tooltip-$count-survey': (count) => {
        return cardinal(count, 'опрос', 'опроса', 'опросов');
    },
    'activity-tooltip-$count-tag': (count) => {
        return cardinal(count, 'тег', 'теги', 'тегов');
    },
    'activity-tooltip-$count-task-list': (count) => {
        return cardinal(count, 'список задач', 'списка задач', 'списков задач');
    },
    'activity-tooltip-$count-wiki': (count) => {
        return cardinal(count, 'правка wiki', 'правки wiki', 'правок wiki');
    },

    'app-name': 'Трамбар',
    'app-title': 'Трамбар - Административная консоль',

    'confirmation-cancel': 'Отмена',
    'confirmation-confirm': 'Подтвердить',
    'confirmation-data-loss': 'Вы действительно хотите отказаться от внесенных изменений?',

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

    'image-album-cancel': 'Отмена',
    'image-album-done': 'OK',
    'image-album-manage': 'Управлять альбомом',
    'image-album-remove': 'Удалить выбранное',
    'image-album-select': 'Использовать выбранную',
    'image-album-upload': 'Загрузить файлы',

    'image-cropping-cancel': 'Отмена',
    'image-cropping-select': 'OK',

    'image-selector-choose-from-album': 'Выбрать из альбома',
    'image-selector-crop-image': 'Отрегулируйте размер/положение',
    'image-selector-upload-file': 'Загрузить картинку',

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
    'member-list-add': 'Добавить пользователя',
    'member-list-approve-all': 'Утвердить все запросы',
    'member-list-cancel': 'Отмена',
    'member-list-edit': 'Редактировать список членов',
    'member-list-reject-all': 'Отклонить все запросы',
    'member-list-save': 'Сохранить список членов',
    'member-list-status-non-member': 'Не член',
    'member-list-status-pending': 'Запрос ожидает выполнения',
    'member-list-title': 'Члены',

    'nav-member-new': 'Новый член',
    'nav-members': 'Члены',
    'nav-project-new': 'Новый проект',
    'nav-projects': 'Проекты',
    'nav-repositories': 'Репозитория',
    'nav-role-new': 'Новый роль',
    'nav-roles': 'Роли',
    'nav-server-new': 'Новый сервер',
    'nav-servers': 'Серверы',
    'nav-settings': 'Настройки',
    'nav-user-new': 'Новый пользователь',
    'nav-users': 'Пользователи',

    'project-list-add': 'Добавить проект',
    'project-list-cancel': 'Отмена',
    'project-list-confirm-archive-$count': (count) => {
        let projects = cardinal(count, 'выбранный проект', [ 'эти', 'проекта' ], [ 'эти', 'проектов' ], true);
        return `Вы действительно хотите архивировать ${projects}?`;
    },
    'project-list-confirm-restore-$count': (count) => {
        let projects = cardinal(count, 'выбранный проект', [ 'эти', 'проекта' ], [ 'эти', 'проектов' ], true);
        return `Вы действительно хотите восстановить ${projects}?`;
    },
    'project-list-deleted': 'Удаленный',
    'project-list-edit': 'Редактировать список проектов',
    'project-list-save': 'Сохранить список проектов',
    'project-list-status-archived': 'Архивированный',
    'project-list-status-deleted': 'Удаленный',
    'project-list-title': 'Проекты',

    'project-summary-$title': (title) => {
        let text = 'Проект';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'project-summary-access-control': 'Контроль доступа',
    'project-summary-access-control-member-only': 'Содержание проекта ограничено только членами',
    'project-summary-access-control-non-member-comment': 'Не члены могут комментировать рассказы',
    'project-summary-access-control-non-member-view': 'Не члены могут просматривать содержимое',
    'project-summary-add': 'Добавить проект',
    'project-summary-archive': 'Архивировать проект',
    'project-summary-cancel': 'Отмена',
    'project-summary-confirm-archive': 'Вы действительно хотите архивировать этот проект?',
    'project-summary-confirm-delete': 'Вы действительно хотите удалить этот проект?',
    'project-summary-confirm-restore': 'Вы действительно хотите восстановить этот проект?',
    'project-summary-delete': 'Удалить проект',
    'project-summary-description': 'Описание',
    'project-summary-edit': 'Редактировать проект',
    'project-summary-emblem': 'Эмблема',
    'project-summary-name': 'Идентификатор',
    'project-summary-new-members': 'Новые члены',
    'project-summary-new-members-auto-accept-guest': 'Гостевые пользователи принимаются автоматически',
    'project-summary-new-members-auto-accept-user': 'Постоянные пользователи принимаются автоматически',
    'project-summary-new-members-join-guest': 'Гостевые пользователи могут запросить присоединиться к проекту',
    'project-summary-new-members-join-user': 'Постоянные пользователи могут запросить присоединиться к проекту',
    'project-summary-new-members-manual': 'Участники добавляются вручную',
    'project-summary-other-actions': 'Другие действия',
    'project-summary-restore': 'Восстановить проект',
    'project-summary-return': 'Вернуться в список проектов',
    'project-summary-save': 'Сохранить проект',
    'project-summary-statistics': 'Деятельность',
    'project-summary-title': 'Название',

    'project-tooltip-$count-others': (count) => {
        return cardinal(count, 'другой', 'других', 'других');
    },

    'repo-list-cancel': 'Отмена',
    'repo-list-confirm-remove-$count': (count) => {
        let repositories = cardinal(count, 'выбранный репозиторий', [ 'эти', 'репозитория' ], [ 'эти', 'репозиториев' ], true);
        return `Вы действительно хотите удалить ${repositories} из проекта?`;
    },
    'repo-list-edit': 'Редактировать список репозитория',
    'repo-list-issue-tracker-enabled-false': '',
    'repo-list-issue-tracker-enabled-true': 'Включен',
    'repo-list-save': 'Сохранить список репозитория',
    'repo-list-title': 'Репозитория',

    'repo-summary-$title': (title) => {
        let text = `Репозиторий`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'repo-summary-cancel': 'Отмена',
    'repo-summary-confirm-remove': 'Вы действительно хотите удалить этот репозиторий из проекта?',
    'repo-summary-confirm-restore': 'Вы действительно хотите снова добавить этот репозиторий в проект?',
    'repo-summary-edit': 'Редактировать репозиторий',
    'repo-summary-gitlab-name': 'Название проекта GitLab',
    'repo-summary-issue-tracker': 'Отслеживание ошибок',
    'repo-summary-issue-tracker-disabled': 'Отключен',
    'repo-summary-issue-tracker-enabled': 'Включен',
    'repo-summary-remove': 'Удалить репозиторий',
    'repo-summary-restore': 'Восстановить репозиторий',
    'repo-summary-return': 'Вернуться в список репозитория',
    'repo-summary-save': 'Сохранить репозиторий',
    'repo-summary-statistics': 'Деятельность',
    'repo-summary-title': 'Название',

    'repository-tooltip-$count': (count) => {
        return cardinal(count, 'репозиторий', 'репозитория', 'репозиториев');
    },

    'role-list-add': 'Добавить роль',
    'role-list-cancel': 'Отмена',
    'role-list-confirm-disable-$count': (count) => {
        let roles = cardinal(count, 'эту роль', [ 'эти', 'роли' ], [ 'эти', 'ролей' ], true);
        return `Вы действительно хотите отключить ${roles}?`;
    },
    'role-list-confirm-reactivate-$count': (count) => {
        let roles = cardinal(count, 'эту роль', [ 'эти', 'роли' ], [ 'эти', 'ролей' ], true);
        return `Вы действительно хотите реактивировать ${roles}?`
    },
    'role-list-edit': 'Редактировать список ролей',
    'role-list-save': 'Сохранить список ролей',
    'role-list-status-deleted': 'Удаленный',
    'role-list-status-disabled': 'Отключен',
    'role-list-title': 'Роли',

    'role-summary-$title': (title) => {
        let text = 'Роль';
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'role-summary-add': 'Добавить роль',
    'role-summary-cancel': 'Отмена',
    'role-summary-confirm-delete': 'Вы действительно хотите удалить эту роль?',
    'role-summary-confirm-disable': 'Вы действительно хотите отключить эту роль?',
    'role-summary-confirm-reactivate': 'Вы действительно хотите реактивировать эту роль?',
    'role-summary-delete': 'Удалить роль',
    'role-summary-description': 'Описание',
    'role-summary-disable': 'Отключить роль',
    'role-summary-edit': 'Редактировать роль',
    'role-summary-name': 'Идентификатор',
    'role-summary-rating': 'Приоритет рассказов',
    'role-summary-rating-high': 'Высокий',
    'role-summary-rating-low': 'Низкий',
    'role-summary-rating-normal': 'Нормальный',
    'role-summary-rating-very-high': 'Очень высокий',
    'role-summary-rating-very-low': 'Очень низкий',
    'role-summary-reactivate': 'Реактивировать роль',
    'role-summary-return': 'Вернуться в список ролей',
    'role-summary-save': 'Сохранить роль',
    'role-summary-title': 'Название',
    'role-summary-users': 'Пользователи',

    'role-tooltip-$count-others': (count) => {
        return cardinal(count, 'другая', 'другие', 'других');
    },

    'server-list-add': 'Добавить сервер',
    'server-list-api-access-false': '',
    'server-list-api-access-true': 'Получен',
    'server-list-cancel': 'Отмена',
    'server-list-confirm-disable-$count': (count) => {
        let servers = cardinal(count, 'выбранный сервер', [ 'эти', 'сервера' ], [ 'эти', 'серверов' ], true);
        return `Вы действительно хотите отключить ${servers}?`
    },
    'server-list-confirm-reactivate-$count': (count) => {
        let servers = cardinal(count, 'выбранный сервер', [ 'эти', 'сервера' ], [ 'эти', 'серверов' ], true);
        return `Вы действительно хотите реактивировать ${servers}?`
    },
    'server-list-edit': 'Редактировать список серверов',
    'server-list-oauth-false': '',
    'server-list-oauth-true': 'Включен',
    'server-list-save': 'Сохранить список серверов',
    'server-list-status-deleted': 'Удаленный',
    'server-list-status-disabled': 'Отключен',
    'server-list-title': 'Серверы',

    'server-summary-acquire': 'Получить доступ к API',
    'server-summary-activities': 'Деятельность',
    'server-summary-add': 'Добавить сервер',
    'server-summary-api-access': 'Доступ к API',
    'server-summary-api-access-acquired': 'Получен административный доступ',
    'server-summary-api-access-not-applicable': 'Непригодный',
    'server-summary-api-access-pending': 'Ожидание действия пользователя',
    'server-summary-cancel': 'Отмена',
    'server-summary-confirm-delete': 'Вы действительно хотите удалить этот сервер?',
    'server-summary-confirm-disable': 'Вы действительно хотите отключить этот сервер?',
    'server-summary-confirm-reactivate': 'Вы действительно хотите реактивировать этот сервер?',
    'server-summary-delete': 'Удалить сервер',
    'server-summary-disable': 'Отключить сервер',
    'server-summary-edit': 'Редактировать сервер',
    'server-summary-gitlab-admin': 'Администратор GitLab',
    'server-summary-gitlab-external-user': 'Внешний пользователь GitLab',
    'server-summary-gitlab-regular-user': 'Регулярный пользователь GitLab',
    'server-summary-member-$name': (name) => {
        return `Сервер: ${name}`;
    },
    'server-summary-name': 'Идентификатор',
    'server-summary-new-user': 'Новый пользователь',
    'server-summary-new-users': 'Новые пользователи',
    'server-summary-oauth-app-id': 'ID приложения',
    'server-summary-oauth-app-key': 'Ключ приложения',
    'server-summary-oauth-app-secret': 'Секрет приложения',
    'server-summary-oauth-application-id': 'ID приложения',
    'server-summary-oauth-application-secret': 'Секрет приложения',
    'server-summary-oauth-callback-url': 'URL обратного вызова',
    'server-summary-oauth-client-id': 'ID клиента',
    'server-summary-oauth-client-secret': 'Секрет клиента',
    'server-summary-oauth-deauthorize-callback-url': 'URL обратного вызова для деавторизации',
    'server-summary-oauth-gitlab-url': 'URL сервера GitLab',
    'server-summary-oauth-redirect-uri': 'Перенаправление URI',
    'server-summary-oauth-redirect-url': 'Перенаправление URL',
    'server-summary-oauth-site-url': 'URL сайта',
    'server-summary-privacy-policy-url': 'URL политики конфиденциальности',
    'server-summary-reactivate': 'Реактивировать сервер',
    'server-summary-return': 'Вернуться в список серверов',
    'server-summary-role-none': 'Не назначать роли новым пользователям',
    'server-summary-roles': 'Назначение ролей',
    'server-summary-save': 'Сохранить сервер',
    'server-summary-system-address-missing': 'Адрес системы не был установлен',
    'server-summary-terms-and-conditions-url': 'Условия использования URL',
    'server-summary-test-oauth': 'Протестировать интеграцию OAuth',
    'server-summary-title': 'Название',
    'server-summary-type': 'Тип сервера',
    'server-summary-user-automatic-approval': 'Утверждать новых пользователей автоматически',
    'server-summary-user-import-disabled': 'Не регистрировать новых пользователей',
    'server-summary-user-import-gitlab-admin-disabled': 'Не импортируйте администраторов GitLab',
    'server-summary-user-import-gitlab-external-user-disabled': 'Не импортировать внешних пользователей GitLab',
    'server-summary-user-import-gitlab-user-disabled': 'Не импортировать пользователей GitLab',
    'server-summary-user-type-admin': 'Администратор',
    'server-summary-user-type-guest': 'Гостевой пользователь',
    'server-summary-user-type-moderator': 'Модератор',
    'server-summary-user-type-regular': 'Постоянный пользователь',
    'server-summary-whitelist': 'Белый список адресов электронной почты',

    'server-type-dropbox': 'Dropbox',
    'server-type-facebook': 'Facebook',
    'server-type-github': 'GitHub',
    'server-type-gitlab': 'GitLab',
    'server-type-google': 'Google',
    'server-type-windows': 'Windows Live',

    'settings-background-image': 'Изображение на заднем плане',
    'settings-cancel': 'Отмена',
    'settings-company-name': 'Название компании',
    'settings-edit': 'Редактировать настройки',
    'settings-input-languages': 'Языки ввода',
    'settings-push-relay': 'Реле сообщений push',
    'settings-save': 'Сохранить настройки',
    'settings-site-address': 'URL-адрес',
    'settings-site-description': 'Описание',
    'settings-site-title': 'Название сайта',
    'settings-title': 'Настройки',

    'sign-in-$title': (title) => {
        let text = `Войти`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'sign-in-error-access-denied': 'Запрос отклонен',
    'sign-in-error-account-disabled': 'В настоящее время отключена учетная запись',
    'sign-in-error-existing-users-only': 'Доступ к этой системе может получить только уполномоченный персонал',
    'sign-in-error-restricted-area': 'Пользователь не администратор',
    'sign-in-oauth': 'Войти через OAuth',
    'sign-in-password': 'Пароль:',
    'sign-in-problem-incorrect-username-password': 'Неверное имя пользователя или пароль',
    'sign-in-problem-no-support-for-username-password': 'Система не принимает пароль',
    'sign-in-problem-unexpected-error': 'Неожиданная ошибка',
    'sign-in-submit': 'Отправить',
    'sign-in-username': 'Имя пользователя:',

    'sign-off-menu-sign-off': 'Выйти',

    'table-heading-api-access': 'Доступ к API',
    'table-heading-date-range': 'Активный период',
    'table-heading-email': 'Адрес эл. почты',
    'table-heading-issue-tracker': 'Отслеживание ошибок',
    'table-heading-last-modified': 'Изменено',
    'table-heading-last-month': 'Прошлый месяц',
    'table-heading-name': 'Имя и фамилия',
    'table-heading-oauth': 'Аутентификация OAuth',
    'table-heading-projects': 'Проекты',
    'table-heading-repositories': 'Репозитория',
    'table-heading-roles': 'Роли',
    'table-heading-server': 'Сервер',
    'table-heading-this-month': 'Этот месяц',
    'table-heading-title': 'Название',
    'table-heading-to-date': 'До сих пор',
    'table-heading-type': 'Тип',
    'table-heading-username': 'Имя пользователя',
    'table-heading-users': 'Пользователи',

    'task-$seconds': (seconds) => {
        return cardinal(seconds, 'секунда', 'секунды', 'секунд');
    },
    'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'комментарий', 'комментария', 'комментариев');
        return `Импортировано из репозитория «${repo}» ${comments} к коммиту`;
    },
    'task-imported-$count-events-from-$repo': (count, repo) => {
        let events = cardinal(count, 'событие', 'события', 'событий');
        return `Импортировано из репозитория «${repo}» ${events}`;
    },
    'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'комментарий', 'комментария', 'комментариев');
        return `Импортировано из репозитория «${repo}» ${comments} к отчёту об ошибке`;
    },
    'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
        let comments = cardinal(count, 'комментарий', 'комментария', 'комментариев');
        return `Импортировано из репозитория «${repo}» ${comments} к запросу слияния`;
    },
    'task-imported-$count-repos': (count) => {
        let repos = cardinal(count, 'репозиторий', 'репозитория', 'репозиториев');
        return `Импортировано ${repos}`;
    },
    'task-imported-$count-users': (count) => {
        let users = cardinal(count, 'пользователь', 'пользователя', 'пользователей');
        return `Импортировано ${users}`;
    },
    'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
        let commits = cardinal(count, 'коммитом', 'коммитами', 'коммитами');
        return `Импортировано из ветки «${branch}» репозитория «${repo}» помещения с ${commits}`;
    },
    'task-importing-commit-comments-from-$repo': (repo) => {
        return `Импортирования комментариев к коммиту из репозитория «${repo}»`;
    },
    'task-importing-events-from-$repo': (repo) => {
        return `Импортирования событий из репозитория «${repo}»`;
    },
    'task-importing-issue-comments-from-$repo': (repo) => {
        return `Импортирования комментариев из репозитория «${repo}» к отчётом об ошибке`;
    },
    'task-importing-merge-request-comments-from-$repo': (repo) => {
        return `Импортирования комментариев из репозитория «${repo}» к запросом слияния`;
    },
    'task-importing-push-from-$repo': (repo) => {
        return `Импортирования помещения из репозитория «${repo}»`;
    },
    'task-importing-repos': 'Импортирования репозиториев',
    'task-importing-users': 'Импортирования пользователей',
    'task-installed-$count-hooks': (count) => {
        let hooks = cardinal(count, 'обратный вызов', 'обратного вызова', 'обратных вызовов');
        return `Установлен ${hooks}`;
    },
    'task-installing-hooks': 'Установка обратных вызовов',
    'task-removed-$count-hooks': (count) => {
        let hooks = cardinal(count, 'обратный вызов', 'обратного вызова', 'обратных вызовов');
        return `Удален ${hooks}`;
    },
    'task-removed-$count-repos': (count) => {
        let repos = cardinal(count, 'репозиторий', 'репозитория', 'репозиториев');
        return `Удален ${repos}`;
    },
    'task-removed-$count-users': (count) => {
        let users = cardinal(count, 'пользователь', 'пользователя', 'пользователей');
        return `Удален ${users}`;
    },
    'task-removing-hooks': 'Удаление обратных вызовов',
    'task-updated-$count-repos': (count) => {
        let repos = cardinal(count, 'репозиторий', 'репозитория', 'репозиториев');
        return `Обновлено ${repos}`;
    },
    'task-updated-$count-users': (count) => {
        let users = cardinal(count, 'пользователь', 'пользователя', 'пользователей');
        return `Обновлено ${users}`;
    },

    'text-field-placeholder-none': 'нет',

    'tooltip-$first-and-$tooltip': (first, tooltip) => {
        return [ first, ' и ', tooltip ];
    },
    'tooltip-more': 'Более',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = cardinal(count, 'файла', 'файлов', 'файлов');
        return `Загрузка ${files}, оставшихся ${size}`;
    },

    'user-list-add': 'Добавить пользователя',
    'user-list-approve-all': 'Утвердить все запросы',
    'user-list-cancel': 'Отмена',
    'user-list-confirm-disable-$count': (count) => {
        let users = cardinal(count, 'выбранного пользователя', [ 'этих', 'пользователей' ], [ 'этих', 'пользователей' ], true);
        return `Вы действительно хотите отключить ${users}?`
    },
    'user-list-confirm-reactivate-$count': (count) => {
        let users = cardinal(count, 'выбранного пользователя', [ 'этих', 'пользователей' ], [ 'этих', 'пользователей' ], true);
        return `Вы действительно хотите реактивировать ${users}?`
    },
    'user-list-edit': 'Редактировать список пользователей',
    'user-list-reject-all': 'Отклонить все запросы',
    'user-list-save': 'Сохранить список пользователей',
    'user-list-status-deleted': 'Удаленный',
    'user-list-status-disabled': 'Отключен',
    'user-list-status-pending': 'Ожидание утверждения',
    'user-list-title': 'Пользователи',
    'user-list-type-admin': 'Aдминистратор',
    'user-list-type-guest': 'Гостевой пользователь',
    'user-list-type-moderator': 'Модератор',
    'user-list-type-regular': 'Постоянный пользователь',
    'user-summary-$name': (name) => {
        let text = 'Пользователь';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-add': 'Добавить пользователя',
    'user-summary-cancel': 'Отмена',
    'user-summary-confirm-delete': 'Вы действительно хотите удалить этого пользователя?',
    'user-summary-confirm-disable': 'Вы действительно хотите отключить этого пользователя?',
    'user-summary-confirm-reactivate': 'Вы действительно хотите реактивировать этого пользователя?',
    'user-summary-delete': 'Удалить пользователя',
    'user-summary-disable': 'Отключить пользователя',
    'user-summary-edit': 'Редактировать пользователя',
    'user-summary-email': 'Адрес электронной почты',
    'user-summary-github': 'URL профиля GitHub',
    'user-summary-gitlab': 'URL профиля GitLab',
    'user-summary-ichat': 'Имя пользователя iChat',
    'user-summary-linkedin': 'URL профиля LinkedIn',
    'user-summary-member-$name': (name) => {
        let text = 'Член';
        if (name) {
            text += `: ${name}`;
        }
        return text;
    },
    'user-summary-member-edit': 'Редактировать члена',
    'user-summary-member-return': 'Вернуться в список членов',
    'user-summary-member-save': 'Сохранить члена',
    'user-summary-name': 'Имя и фамилия',
    'user-summary-phone': 'Номер телефона',
    'user-summary-profile-image': 'Изображение профиля',
    'user-summary-reactivate': 'Реактивировать пользователя',
    'user-summary-return': 'Вернуться в список пользователей',
    'user-summary-role-none': 'Нет',
    'user-summary-roles': 'Роли',
    'user-summary-save': 'Сохранить пользователя',
    'user-summary-skype': 'Имя пользователя Skype',
    'user-summary-slack': 'ID пользователя Slack',
    'user-summary-slack-team': 'ID команды Slack',
    'user-summary-social-links': 'Социальные сети',
    'user-summary-stackoverflow': 'URL профиля StackOverflow',
    'user-summary-statistics': 'Деятельность',
    'user-summary-twitter': 'Имя пользователя Twitter',
    'user-summary-type': 'Тип пользователя',
    'user-summary-type-admin': 'Администратор',
    'user-summary-type-guest': 'Гостевой пользователь',
    'user-summary-type-moderator': 'Модератор',
    'user-summary-type-regular': 'Постоянный пользователь',
    'user-summary-username': 'Имя пользователя',

    'user-tooltip-$count': (count) => {
        return cardinal(count, 'пользователь', 'пользователя', 'пользователей');
    },

    'validation-duplicate-project-name': 'Проект с этим идентификатором уже существует',
    'validation-duplicate-role-name': 'Роль с этим идентификатором уже существует',
    'validation-duplicate-server-name': 'Сервер с этим идентификатором уже существует',
    'validation-duplicate-user-name': 'Пользователь с таким именем уже существует',
    'validation-illegal-project-name': 'Идентификатор проекта не может быть «global», «admin», «public» или «srv»',
    'validation-localhost-is-wrong': '«localhost» недействителен',
    'validation-password-for-admin-only': 'Только администраторы могут войти с помощью пароля',
    'validation-required': 'Необходимые',

    'welcome': 'Добро пожаловать!',
};

export {
    phrases,
    genderize,
};
