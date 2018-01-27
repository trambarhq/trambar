require('moment/locale/ru');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': 'Связаться по электронной почте',
        'action-contact-by-ichat': 'Связаться по ichat',
        'action-contact-by-phone': 'Связаться по телефону',
        'action-contact-by-skype': 'Связаться по Skype',
        'action-contact-by-slack': 'Связаться по Slack',
        'action-contact-by-twitter': 'Связаться по Twitter',
        'action-view-github-page': 'Просмотреть страницу GitHub',
        'action-view-gitlab-page': 'Просмотреть страницу GitLab',
        'action-view-linkedin-page': 'Просмотреть страницу LinkedIn',
        'action-view-stackoverflow-page': 'Просмотреть страницу StackOverflow',

        'activation-address': 'Адрес сервера',
        'activation-cancel': 'Отмена',
        'activation-code': 'Код активации',
        'activation-ok': 'OK',
        'activation-schema': 'Проект',

        'alert-$count-new-bookmarks': (count) => {
            if (singularN(count)) {
                return `${count} новая закладка`;
            } else if (singularG(count)) {
                return `${count} новые закладки`;
            } else {
                return `${count} новых закладок`;
            }
        },
        'alert-$count-new-notifications': (count) => {
            if (singularN(count)) {
                return `${count} новое уведомление`;
            } else if (singularG(count)) {
                return `${count} новых уведомления`;
            } else {
                return `${count} новых уведомлений`;
            }
        },
        'alert-$count-new-stories': (count) => {
            if (singularN(count)) {
                return `${count} новый рассказ`;
            } else if (singularG(count)) {
                return `${count} новых рассказа`;
            } else {
                return `${count} новых рассказов`;
            }
        },

        'app-name': 'Трамбар',

        'audio-capture-accept': 'Принять',
        'audio-capture-cancel': 'Отмена',
        'audio-capture-pause': 'Приостановить',
        'audio-capture-rerecord': 'Пересдавать',
        'audio-capture-resume': 'Возобновить',
        'audio-capture-start': 'Начать',
        'audio-capture-stop': 'Прекратить',

        'bookmark-$count-other-users': (count) => {
            if (singularN(count)) {
                return `${count} другой пользователь`;
            } else if (singularG(count)) {
                return `${count} других пользователя`
            } else {
                return `${count} других пользователей`;
            }
        },
        'bookmark-$count-users': (count) => {
            if (singularN(count)) {
                return `${count} пользователь`;
            } else if (singularG(count)) {
                return `${count} пользователя`
            } else {
                return `${count} пользователей`;
            }
        },
        'bookmark-$name-and-$others-recommend-this': (name, others, count) => {
            return [ `${name} и `, others, ` рекомендуют это` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} рекомендует это`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return [ name1, ' и ', name2, ' рекомендуют это' ];
        },
        'bookmark-$you-bookmarked-it': (you) => {
            return `Вы добавили это в закладки`;
        },
        'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
            return `Вы добавили это в закладки (и ${name} рекомендует)`;
        },
        'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others) => {
            return [ `Вы добавили это в закладки (и `, others, ` рекомендуют)` ];
        },
        'bookmark-recommendations': 'Рекомендации',

        'bottom-nav-bookmarks': 'Закладки',
        'bottom-nav-news': 'Новости',
        'bottom-nav-notifications': 'Уведомления',
        'bottom-nav-people': 'Люди',
        'bottom-nav-settings': 'Настройки',

        'confirmation-cancel': 'Отмена',
        'confirmation-confirm': 'Подтвердить',

        'diagnostics-show': 'Показать диагностику',
        'diagnostics-show-panel': 'Показать эту панель',

        'image-editor-upload-in-progress': 'Загрузка выполняется...',

        'issue-cancel': 'Отмена',
        'issue-clear': 'Очистить',
        'issue-ok': 'OK',
        'issue-repo': 'Репозиторий',
        'issue-title': 'Название',

        'list-$count-more': (count) => {
            return `Еще ${count}...`;
        },

        'media-close': 'Закрыть',
        'media-download-original': 'Скачать исходный файл',
        'media-editor-embed': 'Встроить',
        'media-editor-remove': 'Удалить',
        'media-editor-shift': 'Переместить',
        'media-next': 'Cледующая',
        'media-previous': 'Предыдущая',

        'membership-request-$you-are-now-member': 'Вы теперь являетесь участником этого проекта',
        'membership-request-$you-have-requested-membership': 'Вы запросили членство в этом проекте',
        'membership-request-cancel': 'Отмена',
        'membership-request-join': 'Присоединиться',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Проследовать',

        'mobile-device-revoke': 'отмени',
        'mobile-device-revoke-are-you-sure': 'Вы действительно хотите отменить авторизацию этого устройства?',

        'mobile-setup-address': 'Адрес сервера',
        'mobile-setup-close': 'Закрыть',
        'mobile-setup-code': 'Код авторизации',

        'notification-$name-added-you-as-coauthor': (name) => {
            var e = pastTenseEnding(name);
            return `${name} предложил${e} вам совместно редактировать сообщение`;
        },
        'notification-$name-commented-on-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'ваш опрос'; break;
                case 'task-list': story = 'ваш список задач'; break;
                case 'post': 'ваше сообщение'; break;
                default: story = 'ваш рассказ';
            }
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} ${story}`;
        },
        'notification-$name-completed-task': (name) => {
            var e = pastTenseEnding(name);
            return `${name} выполнил задачу в вашем списке`;
        },
        'notification-$name-likes-your-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'ваш опрос'; break;
                case 'task-list': story = 'ваш список задач'; break;
                case 'post': 'ваше сообщение'; break;
                default: story = 'ваш рассказ';
            }
            return `${name} любит ${story}`;
        },
        'notification-$name-requested-to-join': (name) => {
            var e = pastTenseEnding(name);
            return `${name} попросил${e} присоединиться к проекту`;
        },
        'notification-$name-sent-bookmark-to-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'опрос'; break;
                case 'task-list': story = 'список задач'; break;
                case 'post': story = 'сообщение'; break;
                default: story = 'рассказ';
            }
            var e = pastTenseEnding(name);
            return `${name} отправил${e} вам закладку в ${story}`;
        },
        'notification-$name-voted-in-your-survey': (name) => {
            var e = pastTenseEnding(name);
            return `${name} ответил${e} на ваш опрос`;
        },
        'notification-option-assignment': 'Когда вам назначается отчёт об ошибке',
        'notification-option-bookmark': 'Когда кто-то отправляет вам закладку',
        'notification-option-coauthor': 'Когда кто-то приглашает вас совместно редактировать сообщение',
        'notification-option-comment': 'Когда кто-то комментирует ваш рассказ',
        'notification-option-issue': 'Когда кто-то открывает отчёт об ошибке',
        'notification-option-join-request': 'Когда кто-то хочет присоединиться к проекту',
        'notification-option-like': 'Когда кому-то нравится ваш рассказ',
        'notification-option-merge': 'Когда кто-то сливает код в ветку “${branch}”',
        'notification-option-note': 'Когда кто-то публикует заметку о коммите или отчёте об ошибке',
        'notification-option-push': 'Когда кто-то отправляет код в репозиторий git',
        'notification-option-survey': 'Когда кто-то публикует опрос',
        'notification-option-task-completion': 'Когда кто-то завершает задачу в вашем списке',
        'notification-option-vote': 'Когда кто-то отвечает на ваш опрос',
        'notification-option-web-session': 'Когда вы просматриваете этот сайт с помощью веб-браузера',

        'option-add-bookmark': 'Добавить закладку в рассказ',
        'option-add-issue': 'Добавить сообщение в выпускной трекер',
        'option-bookmark-story': 'Добавить закладку в рассказ',
        'option-bump-story': 'Продвинуть рассказ',
        'option-edit-comment': 'Редактировать комментарий',
        'option-edit-post': 'Редактировать сообщение',
        'option-hide-comment': 'Скрыть комментарий от гостей',
        'option-hide-story': 'Скрыть рассказ от гостей',
        'option-remove-comment': 'Удалить комментарий',
        'option-remove-story': 'Удалить рассказ',
        'option-send-bookmarks': 'Отправить закладки другим пользователям',
        'option-send-bookmarks-to-$count-users': (count) => {
            if (singularN(count)) {
                return `${count} другому пользователю`;
            } else {
                return `${count} другим пользователям`;
            }
            return `Отправить закладки ${users}`;
        },
        'option-show-media-preview': 'Показать прикрепленные носители',
        'option-show-text-preview': 'Показать предварительный просмотр текста',

        'photo-capture-accept': 'Прими',
        'photo-capture-cancel': 'Отмена',
        'photo-capture-retake': 'Пересдавай',
        'photo-capture-snap': 'Сделать',

        'project-description-close': 'Закрыть',

        'project-management-add': 'Добавить',
        'project-management-cancel': 'Отмена',
        'project-management-description': 'описание проекта',
        'project-management-manage': 'Управлять списком',
        'project-management-mobile-set-up': 'мобильная установка',
        'project-management-remove': 'Удалить',
        'project-management-sign-out': 'выход',
        'project-management-sign-out-are-you-sure': 'Вы действительно хотите выйти с этого сервера?',

        'qr-scanner-cancel': 'Отмена',
        'qr-scanner-invalid-qr-code': 'Неверный QR-код',

        'reaction-$name-added-story-to-issue-tracker': (name) => {
            var e = pastTenseEnding(name);
            return `${name} добавил${e} это сообщение в выпускной трекер`;
        },
        'reaction-$name-cast-a-vote': (name) => {
            var e = pastTenseEnding(name);
            return `${name} проголосовал${e}`;
        },
        'reaction-$name-commented-on-branch': (name) => {
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} эту ветку`;
        },
        'reaction-$name-commented-on-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} эту проблему`;
        },
        'reaction-$name-commented-on-merge': (name) => {
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} это слияние`;
        },
        'reaction-$name-commented-on-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} этот запрос слияния`;
        },
        'reaction-$name-commented-on-push': (name) => {
            var e = pastTenseEnding(name);
            return `${name} прокомментировал${e} это помещение`;
        },
        'reaction-$name-completed-a-task': (name) => {
            var e = pastTenseEnding(name);
            return `${name} выполнил задачу`;
        },
        'reaction-$name-is-assigned-to-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} был назначен на этот отчёт об ошибке`;
        },
        'reaction-$name-is-assigned-to-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `${name} был назначен на этот запрос слияния`;
        },
        'reaction-$name-is-editing': (name) => {
            return `${name} редактирует комментарий...`;
        },
        'reaction-$name-is-writing': (name) => {
            return `${name} пишет комментарий...`;
        },
        'reaction-$name-likes-this': (name) => {
            return `${name} любит это`;
        },

        'role-filter-no-roles': 'Роли не определены',

        'search-bar-keywords': 'ключевые слова или #hashtags',

        'selection-cancel': 'Отмена',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-device': 'Мобильное устройство',
        'settings-devices': 'Мобильные устройства',
        'settings-diagnostics': 'Диагностика',
        'settings-language': 'Язык',
        'settings-mobile-alert': 'Мобильное предупреждение',
        'settings-notification': 'Уведомление',
        'settings-profile-image': 'Изображение профиля',
        'settings-projects': 'Проекты',
        'settings-social-networks': 'Социальные сети',
        'settings-user-information': 'Информация о пользователе',
        'settings-web-alert': 'Предупреждение браузера',

        'social-network-github': 'URL профиля GitHub',
        'social-network-gitlab': 'URL профиля GitLab',
        'social-network-ichat': 'Имя пользователя iChat',
        'social-network-linkedin': 'URL профиля LinkedIn',
        'social-network-skype': 'Имя пользователя Skype',
        'social-network-slack': 'ID пользователя Slack',
        'social-network-slack-team': 'ID команды Slack',
        'social-network-stackoverflow': 'URL профиля StackOverflow',
        'social-network-twitter': 'Имя пользователя Twitter',

        'start-activation-add-server': 'Добавить проект с другого сервера',
        'start-activation-instructions': 'Лорем ипсум долор сит амет, ат сеа фацер путант цонсеяуунтур, юсто ассум ат меи. Мел солет темпор тибияуе ет, примис цонституто яуо ид.',
        'start-activation-manual': 'Ввод вручную',
        'start-activation-scan-code': 'Сканировать QR-код',
        'start-error-access-denied': 'Запрос отклонен',
        'start-error-account-disabled': 'В настоящее время отключена учетная запись',
        'start-error-existing-users-only': 'Доступ к этой системе может получить только уполномоченный персонал',
        'start-error-undefined': 'Неожиданная ошибка',
        'start-projects': 'Проекты',
        'start-social-login': 'Социальный вход',
        'start-system-title-default': 'Трамбар',
        'start-welcome': 'Добро пожаловать!',
        'start-welcome-again': 'Добро пожаловать снова',

        'statistics-bar': 'Столбчатая',
        'statistics-line': 'Линейная',
        'statistics-pie': 'Круговая',

        'story-$count-user-reacted-to-story': (count) => {
            var e = '';
            var users;
            if (singularN(count)) {
                users = `${count} пользователь`;
            } else if (singularG(count)) {
                e = 'и';
                users = `${count} пользователя`;
            } else {
                e = 'и';
                users = `${count} пользователей`;
            }
            return `${users} ответил${e} на это`;
        },
        'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            return `Создал${e} ветку “${branch}” в репозитории “${repo}”`;
        },
        'story-$name-created-$milestone': (name, milestone) => {
            var e = pastTenseEnding(name);
            return `Создал${e} веху “${milestone}”`;
        },
        'story-$name-created-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Создал${e} wiki-страницу “${page}”`;
        },
        'story-$name-created-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Создал репозиторий`;
            if (name) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-$name-deleted-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Удалил${e} wiki-страницу “${page}”`;
        },
        'story-$name-joined-$repo': (name, repo) => {
            var e = reflective(pastTenseEnding(name));
            var text = `Присоединил${e} к репозиторию`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-$name-left-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Оставил${e} репозиторий`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Слил${e} изменения`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `“${branch}”`;
                });
                text += ` из`;
                if (branches.length > 1) {
                    text += ` веток`;
                } else {
                    text += ` ветки`;
                }
                text += ` ${sources.join(', ')}`;
            }
            text += ` в ветку “${branch}”`;
            if (repo) {
                text += ` репозитория “${repo}”`;
            }
            return text;
        },
        'story-$name-opened-issue-$number-$title': (name, number, title) => {
            var e = pastTenseEnding(name);
            var text = `Открыл${e} выпуск ${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Отправил${e} изменения в ветку “${branch}”`;
            if (repo) {
                text += ` репозитория “${repo}”`;
            }
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
            var e = pastTenseEnding(name);
            return `Попросил${e} слить ветку “${branch1}” в ветку “${branch2}”`;
        },
        'story-$name-updated-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Обновил${e} wiki-страницу “${page}”`;
        },
        'story-add-coauthor': 'Добавить соавтора',
        'story-add-remove-coauthor': 'Добавить/удалить соавтора',
        'story-audio': 'Аудио',
        'story-author-$count-others': (count) => {
            return `${count} других`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' и ', name2 ];
        },
        'story-cancel': 'Отмена',
        'story-cancel-are-you-sure': 'Вы действительно хотите покинуть это сообщение?',
        'story-cancel-edit-are-you-sure': 'Вы действительно хотите отказаться от своих изменений?',
        'story-coauthors': 'Соавторы',
        'story-comment': 'Комментарий',
        'story-drop-files-here': 'Перетащите медиафайлы здесь',
        'story-file': 'Файл',
        'story-issue-current-status': 'Текущее состояние:',
        'story-issue-status-closed': 'Закрытый',
        'story-issue-status-opened': 'Открытый',
        'story-issue-status-reopened': 'Вновь открытый',
        'story-like': 'Нравиться',
        'story-markdown': 'Markdown',
        'story-milestone-due-date': 'Срок:',
        'story-milestone-start-date': 'Дата начала:',
        'story-options': 'Опции',
        'story-paste-image-here': 'Изображение, вставленное в текстовый редактор, также окажется здесь',
        'story-pending': 'В ожидании...',
        'story-photo': 'Фото',
        'story-post': 'Опубликовать',
        'story-push-added-$count-files': (count) => {
            var files;
            if (singularN(count)) {
                files = `${count} файл`;
            } else if (singularG(count)) {
                files = `${count} файла`;
            } else {
                files = `${count} файлов`;
            }
            return `${files} добавлено`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines;
            if (singularN(count)) {
                lines = `${count} линия`;
            } else if (singularG(count)) {
                lines = `${count} линии`;
            } else {
                lines = `${count} линий`;
            }
            return `${lines} добавлено`;
        },
        'story-push-components-changed': 'Изменено следующие части:',
        'story-push-deleted-$count-files': (count) => {
            var files;
            if (singularN(count)) {
                files = `${count} файл`
            } else if (singularG(count)) {
                files = `${count} файла`
            } else {
                files = `${count} файлов`
            }
            return `${files} удалено`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines;
            if (singularN(count)) {
                lines = `${count} линия`;
            } else if (singularG(count)) {
                lines = `${count} линии`;
            } else {
                lines = `${count} линий`;
            }
            return `${lines} удалено`;
        },
        'story-push-modified-$count-files': (count) => {
            var files;
            if (singularN(count)) {
                files = `${count} файл`
            } else if (singularG(count)) {
                files = `${count} файла`
            } else {
                files = `${count} файлов`
            }
            return `${files} изменено`;
        },
        'story-push-renamed-$count-files': (count) => {
            var files;
            if (singularN(count)) {
                files = `${count} файл`
            } else if (singularG(count)) {
                files = `${count} файла`
            } else {
                files = `${count} файлов`
            }
            return `${files} переименовано`;
        },
        'story-remove-yourself': 'Удалите себя',
        'story-remove-yourself-are-you-sure': 'Вы действительно хотите удалить себя как соавтор?',
        'story-status-transcoding-$progress': (progress) => {
            return `Tранскодирование (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Загрузка (${progress}%)`;
        },
        'story-survey': 'Опрос',
        'story-task-list': 'Список задач',
        'story-video': 'Видео',
        'story-vote-submit': 'Отправить',

        'telephone-dialog-close': 'Закрыть',

        'time-yesterday': 'Вчера',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files;
            if (singularN(count)) {
                files = `${count} файл`;
            } else if (singularG(count)) {
                files = `${count} файлов`;
            } else {
                files = `${count} файлов`;
            }
            return `Загрузка ${files}, оставшихся ${size}`;
        },

        'user-actions': 'Действия',

        'user-activity-$name-created-branch': (name) => {
            var e = pastTenseEnding(name);
            return `Создал${e} новую ветку`;
        },
        'user-activity-$name-created-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `Отправил${e} a запрос слияния`;
        },
        'user-activity-$name-created-milestone': (name) => {
            var e = pastTenseEnding(name);
            return `Создал${e} веху`;
        },
        'user-activity-$name-created-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Создал${e} проект git`;
        },
        'user-activity-$name-edited-wiki-page': (name) => {
            var e = pastTenseEnding(name);
            return `Редактировал${e} страницу wiki`;
        },
        'user-activity-$name-joined-repo': (name) => {
            var e = reflective(pastTenseEnding(name));
            return `Присоединил${e} к проекту git`
        },
        'user-activity-$name-left-repo': (name) => {
            var e = pastTenseEnding(name);
            return `Оставил${e} проект git`;
        },
        'user-activity-$name-merged-code': (name) => {
            var e = pastTenseEnding(name);
            return `Выполнил${e} слияние`;
        },
        'user-activity-$name-opened-issue': (name) => {
            var e = pastTenseEnding(name);
            return `Открыл${e} отчёт об ошибке`;
        },
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios;
            if (singularN(count)) {
                audios = `аудиоклип`;
            } else if (singularG(count)) {
                audios = `${count} аудиоклипа`;
            } else {
                audios = `${count} аудиоклипов`;
            }
            var e = pastTenseEnding(name);
            return `Опубликовал${e} ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links;
            if (singularN(count)) {
                links = `веб-ссылка`;
            } else if (singularG(count)) {
                links = `${count} веб-ссылки`;
            } else {
                links = `${count} веб-ссылок`;
            }
            var e = pastTenseEnding(name);
            return `Опубликовал${e} ${links}`;
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures;
            if (singularN(count)) {
                pictures = `фото`;
            } else if (singularG(count)) {
                pictures = `фото`;
            } else {
                pictures = `фото`;
            }
            var e = pastTenseEnding(name);
            return `Опубликовал${e} ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos;
            if (singularN(count)) {
                videos = `видеоклип`;
            } else if (singularG(count)) {
                videos = `${count} видеоклипа`;
            } else {
                videos = `${count} видеоклипов`;
            }
            var e = pastTenseEnding(name);
            return `Опубликовал${e} ${videos}`;
        },
        'user-activity-$name-pushed-code': (name) => {
            var e = pastTenseEnding(name);
            return `Отправил${e} код в репозиторий`;
        },
        'user-activity-$name-started-survey': (name) => {
            var e = pastTenseEnding(name);
            return `Начал${e} опрос`;
        },
        'user-activity-$name-started-task-list': (name) => {
            var e = pastTenseEnding(name);
            return `Начал${e} список задач`;
        },
        'user-activity-$name-wrote-post': (name) => {
            var e = pastTenseEnding(name);
            return `Написал${e} сообщение`;
        },
        'user-activity-more': 'Более...',

        'user-image-remove': 'Удалить',
        'user-image-select': 'Выбрать',
        'user-image-snap': 'Камера',

        'user-info-email': 'Адрес электронной почты',
        'user-info-gender': 'Пол',
        'user-info-gender-female': 'Женский',
        'user-info-gender-male': 'Мужской',
        'user-info-gender-unspecified': 'Неопределенный',
        'user-info-name': 'Имя и фамилия',
        'user-info-phone': 'Номер телефона',

        'user-statistics-legend-branch': 'Ветки',
        'user-statistics-legend-issue': 'отчёты об ошибке',
        'user-statistics-legend-merge': 'Слияния',
        'user-statistics-legend-merge-request': 'Запросы слияния',
        'user-statistics-legend-milestone': 'Вехи',
        'user-statistics-legend-post': 'Сообщения',
        'user-statistics-legend-push': 'Помещения',
        'user-statistics-legend-repo': 'Изменения репозитория',
        'user-statistics-legend-survey': 'Опросы',
        'user-statistics-legend-task-list': 'Списки задач',
        'user-statistics-legend-wiki': 'Правки wiki',
        'user-statistics-today': 'Cегодня',
        'user-statistics-tooltip-$count-branch': (count) => {
            if (singularN(count)) {
                return `${count} ветка`;
            } else if (singularG(count)) {
                return `${count} ветки`;
            } else {
                return `${count} веток`;
            }
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            if (singularN(count)) {
                return `${count} выпуск`;
            } else if (singularG(count)) {
                return `${count} выпуска`;
            } else {
                return `${count} выпусков`;
            }
        },
        'user-statistics-tooltip-$count-member': (count) => {
            if (singularN(count)) {
                return `${count} изменение членства`;
            } else if (singularG(count)) {
                return `${count} изменения членства`;
            } else {
                return `${count} изменений членства`;
            }
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            if (singularN(count)) {
                return `${count} слияние`;
            } else if (singularG(count)) {
                return `${count} слияния`;
            } else {
                return `${count} слияний`;
            }
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            if (singularN(count)) {
                return `${count} веха`;
            } else if (singularG(count)) {
                return `${count} вехи`;
            } else {
                return `${count} вех`;
            }
        },
        'user-statistics-tooltip-$count-post': (count) => {
            if (singularN(count)) {
                return `${count} сообщение`;
            } else if (singularG(count)) {
                return `${count} сообщений`;
            } else {
                return `${count} сообщений`;
            }
        },
        'user-statistics-tooltip-$count-push': (count) => {
            if (singularN(count)) {
                return `${count} помещение`;
            } else if (singularG(count)) {
                return `${count} помещения`;
            } else {
                return `${count} помещений`;
            }
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            if (singularN(count)) {
                return `${count} изменение репозитория`;
            } else if (singularG(count)) {
                return `${count} изменения репозитория`;
            } else {
                return `${count} изменений репозитория`;
            }
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            if (singularN(count)) {
                return `${count} опрос`;
            } else if (singularG(count)) {
                return `${count} опроса`;
            } else {
                return `${count} опросов`;
            }
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            if (singularN(count)) {
                return `${count} список задач`;
            } else if (singularG(count)) {
                return `${count} списка задач`;
            } else {
                return `${count} списков задач`;
            }
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            if (singularN(count)) {
                return `${count} правка wiki`;
            } else if (singularG(count)) {
                return `${count} правки wiki`;
            } else {
                return `${count} правок wiki`;
            }
        },

        'video-capture-accept': 'Принять',
        'video-capture-cancel': 'Отмена',
        'video-capture-pause': 'Приостановить',
        'video-capture-resume': 'Возобновить',
        'video-capture-retake': 'Пересдавать',
        'video-capture-start': 'Начать',
        'video-capture-stop': 'Прекратить',
    };
};

function singularN(n) {
    return n === 1;
}

function singularG(n) {
    if (n < 10 || (n > 20 && n < 100)) {
        var ld = n % 10;
        if (ld === 2 || ld === 3 || ld === 4) {
            return true;
        }
    }
    return false;
}

function gender(name) {
    if (name) {
        if (name.gender) {
            return name.gender;
        }
        var parts = name.split(/\s+/);
        if (parts > 1) {
            // check patronymic and family name
            for (var i = 1; i < parts.length; i++) {
                if (/а$/.test(parts[i])) {
                    return 'female';
                }
            }
        } else {
            var fname = name.toLocaleLowerCase();
            if(fname) {
                if (isFeminine[fname]) {
                    return 'female';
                }
            }
        }
    }
    return 'male';
}

var isFeminine = {};
[
    'Анна',
    'Алла',
    'Анастасия',
    'Аня',
    'Валерия',
    'Варвара',
    'Варя',
    'Вера',
    'Вероника',
    'Галина',
    'Галя',
    'Дарья',
    'Даша',
    'Екатерина',
    'Елена',
    'Елизавета',
    'Зина',
    'Зинаида',
    'Инна',
    'Ира',
    'Ирина',
    'Катя',
    'Ксения',
    'Ксюша',
    'Лара',
    'Лариса',
    'Лена',
    'Лера',
    'Лида',
    'Лидия',
    'Лиза',
    'Люба',
    'Любовь',
    'Люда',
    'Людмила',
    'Люся',
    'Марина',
    'Мария',
    'Марья',
    'Маша',
    'Мила',
    'Надежда',
    'Надя',
    'Настя',
    'Ната',
    'Наталья',
    'Наташа',
    'Оксана',
    'Ольга',
    'Оля',
    'Света',
    'Светлана',
    'Таня',
    'Татьяна',
    'Юлия',
    'Юля',
    'Яна',
].forEach((name) => {
    isFeminine[name.toLocaleLowerCase()] = true;
});

function pastTenseEnding(name) {
    if (gender(name) === 'female') {
        return 'а';
    } else {
        return '';
    }
}

function reflective(e) {
    if (e) {
        return е + 'сь';
    } else {
        return 'ся';
    }
}
