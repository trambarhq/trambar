import 'moment/locale/ru';
import {
  cardinal,
  genderize,
} from 'common/locale/grammars/russian.mjs';

const phrases = {
  'action-badge-add': 'добавить',
  'action-badge-approve': 'утверждать',
  'action-badge-archive': 'архивировать',
  'action-badge-deselect': 'отменить',
  'action-badge-disable': 'отключить',
  'action-badge-reactivate': 'реактивировать',
  'action-badge-remove': 'удалить',
  'action-badge-restore': 'восстановить',
  'action-badge-select': 'выбрать',

  'activity-chart-legend-branch': 'Ветки',
  'activity-chart-legend-issue': 'Отчёты об ошибке',
  'activity-chart-legend-member': 'Изменения членства',
  'activity-chart-legend-merge': 'Слияния',
  'activity-chart-legend-merge-request': 'Запросы слияния',
  'activity-chart-legend-milestone': 'Вехи',
  'activity-chart-legend-post': 'Сообщения',
  'activity-chart-legend-push': 'Помещения',
  'activity-chart-legend-repo': 'Изменения репозитория',
  'activity-chart-legend-snapshot': 'Ревизии сайта',
  'activity-chart-legend-survey': 'Опросы',
  'activity-chart-legend-tag': 'теги',
  'activity-chart-legend-task-list': 'Списки задач',
  'activity-chart-legend-website-traffic': 'Отчеты о трафике',
  'activity-chart-legend-wiki': 'Правки wiki',

  'activity-tooltip-$count': (count) => {
    return cardinal(count, '1 рассказ', '2 рассказа', '5 рассказов');
  },
  'activity-tooltip-$count-branch': (count) => {
    return cardinal(count, '1 ветка', '2 ветки', '5 веток');
  },
  'activity-tooltip-$count-issue': (count) => {
    return cardinal(count, '1 отчёт', '2 отчёта', '5 отчётов');
  },
  'activity-tooltip-$count-member': (count) => {
    return cardinal(count, '1 изменение членства', '2 изменения членства', '5 изменений членства');
  },
  'activity-tooltip-$count-merge': (count) => {
    return cardinal(count, '1 слияние', '2 слияния', '5 слияний');
  },
  'activity-tooltip-$count-merge-request': (count) => {
    return cardinal(count, '1 запрос слияния', '2 запроса слияния', '5 запросов слияния');
  },
  'activity-tooltip-$count-milestone': (count) => {
    return cardinal(count, '1 веха', '2 вехи', '5 вех');
  },
  'activity-tooltip-$count-post': (count) => {
    return cardinal(count, '1 сообщение', '2 сообщений', '5 сообщений');
  },
  'activity-tooltip-$count-push': (count) => {
    return cardinal(count, '1 помещение', '2 помещения', '5 помещений');
  },
  'activity-tooltip-$count-repo': (count) => {
    return cardinal(count, '1 изменение репозитория', '2 изменения репозитория', '5 изменений репозитория');
  },
  'activity-tooltip-$count-snapshot': (count) => {
    return cardinal(count, '1 ревизия сайта', '2 ревизии сайта', '5 ревизий сайта');
  },
  'activity-tooltip-$count-survey': (count) => {
    return cardinal(count, '1 опрос', '2 опроса', '5 опросов');
  },
  'activity-tooltip-$count-tag': (count) => {
    return cardinal(count, '1 тег', '2 теги', '5 тегов');
  },
  'activity-tooltip-$count-task-list': (count) => {
    return cardinal(count, '1 список задач', '2 списка задач', '5 списков задач');
  },
  'activity-tooltip-$count-website-traffic': (count) => {
    return cardinal(count, '1 отчет о трафике', '2 отчета о трафике', '5 отчетов о трафике');
  },
  'activity-tooltip-$count-wiki': (count) => {
    return cardinal(count, '1 правка wiki', '2 правки wiki', '5 правок wiki');
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

  'image-preview-close': 'Закрыть',
  'image-preview-dropbox': 'Dropbox',
  'image-preview-onedrive': 'OneDrive',

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
  'member-list-column-date-range': 'Активный период',
  'member-list-column-email': 'Адрес эл. почты',
  'member-list-column-last-modified': 'Изменено',
  'member-list-column-last-month': 'Прошлый месяц',
  'member-list-column-name': 'Имя и фамилия',
  'member-list-column-roles': 'Роли',
  'member-list-column-this-month': 'Этот месяц',
  'member-list-column-to-date': 'До сих пор',
  'member-list-column-type': 'Тип',
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
  'nav-rest-source-new': 'Новый источник',
  'nav-rest-sources': 'Источники REST',
  'nav-role-new': 'Новый роль',
  'nav-roles': 'Роли',
  'nav-server-new': 'Новый сервер',
  'nav-servers': 'Серверы',
  'nav-settings': 'Настройки',
  'nav-spreadsheet-new': 'Новый файл',
  'nav-spreadsheets': 'Файлы Excel',
  'nav-user-new': 'Новый пользователь',
  'nav-users': 'Пользователи',
  'nav-website': 'Веб-сайт',
  'nav-wiki': 'Вики GitLab',

  'project-list-add': 'Добавить проект',
  'project-list-cancel': 'Отмена',
  'project-list-column-date-range': 'Активный период',
  'project-list-column-last-modified': 'Изменено',
  'project-list-column-last-month': 'Прошлый месяц',
  'project-list-column-repositories': 'Репозитория',
  'project-list-column-this-month': 'Этот месяц',
  'project-list-column-title': 'Название',
  'project-list-column-to-date': 'До сих пор',
  'project-list-column-users': 'Пользователи',
  'project-list-confirm-archive-$count': (count) => {
    let projects = cardinal(count, 'выбранный проект', 'эти 2 проекта', 'эти 5 проектов');
    return `Вы действительно хотите архивировать ${projects}?`;
  },
  'project-list-confirm-restore-$count': (count) => {
    let projects = cardinal(count, 'выбранный проект', 'эти 2 проекта', 'эти 5 проектов');
    return `Вы действительно хотите восстановить ${projects}?`;
  },
  'project-list-edit': 'Редактировать список проектов',
  'project-list-save': 'Сохранить список проектов',
  'project-list-status-archived': 'Архивированный',
  'project-list-status-deleted': 'Удален',
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
    return cardinal(count, '1 другой', '2 других');
  },

  'repo-list-cancel': 'Отмена',
  'repo-list-column-date-range': 'Активный период',
  'repo-list-column-issue-tracker': 'Отслеживание ошибок',
  'repo-list-column-last-modified': 'Изменено',
  'repo-list-column-last-month': 'Прошлый месяц',
  'repo-list-column-server': 'Сервер',
  'repo-list-column-this-month': 'Этот месяц',
  'repo-list-column-title': 'Название',
  'repo-list-column-to-date': 'До сих пор',
  'repo-list-confirm-remove-$count': (count) => {
    let repositories = cardinal(count, 'выбранный репозиторий', 'эти 2 репозитория', 'эти 5 репозиториев');
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
    return cardinal(count, '1 репозиторий', '2 репозитория', '5 репозиториев');
  },

  'rest-list-add': 'Добавить новый источник',
  'rest-list-cancel': 'Отмена',
  'rest-list-column-identifier': 'Идентификатор',
  'rest-list-column-last-modified': 'Изменено',
  'rest-list-column-type': 'Тип',
  'rest-list-column-url': 'URL',
  'rest-list-confirm-disable-$count': (count) => {
    let sources = cardinal(count, 'этот источник', 'эти 2 источника', 'эти 5 источников');
    return `Вы уверены, что хотите отключить ${sources}?`;
  },
  'rest-list-confirm-reactivate-$count': (count) => {
    let sources = cardinal(count, 'этот источник', 'эти 2 источника', 'эти 5 источников');
    return `Вы уверены, что хотите реактивировать ${sources}?`;
  },
  'rest-list-edit': 'Изменить список источников',
  'rest-list-save': 'Сохранить список источников',
  'rest-list-status-deleted': 'Удален',
  'rest-list-status-disabled': 'Отключен',
  'rest-list-title': 'Источники REST',

  'rest-summary-$title': (title) => {
    let text = 'Источники REST';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'rest-summary-add': 'Добавить новый источник',
  'rest-summary-cancel': 'Отмена',
  'rest-summary-confirm-delete': 'Вы уверены, что хотите удалить этот источник?',
  'rest-summary-confirm-disable': 'Вы уверены, что хотите отключить этот источник?',
  'rest-summary-confirm-reactivate': 'Вы уверены, что хотите реактивировать этот источник?',
  'rest-summary-delete': 'Удалить источник',
  'rest-summary-description': 'Описание',
  'rest-summary-disable': 'Отключить источник',
  'rest-summary-edit': 'Редактировать источник',
  'rest-summary-max-age': 'Макс возраст',
  'rest-summary-name': 'Идентификатор',
  'rest-summary-reactivate': 'Реактивировать источник',
  'rest-summary-return': 'Вернуться к списку источников',
  'rest-summary-save': 'Сохранить источник',
  'rest-summary-type': 'Тип',
  'rest-summary-url': 'URL',

  'rest-type-generic': 'Общий',
  'rest-type-wordpress': 'WordPress',

  'role-list-add': 'Добавить роль',
  'role-list-cancel': 'Отмена',
  'role-list-column-last-modified': 'Изменено',
  'role-list-column-title': 'Название',
  'role-list-column-users': 'Пользователи',
  'role-list-confirm-disable-$count': (count) => {
    let roles = cardinal(count, 'эту роль', 'эти 2 роли', 'эти 5 ролей');
    return `Вы действительно хотите отключить ${roles}?`;
  },
  'role-list-confirm-reactivate-$count': (count) => {
    let roles = cardinal(count, 'эту роль', 'эти 2 роли', 'эти 5 ролей');
    return `Вы действительно хотите реактивировать ${roles}?`;
  },
  'role-list-edit': 'Редактировать список ролей',
  'role-list-save': 'Сохранить список ролей',
  'role-list-status-deleted': 'Удален',
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
    return cardinal(count, '1 другая', '2 другие', '5 других');
  },

  'server-list-add': 'Добавить сервер',
  'server-list-api-access-false': '',
  'server-list-api-access-true': 'Получен',
  'server-list-cancel': 'Отмена',
  'server-list-column-api-access': 'Доступ к API',
  'server-list-column-last-modified': 'Изменено',
  'server-list-column-oauth': 'Аутентификация OAuth',
  'server-list-column-title': 'Название',
  'server-list-column-type': 'Тип',
  'server-list-column-users': 'Пользователи',
  'server-list-confirm-disable-$count': (count) => {
    let servers = cardinal(count, 'выбранный сервер', 'эти 2 сервера', 'эти 5 серверов');
    return `Вы действительно хотите отключить ${servers}?`;
  },
  'server-list-confirm-reactivate-$count': (count) => {
    let servers = cardinal(count, 'выбранный сервер', 'эти 2 сервера', 'эти 5 серверов');
    return `Вы действительно хотите реактивировать ${servers}?`;
  },
  'server-list-edit': 'Редактировать список серверов',
  'server-list-oauth-false': '',
  'server-list-oauth-true': 'Включен',
  'server-list-save': 'Сохранить список серверов',
  'server-list-status-deleted': 'Удален',
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

  'spreadsheet-list-add': 'Добавить новую ссылку',
  'spreadsheet-list-cancel': 'Отмена',
  'spreadsheet-list-column-filename': 'Имя файла',
  'spreadsheet-list-column-last-modified': 'Изменено',
  'spreadsheet-list-column-sheets': 'Листы',
  'spreadsheet-list-column-url': 'URL',
  'spreadsheet-list-confirm-disable-$count': (count) => {
    let spreadsheets = cardinal(count, 'эту ссылку', 'эти 2 ссылки', 'эти 5 ссылок');
    return `Вы уверены, что хотите отключить ${spreadsheets}?`;
  },
  'spreadsheet-list-confirm-reactivate-$count': (count) => {
    let spreadsheets = cardinal(count, 'эту ссылку', 'эти 2 ссылки', 'эти 5 ссылок');
    return `Вы уверены, что хотите реактивировать ${spreadsheets}?`;
  },
  'spreadsheet-list-edit': 'Редактировать список ссылок',
  'spreadsheet-list-save': 'Сохранить список ссылок',
  'spreadsheet-list-status-deleted': 'Удалена',
  'spreadsheet-list-status-disabled': 'Отключена',
  'spreadsheet-list-title': 'Файлы Excel',

  'spreadsheet-summary-$title': (title) => {
    let text = 'Файл Excel';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'spreadsheet-summary-add': 'Добавить новую ссылку',
  'spreadsheet-summary-cancel': 'Отмена',
  'spreadsheet-summary-confirm-delete': 'Вы уверены, что хотите удалить эту ссылку?',
  'spreadsheet-summary-confirm-disable': 'Вы уверены, что хотите отключить эту ссылку?',
  'spreadsheet-summary-confirm-reactivate': 'Вы уверены, что хотите реактивировать эту ссылку?',
  'spreadsheet-summary-delete': 'Удалить ссылку',
  'spreadsheet-summary-description': 'Описание',
  'spreadsheet-summary-disable': 'Отключить ссылку',
  'spreadsheet-summary-edit': 'Редактировать ссылку',
  'spreadsheet-summary-filename': 'Имя файла',
  'spreadsheet-summary-hidden': 'Поиск',
  'spreadsheet-summary-hidden-false': 'Появляется в результатах поиска',
  'spreadsheet-summary-hidden-true': 'Скрыты от поиска',
  'spreadsheet-summary-name': 'Идентификатор',
  'spreadsheet-summary-reactivate': 'Реактивировать ссылку',
  'spreadsheet-summary-return': 'Вернуться к списку ссылок',
  'spreadsheet-summary-save': 'Сохранить ссылку',
  'spreadsheet-summary-sheet-$number-$name': (number, name) => {
    let text = `Лист ${number}`;
    if (name) {
      text += `: ${name}`;
    }
    return text;
  },
  'spreadsheet-summary-title': 'Заглавие',
  'spreadsheet-summary-url': 'URL',

  'task-$seconds': (seconds) => {
    return cardinal(seconds, '1 секунда', '2 секунды', '5 секунд');
  },
  'task-imported-$count-commit-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 комментарий', '2 комментария', '5 комментариев');
    return `Импортировано из репозитория «${repo}» ${comments} к коммиту`;
  },
  'task-imported-$count-events-from-$repo': (count, repo) => {
    let events = cardinal(count, '1 событие', '2 события', '5 событий');
    return `Импортировано из репозитория «${repo}» ${events}`;
  },
  'task-imported-$count-issue-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 комментарий', '2 комментария', '5 комментариев');
    return `Импортировано из репозитория «${repo}» ${comments} к отчёту об ошибке`;
  },
  'task-imported-$count-merge-request-comments-from-$repo': (count, repo) => {
    let comments = cardinal(count, '1 комментарий', '2 комментария', '5 комментариев');
    return `Импортировано из репозитория «${repo}» ${comments} к запросу слияния`;
  },
  'task-imported-$count-repos': (count) => {
    let repos = cardinal(count, '1 репозиторий', '2 репозитория', '5 репозиториев');
    return `Импортировано ${repos}`;
  },
  'task-imported-$count-users': (count) => {
    let users = cardinal(count, '1 пользователь', '2 пользователя', '5 пользователей');
    return `Импортировано ${users}`;
  },
  'task-imported-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 вики-страницу', '2 вики-страницы', '5 вики-страниц');
    return `Импортировано ${wikis}`;
  },
  'task-imported-push-with-$count-commits-from-$repo-$branch': (count, repo, branch) => {
    let commits = cardinal(count, '1 коммитом', '2 коммитами');
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
  'task-importing-wikis': 'Импортирования вики-страниц',
  'task-installed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 обратный вызов', '2 обратного вызова', '5 обратных вызовов');
    return `Установлен ${hooks}`;
  },
  'task-installing-hooks': 'Установка обратных вызовов',
  'task-removed-$count-hooks': (count) => {
    let hooks = cardinal(count, '1 обратный вызов', '2 обратного вызова', '5 обратных вызовов');
    return `Удален ${hooks}`;
  },
  'task-removed-$count-repos': (count) => {
    let repos = cardinal(count, '1 репозиторий', '2 репозитория', '5 репозиториев');
    return `Удален ${repos}`;
  },
  'task-removed-$count-users': (count) => {
    let users = cardinal(count, '1 пользователь', '2 пользователя', '5 пользователей');
    return `Удален ${users}`;
  },
  'task-removed-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 вики-страницу', '2 вики-страницы', '5 вики-страниц');
    return `Удален ${wikis}`;
  },
  'task-removing-hooks': 'Удаление обратных вызовов',
  'task-updated-$count-repos': (count) => {
    let repos = cardinal(count, '1 репозиторий', '2 репозитория', '5 репозиториев');
    return `Обновлено ${repos}`;
  },
  'task-updated-$count-users': (count) => {
    let users = cardinal(count, '1 пользователь', '2 пользователя', '5 пользователей');
    return `Обновлено ${users}`;
  },
  'task-updated-$count-wikis': (count) => {
    let wikis = cardinal(count, '1 вики-страницу', '2 вики-страницы', '5 вики-страниц');
    return `Обновлено ${wikis}`;
  },

  'text-field-placeholder-none': 'нет',

  'tooltip-$first-and-$tooltip': (first, tooltip) => {
    return [ first, ' и ', tooltip ];
  },
  'tooltip-more': 'Более',

  'tz-name-abidjan': 'Абиджан',
  'tz-name-accra': 'Акра',
  'tz-name-acre': 'Акри',
  'tz-name-act': 'Территория столицы Австралии',
  'tz-name-adak': 'Adak',
  'tz-name-addis-ababa': 'Аддис-Абеба',
  'tz-name-adelaide': 'Аделаида',
  'tz-name-aden': 'Aden',
  'tz-name-africa': 'Африка',
  'tz-name-alaska': 'Аляска',
  'tz-name-aleutian': 'Алеутские острова',
  'tz-name-algiers': 'Алжир',
  'tz-name-almaty': 'Алматы',
  'tz-name-america': 'Америка',
  'tz-name-amman': 'Амман',
  'tz-name-amsterdam': 'Амстердам',
  'tz-name-anadyr': 'Анадыре',
  'tz-name-anchorage': 'Анкоридж',
  'tz-name-andorra': 'Андорра',
  'tz-name-anguilla': 'Ангилья',
  'tz-name-antananarivo': 'Антананариву',
  'tz-name-antarctica': 'Антарктида',
  'tz-name-antigua': 'Антигуа',
  'tz-name-apia': 'Апиа',
  'tz-name-aqtau': 'Актау',
  'tz-name-aqtobe': 'Актюбинск',
  'tz-name-araguaina': 'Арагуаина',
  'tz-name-arctic': 'Арктический',
  'tz-name-argentina': 'Аргентина',
  'tz-name-arizona': 'Аризона',
  'tz-name-aruba': 'Аруба',
  'tz-name-ashgabat': 'Ашхабад',
  'tz-name-ashkhabad': 'Ашхабад',
  'tz-name-asia': 'Азия',
  'tz-name-asmara': 'Асмэрой',
  'tz-name-asmera': 'Асмэра',
  'tz-name-astrakhan': 'Астрахань',
  'tz-name-asuncion': 'Асунсьон',
  'tz-name-athens': 'Афины',
  'tz-name-atikokan': 'Атикокан ',
  'tz-name-atka': 'Атка',
  'tz-name-atlantic': 'Атлантика',
  'tz-name-atyrau': 'Атырау',
  'tz-name-auckland': 'Окленд',
  'tz-name-australia': 'Австралия',
  'tz-name-azores': 'Азорские острова',
  'tz-name-baghdad': 'Багдад',
  'tz-name-bahia': 'Бахиа',
  'tz-name-bahia-banderas': 'Баия Бандерас',
  'tz-name-bahrain': 'Бахрейн',
  'tz-name-baja-norte': 'Баха Норте',
  'tz-name-baja-sur': 'Баха Сур',
  'tz-name-baku': 'Баку',
  'tz-name-bamako': 'Бамако',
  'tz-name-bangkok': 'Бангкок',
  'tz-name-bangui': 'Банги',
  'tz-name-banjul': 'Банжул',
  'tz-name-barbados': 'Барбадос',
  'tz-name-barnaul': 'Барнаул',
  'tz-name-beirut': 'Бейрут',
  'tz-name-belem': 'Белем',
  'tz-name-belfast': 'Белфаст',
  'tz-name-belgrade': 'Белград',
  'tz-name-belize': 'Белиз',
  'tz-name-berlin': 'Берлин',
  'tz-name-bermuda': 'Бермудские острова',
  'tz-name-beulah': 'Беулах',
  'tz-name-bishkek': 'Бишкек',
  'tz-name-bissau': 'Бисау',
  'tz-name-blanc-sablon': 'Блан-Саблон',
  'tz-name-blantyre': 'Блантайр',
  'tz-name-boa-vista': 'Боа Виста',
  'tz-name-bogota': 'Богота',
  'tz-name-boise': 'Бойсе',
  'tz-name-bougainville': 'Бугенвиль',
  'tz-name-bratislava': 'Братислава',
  'tz-name-brazil': 'Бразилия',
  'tz-name-brazzaville': 'Браззавиль',
  'tz-name-brisbane': 'Брисбен',
  'tz-name-broken-hill': 'Брокен Хилл',
  'tz-name-brunei': 'Бруней',
  'tz-name-brussels': 'Брюссель',
  'tz-name-bucharest': 'Бухарест',
  'tz-name-budapest': 'Будапешт',
  'tz-name-buenos-aires': 'Буэнос айрес',
  'tz-name-bujumbura': 'Буджумбура',
  'tz-name-busingen': 'Büsingen',
  'tz-name-cairo': 'Каир',
  'tz-name-calcutta': 'Калькутта',
  'tz-name-cambridge-bay': 'Кембридж Бэй',
  'tz-name-campo-grande': 'Кампу-Гранди',
  'tz-name-canada': 'Канада',
  'tz-name-canary': 'Канарские острова',
  'tz-name-canberra': 'Канберра',
  'tz-name-cancun': 'Канкун',
  'tz-name-cape-verde': 'Кабо-Верде',
  'tz-name-caracas': 'Каракас',
  'tz-name-casablanca': 'Касабланка',
  'tz-name-casey': 'Кейси',
  'tz-name-catamarca': 'Кэйтамарка',
  'tz-name-cayenne': 'Кайенна',
  'tz-name-cayman': 'Кайман',
  'tz-name-center': 'Центр',
  'tz-name-central': 'Центральный',
  'tz-name-ceuta': 'Сеута',
  'tz-name-chagos': 'Чагос',
  'tz-name-chatham': 'Чатем',
  'tz-name-chicago': 'Чикаго',
  'tz-name-chihuahua': 'Чихуахуа',
  'tz-name-chile': 'Чили',
  'tz-name-chisinau': 'Кишинев',
  'tz-name-chita': 'Чита',
  'tz-name-choibalsan': 'Чойбалсан',
  'tz-name-chongqing': 'Чунцин',
  'tz-name-christmas': 'Остров Рождества',
  'tz-name-chungking': 'Чунцин',
  'tz-name-chuuk': 'Трук',
  'tz-name-cocos': 'Кокосовые острова',
  'tz-name-colombo': 'Коломбо',
  'tz-name-comod-rivadavia': 'Комодоро-Ривадавия',
  'tz-name-comoro': 'Коморские',
  'tz-name-conakry': 'Конакри',
  'tz-name-continental': 'Континентальный',
  'tz-name-copenhagen': 'Копенгаген',
  'tz-name-coral-harbour': 'Корал Харбор',
  'tz-name-cordoba': 'Кордова',
  'tz-name-costa-rica': 'Коста Рика',
  'tz-name-creston': 'Крестон',
  'tz-name-cuiaba': 'Куяба',
  'tz-name-curacao': 'Кюрасао',
  'tz-name-currie': 'Карри',
  'tz-name-dacca': 'Дакка',
  'tz-name-dakar': 'Дакар',
  'tz-name-damascus': 'Дамаск',
  'tz-name-danmarkshavn': 'Данмарксхавн',
  'tz-name-dar-es-salaam': 'Дар-эс-Салам',
  'tz-name-darwin': 'Дарвин',
  'tz-name-davis': 'Дэвис',
  'tz-name-dawson': 'Доусон',
  'tz-name-dawson-creek': 'Доусон-Крик',
  'tz-name-de-noronha': 'Де Норонья',
  'tz-name-denver': 'Денвер',
  'tz-name-detroit': 'Детройт',
  'tz-name-dhaka': 'Дакка',
  'tz-name-dili': 'Дили',
  'tz-name-djibouti': 'Джибути',
  'tz-name-dominica': 'Доминика',
  'tz-name-douala': 'Дуала',
  'tz-name-dubai': 'Дубай',
  'tz-name-dublin': 'Дублин',
  'tz-name-dumont-d-urville': 'Дюмон д’Юрвиль',
  'tz-name-dushanbe': 'Душанбе',
  'tz-name-east': 'восток',
  'tz-name-east-indiana': 'Восточная Индиана',
  'tz-name-easter': 'Остров Пасхи',
  'tz-name-easter-island': 'Остров Пасхи',
  'tz-name-eastern': 'Восточный',
  'tz-name-edmonton': 'Эдмонтон',
  'tz-name-efate': 'Эфате',
  'tz-name-eirunepe': 'Эйрунепе',
  'tz-name-el-aaiun': 'Эль-Аюн',
  'tz-name-el-salvador': 'Эль Сальвадор',
  'tz-name-enderbury': 'Эндербери',
  'tz-name-ensenada': 'Энсенады',
  'tz-name-eucla': 'Евкла',
  'tz-name-europe': 'Европа',
  'tz-name-faeroe': 'Фарерские острова',
  'tz-name-fakaofo': 'Факаофо',
  'tz-name-famagusta': 'Фамагуста',
  'tz-name-faroe': 'Фарерских',
  'tz-name-fiji': 'Фиджи',
  'tz-name-fort-nelson': 'Форт Нельсон',
  'tz-name-fort-wayne': 'Форт Уэйн',
  'tz-name-fortaleza': 'Тири',
  'tz-name-freetown': 'Фритаун',
  'tz-name-funafuti': 'Фунафути',
  'tz-name-gaborone': 'Габороне',
  'tz-name-galapagos': 'Галапагос',
  'tz-name-gambier': 'Гамбиер',
  'tz-name-gaza': 'Газа',
  'tz-name-general': 'Генеральный',
  'tz-name-gibraltar': 'Гибралтар',
  'tz-name-glace-bay': 'Глейс Бэй',
  'tz-name-godthab': 'Нук',
  'tz-name-goose-bay': 'Гусиная бухта',
  'tz-name-grand-turk': 'Гранд Тюрк',
  'tz-name-grenada': 'Гренада',
  'tz-name-guadalcanal': 'Гуадалканал',
  'tz-name-guadeloupe': 'Гваделупа',
  'tz-name-guam': 'Гуам',
  'tz-name-guatemala': 'Гватемала',
  'tz-name-guayaquil': 'Гуаякиль',
  'tz-name-guernsey': 'Гернси',
  'tz-name-guyana': 'Гайана',
  'tz-name-halifax': 'Галифакс',
  'tz-name-harare': 'Хараре',
  'tz-name-harbin': 'Харбин',
  'tz-name-havana': 'Гавана',
  'tz-name-hawaii': 'Гавайи',
  'tz-name-hebron': 'Хеврон',
  'tz-name-helsinki': 'Хельсинки',
  'tz-name-hermosillo': 'Эрмосильо',
  'tz-name-ho-chi-minh': 'Хо Ши Мин',
  'tz-name-hobart': 'Хобарт',
  'tz-name-hong-kong': 'Гонконг',
  'tz-name-honolulu': 'Гонолулу',
  'tz-name-hovd': 'Hovd',
  'tz-name-indian': 'Индийский океан',
  'tz-name-indiana': 'Индиана',
  'tz-name-indiana-starke': 'Индиана Старке',
  'tz-name-indianapolis': 'Индианаполис',
  'tz-name-inuvik': 'Инувик',
  'tz-name-iqaluit': 'Иквалют',
  'tz-name-irkutsk': 'Иркутск',
  'tz-name-isle-of-man': 'Остров Мэн',
  'tz-name-istanbul': 'Стамбул',
  'tz-name-jakarta': 'Джакарта',
  'tz-name-jamaica': 'Ямайка',
  'tz-name-jan-mayen': 'Ян Майен',
  'tz-name-jayapura': 'Джаяпура',
  'tz-name-jersey': 'Джерси',
  'tz-name-jerusalem': 'Иерусалим',
  'tz-name-johannesburg': 'Йоханнесбург',
  'tz-name-johnston': 'Джонстон',
  'tz-name-juba': 'Джуба',
  'tz-name-jujuy': 'Жужуй',
  'tz-name-juneau': 'Джуно',
  'tz-name-kabul': 'Кабул',
  'tz-name-kaliningrad': 'Калининград',
  'tz-name-kamchatka': 'Камчатка',
  'tz-name-kampala': 'Кампала',
  'tz-name-karachi': 'Карачи',
  'tz-name-kashgar': 'Кашгар',
  'tz-name-kathmandu': 'Катманду',
  'tz-name-katmandu': 'Катманду',
  'tz-name-kentucky': 'Кентукки',
  'tz-name-kerguelen': 'Кергелен',
  'tz-name-khandyga': 'Хандыга',
  'tz-name-khartoum': 'Хартум',
  'tz-name-kiev': 'Киев',
  'tz-name-kigali': 'Кигали',
  'tz-name-kinshasa': 'Киншаса',
  'tz-name-kiritimati': 'Кирибати',
  'tz-name-kirov': 'Киров',
  'tz-name-knox': 'Нокс',
  'tz-name-knox-in': 'Нокс, Индиана',
  'tz-name-kolkata': 'Калькутта',
  'tz-name-kosrae': 'Kosrae',
  'tz-name-kralendijk': 'Кралендейк',
  'tz-name-krasnoyarsk': 'Красноярск',
  'tz-name-kuala-lumpur': 'Куала Лумпур',
  'tz-name-kuching': 'Кучинг',
  'tz-name-kuwait': 'Кувейт',
  'tz-name-kwajalein': 'Кваджалейн',
  'tz-name-la-paz': 'Ла Пас',
  'tz-name-la-rioja': 'Ла-Риоха',
  'tz-name-lagos': 'Лагос',
  'tz-name-lhi': 'Лорд Хоу Айленд',
  'tz-name-libreville': 'Либревилль',
  'tz-name-lima': 'Лима',
  'tz-name-lindeman': 'Линдеман',
  'tz-name-lisbon': 'Лиссабон',
  'tz-name-ljubljana': 'Любляна',
  'tz-name-lome': 'Ломе',
  'tz-name-london': 'Лондон',
  'tz-name-longyearbyen': 'Лонгйире',
  'tz-name-lord-howe': 'Лорд хоу',
  'tz-name-los-angeles': 'Лос-Анджелес',
  'tz-name-louisville': 'Луисвилл',
  'tz-name-lower-princes': 'Лоуэр-Принс-Куотер',
  'tz-name-luanda': 'Луанда',
  'tz-name-lubumbashi': 'Lubumbashi',
  'tz-name-lusaka': 'Лусака',
  'tz-name-luxembourg': 'Люксембург',
  'tz-name-macao': 'Макао',
  'tz-name-macau': 'Макао',
  'tz-name-maceio': 'Масейо',
  'tz-name-macquarie': 'Macquarie',
  'tz-name-madeira': 'Мадера',
  'tz-name-madrid': 'Мадрид',
  'tz-name-magadan': 'Магадан',
  'tz-name-mahe': 'Маэ',
  'tz-name-majuro': 'Маджуро',
  'tz-name-makassar': 'Макассар',
  'tz-name-malabo': 'Малабо',
  'tz-name-maldives': 'Мальдивы',
  'tz-name-malta': 'Мальта',
  'tz-name-managua': 'Манагуа',
  'tz-name-manaus': 'Манаус',
  'tz-name-manila': 'Манила',
  'tz-name-maputo': 'Мапуту',
  'tz-name-marengo': 'Маренго',
  'tz-name-mariehamn': 'Мариехамн',
  'tz-name-marigot': 'Маригот',
  'tz-name-marquesas': 'Маркизские',
  'tz-name-martinique': 'Мартиника',
  'tz-name-maseru': 'Масеру',
  'tz-name-matamoros': 'Matamoros',
  'tz-name-mauritius': 'Маврикий',
  'tz-name-mawson': 'Моусон',
  'tz-name-mayotte': 'Майотта',
  'tz-name-mazatlan': 'Масатлан',
  'tz-name-mbabane': 'Мбабане',
  'tz-name-mc-murdo': 'МакМердо',
  'tz-name-melbourne': 'Мельбурн',
  'tz-name-mendoza': 'Мендоса',
  'tz-name-menominee': 'меномини',
  'tz-name-merida': 'Мерида',
  'tz-name-metlakatla': 'Метлакатла',
  'tz-name-mexico': 'Мексика',
  'tz-name-mexico-city': 'Мехико',
  'tz-name-michigan': 'Мичиган',
  'tz-name-midway': 'Мидуэй',
  'tz-name-minsk': 'Минск',
  'tz-name-miquelon': 'Микелон',
  'tz-name-mogadishu': 'Могадишо',
  'tz-name-monaco': 'Монако',
  'tz-name-moncton': 'Монктон',
  'tz-name-monrovia': 'Монровия',
  'tz-name-monterrey': 'Монтеррей',
  'tz-name-montevideo': 'Монтевидео',
  'tz-name-monticello': 'Монтичелло',
  'tz-name-montreal': 'Монреаль',
  'tz-name-montserrat': 'Монсеррат',
  'tz-name-moscow': 'Москва',
  'tz-name-mountain': 'Гора',
  'tz-name-muscat': 'Маскат',
  'tz-name-nairobi': 'Найроби',
  'tz-name-nassau': 'Нассау',
  'tz-name-nauru': 'Науру',
  'tz-name-ndjamena': 'Нджамена',
  'tz-name-new-salem': 'Новый Салем',
  'tz-name-new-york': 'Нью-Йорк',
  'tz-name-newfoundland': 'Ньюфаундленд',
  'tz-name-niamey': 'Ниамей',
  'tz-name-nicosia': 'Никосия',
  'tz-name-nipigon': 'Нипигон',
  'tz-name-niue': 'Ниуэ',
  'tz-name-nome': 'Ном',
  'tz-name-norfolk': 'Норфолк',
  'tz-name-noronha': 'Норонья',
  'tz-name-north': 'Север',
  'tz-name-north-dakota': 'Северная Дакота',
  'tz-name-nouakchott': 'Нуакшот',
  'tz-name-noumea': 'Нумеа',
  'tz-name-novokuznetsk': 'Новокузнецк',
  'tz-name-novosibirsk': 'Новосибирск',
  'tz-name-nsw': 'Новый Южный Уэльс',
  'tz-name-ojinaga': 'Охинага',
  'tz-name-omsk': 'Омск',
  'tz-name-oral': 'Уральск',
  'tz-name-oslo': 'Осло',
  'tz-name-ouagadougou': 'Уагадугу',
  'tz-name-pacific': 'Тихий океан',
  'tz-name-pacific-new': 'Тихий океан-новый',
  'tz-name-pago-pago': 'Паго Паго',
  'tz-name-palau': 'Палау',
  'tz-name-palmer': 'Палмер',
  'tz-name-panama': 'Панама',
  'tz-name-pangnirtung': 'Пангниртанг',
  'tz-name-paramaribo': 'Парамарибо',
  'tz-name-paris': 'Париж',
  'tz-name-perth': 'Перт',
  'tz-name-petersburg': 'Петербург',
  'tz-name-phnom-penh': 'Пномпень',
  'tz-name-phoenix': 'Феникс',
  'tz-name-pitcairn': 'Питкэрн',
  'tz-name-podgorica': 'Подгорица',
  'tz-name-pohnpei': 'Понпеи',
  'tz-name-ponape': 'Понпеи',
  'tz-name-pontianak': 'Понтианак',
  'tz-name-port-au-prince': 'Порт-о-Пренс',
  'tz-name-port-moresby': 'Порт-Морсби',
  'tz-name-port-of-spain': 'Порт испании',
  'tz-name-porto-acre': 'Порто Акко',
  'tz-name-porto-novo': 'Порто-Ново',
  'tz-name-porto-velho': 'Порто-Велью',
  'tz-name-prague': 'Прага',
  'tz-name-puerto-rico': 'Пуэрто-Рико',
  'tz-name-punta-arenas': 'Пунта Аренас',
  'tz-name-pyongyang': 'Пхеньян',
  'tz-name-qatar': 'Катар',
  'tz-name-qostanay': 'Костанай',
  'tz-name-queensland': 'Квинсленд',
  'tz-name-qyzylorda': 'Кызылорда',
  'tz-name-rainy-river': 'Рейни-Ривер',
  'tz-name-rangoon': 'Рангун',
  'tz-name-rankin-inlet': 'Ранкин-Инлет',
  'tz-name-rarotonga': 'Раротонга',
  'tz-name-recife': 'Ресифе',
  'tz-name-regina': 'реджайна',
  'tz-name-resolute': 'Резольют',
  'tz-name-reunion': 'Реюньон',
  'tz-name-reykjavik': 'Рейкьявик',
  'tz-name-riga': 'Рига',
  'tz-name-rio-branco': 'Риу-Бранку',
  'tz-name-rio-gallegos': 'Рио Гальегос',
  'tz-name-riyadh': 'Рияд',
  'tz-name-rome': 'Рим',
  'tz-name-rosario': 'Росарио',
  'tz-name-rothera': 'Ротера',
  'tz-name-saigon': 'Сайгон',
  'tz-name-saipan': 'Сайпан',
  'tz-name-sakhalin': 'Сахалин',
  'tz-name-salta': 'Сальта',
  'tz-name-samara': 'Самара',
  'tz-name-samarkand': 'Самарканд',
  'tz-name-samoa': 'Самоа',
  'tz-name-san-juan': 'Сан Хуан',
  'tz-name-san-luis': 'Сан Луис',
  'tz-name-san-marino': 'Сан-Марино',
  'tz-name-santa-isabel': 'Санта Изабель',
  'tz-name-santarem': 'Сантарен',
  'tz-name-santiago': 'Сантьяго',
  'tz-name-santo-domingo': 'Санто-Доминго',
  'tz-name-sao-paulo': 'Сан Пауло',
  'tz-name-sao-tome': 'Сан-Томе',
  'tz-name-sarajevo': 'Сараево',
  'tz-name-saratov': 'Саратов',
  'tz-name-saskatchewan': 'Саскачеван',
  'tz-name-scoresbysund': 'Скоресбисунд',
  'tz-name-seoul': 'Сеул',
  'tz-name-shanghai': 'Шанхай',
  'tz-name-shiprock': 'Шипрок',
  'tz-name-simferopol': 'Симферополь',
  'tz-name-singapore': 'Сингапур',
  'tz-name-sitka': 'Ситка',
  'tz-name-skopje': 'Скопье',
  'tz-name-sofia': 'София',
  'tz-name-south': 'Юг',
  'tz-name-south-georgia': 'Южная Георгия',
  'tz-name-south-pole': 'Южный полюс',
  'tz-name-srednekolymsk': 'Среднеколымск',
  'tz-name-st-barthelemy': 'Сен-Бартельми',
  'tz-name-st-helena': 'Святой Елены',
  'tz-name-st-johns': 'Сент-Джонс',
  'tz-name-st-kitts': 'Сент-Китс',
  'tz-name-st-lucia': 'Сент-Люсия',
  'tz-name-st-thomas': 'Святой Томас',
  'tz-name-st-vincent': 'Сент-Винсент',
  'tz-name-stanley': 'Стэнли',
  'tz-name-stockholm': 'Стокгольм',
  'tz-name-swift-current': 'Суифт-Каррент',
  'tz-name-sydney': 'Сидней',
  'tz-name-syowa': 'Сева',
  'tz-name-tahiti': 'Таити',
  'tz-name-taipei': 'Тайбэй',
  'tz-name-tallinn': 'Таллин',
  'tz-name-tarawa': 'Тарава',
  'tz-name-tashkent': 'Ташкент',
  'tz-name-tasmania': 'Тасмания',
  'tz-name-tbilisi': 'Тбилиси',
  'tz-name-tegucigalpa': 'Тегусигальпа',
  'tz-name-tehran': 'Тегеран',
  'tz-name-tel-aviv': 'Тель-Авив',
  'tz-name-tell-city': 'Скажите Город',
  'tz-name-thimbu': 'Тхимпху',
  'tz-name-thimphu': 'Тхимпху',
  'tz-name-thule': 'Туле',
  'tz-name-thunder-bay': 'Тандер-Бей',
  'tz-name-tijuana': 'Тихуана',
  'tz-name-timbuktu': 'Тимбукту',
  'tz-name-tirane': 'Тирана',
  'tz-name-tiraspol': 'Тирасполь',
  'tz-name-tokyo': 'Токио',
  'tz-name-tomsk': 'Томск',
  'tz-name-tongatapu': 'Тонгатапу',
  'tz-name-toronto': 'Торонто',
  'tz-name-tortola': 'Тортола',
  'tz-name-tripoli': 'Триполи',
  'tz-name-troll': 'Тролль',
  'tz-name-truk': 'Трук',
  'tz-name-tucuman': 'Такаман',
  'tz-name-tunis': 'Тунис',
  'tz-name-ujung-pandang': 'Уджунг Панданг',
  'tz-name-ulaanbaatar': 'Улан-Батор',
  'tz-name-ulan-bator': 'Улан-Батор',
  'tz-name-ulyanovsk': 'Ульяновск',
  'tz-name-urumqi': 'Урумчи',
  'tz-name-us': 'Соединенные Штаты',
  'tz-name-ushuaia': 'Ушуайя',
  'tz-name-ust-nera': 'Усть-Нера',
  'tz-name-uzhgorod': 'Ужгородский',
  'tz-name-vaduz': 'Вадуц',
  'tz-name-vancouver': 'Ванкувер',
  'tz-name-vatican': 'Ватикан',
  'tz-name-vevay': 'Виви',
  'tz-name-victoria': 'Виктория',
  'tz-name-vienna': 'Вена',
  'tz-name-vientiane': 'Вьентьян',
  'tz-name-vilnius': 'Вильнюс',
  'tz-name-vincennes': 'Винсенс',
  'tz-name-virgin': 'Виргинские острова',
  'tz-name-vladivostok': 'Владивосток',
  'tz-name-volgograd': 'Волгоград',
  'tz-name-vostok': 'Восток',
  'tz-name-wake': 'Остров вейк',
  'tz-name-wallis': 'Увеа',
  'tz-name-warsaw': 'Варшава',
  'tz-name-west': 'Запад',
  'tz-name-whitehorse': 'Уайтхорс',
  'tz-name-winamac': 'Винамак',
  'tz-name-windhoek': 'Виндхук',
  'tz-name-winnipeg': 'Виннипег',
  'tz-name-yakutat': 'Якутат',
  'tz-name-yakutsk': 'Якутск',
  'tz-name-yancowinna': 'Янцовинна',
  'tz-name-yangon': 'Янгон',
  'tz-name-yap': 'Яп',
  'tz-name-yekaterinburg': 'Екатеринбург',
  'tz-name-yellowknife': 'Йеллоунайф',
  'tz-name-yerevan': 'Ереван',
  'tz-name-yukon': 'Юкон',
  'tz-name-zagreb': 'Загреб',
  'tz-name-zaporozhye': 'Запорожье',
  'tz-name-zurich': 'Цюрих',

  'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
    let files = cardinal(count, '1 файла', '2 файлов');
    return `Загрузка ${files}, оставшихся ${size}`;
  },

  'user-list-add': 'Добавить пользователя',
  'user-list-approve-all': 'Утвердить все запросы',
  'user-list-cancel': 'Отмена',
  'user-list-column-email': 'Адрес эл. почты',
  'user-list-column-last-modified': 'Изменено',
  'user-list-column-name': 'Имя и фамилия',
  'user-list-column-projects': 'Проекты',
  'user-list-column-roles': 'Роли',
  'user-list-column-type': 'Тип',
  'user-list-column-username': 'Имя пользователя',
  'user-list-confirm-disable-$count': (count) => {
    let users = cardinal(count, 'выбранного пользователя', 'этих 2 пользователей');
    return `Вы действительно хотите отключить ${users}?`;
  },
  'user-list-confirm-reactivate-$count': (count) => {
    let users = cardinal(count, 'выбранного пользователя', 'этих 2 пользователей');
    return `Вы действительно хотите реактивировать ${users}?`;
  },
  'user-list-edit': 'Редактировать список пользователей',
  'user-list-reject-all': 'Отклонить все запросы',
  'user-list-save': 'Сохранить список пользователей',
  'user-list-status-deleted': 'Удален',
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
  'user-summary-remove-membership': 'Удалить пользователя из проекта',
  'user-summary-restore-membership': 'Добавить пользователя в проект',
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
    return cardinal(count, '1 пользователь', '2 пользователя', '5 пользователей');
  },

  'validation-duplicate-project-name': 'Проект с таким идентификатором уже существует',
  'validation-duplicate-role-name': 'Роль с таким идентификатором уже существует',
  'validation-duplicate-server-name': 'Сервер с таким идентификатором уже существует',
  'validation-duplicate-source-name': 'Источник с таким идентификатором уже существует',
  'validation-duplicate-spreadsheet-name': 'Ссылка с таким идентификатором уже существует',
  'validation-duplicate-user-name': 'Пользователь с таким именем уже существует',
  'validation-illegal-project-name': 'Идентификатор проекта не может быть «global», «admin», «public» или «srv»',
  'validation-invalid-timezone': 'Неверный часовой пояс',
  'validation-localhost-is-wrong': '«localhost» недействителен',
  'validation-password-for-admin-only': 'Только администраторы могут войти с помощью пароля',
  'validation-required': 'Необходимые',
  'validation-used-by-trambar': 'Используется Трамбар',

  'website-summary-cancel': 'Отмена',
  'website-summary-domain-names': 'Доменные имена',
  'website-summary-edit': 'Редактировать сайт',
  'website-summary-save': 'Сохранить сайт',
  'website-summary-template': 'Шаблон',
  'website-summary-template-disabled': 'Отключен',
  'website-summary-template-generic': 'Общий шаблон',
  'website-summary-timezone': 'Часовой пояс',
  'website-summary-title': 'Веб-сайт',
  'website-summary-traffic-report-time': 'Время публикации отчета о трафике',
  'website-summary-versions': 'Версии',

  'welcome': 'Добро пожаловать!',

  'wiki-list-cancel': 'Отмена',
  'wiki-list-column-last-modified': 'Изменено',
  'wiki-list-column-public': 'Общедоступная',
  'wiki-list-column-repo': 'Репозиторий',
  'wiki-list-column-title': 'Титул',
  'wiki-list-confirm-deselect-$count': (count) => {
    let pages = cardinal(count, 'этой страницы', 'этих 2 страниц', 'этих 5 страниц');
    return `Вы уверены, что хотите отменить выбор ${pages}?`;
  },
  'wiki-list-confirm-select-$count': (count) => {
    let pages = cardinal(count, 'эту страницу', 'эти 2 страницы', 'эти 5 страниц');
    let avail = cardinal(count, 'общедоступной', 'общедоступными')
    return `Вы уверены, что хотите сделать ${pages} ${avail}?`;
  },
  'wiki-list-edit': 'Редактировать список страниц',
  'wiki-list-public-always': 'всегда',
  'wiki-list-public-no': 'нет',
  'wiki-list-public-referenced': 'ссылочна',
  'wiki-list-save': 'Сохранить список страниц',
  'wiki-list-title': 'Вики GitLab',

  'wiki-summary-$title': (title) => {
    let text = 'Вики GitLab';
    if (title) {
      text += `: ${title}`;
    }
    return text;
  },
  'wiki-summary-cancel': 'Отмена',
  'wiki-summary-confirm-deselect': 'Вы уверены, что хотите отменить выбор этой страницы?',
  'wiki-summary-confirm-select': 'Вы уверены, что хотите сделать эту страницу общедоступной?',
  'wiki-summary-deselect': 'Отменить выбор страницы',
  'wiki-summary-edit': 'Редактировать страницу',
  'wiki-summary-hidden': 'Поиск',
  'wiki-summary-hidden-false': 'Появляется в результатах поиска',
  'wiki-summary-hidden-true': 'Скрыта от поиска',
  'wiki-summary-page-contents': 'Содержание',
  'wiki-summary-public': 'Общедоступная',
  'wiki-summary-public-always': 'Всегда',
  'wiki-summary-public-no': 'Нет',
  'wiki-summary-public-referenced': 'Да (ссылочна другой общедоступной страницей)',
  'wiki-summary-repo': 'Идентификатор репозитория',
  'wiki-summary-return': 'Вернуться к списку страниц',
  'wiki-summary-save': 'Сохранить страницу',
  'wiki-summary-select': 'Выберите страницу',
  'wiki-summary-slug': 'Slug',
  'wiki-summary-title': 'Титул',
};

export {
  phrases,
  genderize,
};
