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

        'app-component-close': 'Закрыть',

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

        'bookmarks-no-bookmarks': 'Без закладок',

        'bottom-nav-bookmarks': 'Закладки',
        'bottom-nav-news': 'Новости',
        'bottom-nav-notifications': 'Уведомления',
        'bottom-nav-people': 'Люди',
        'bottom-nav-settings': 'Настройки',

        'confirmation-cancel': 'Отмена',
        'confirmation-confirm': 'Подтвердить',

        'development-code-push-$deployment': (deployment) => {
            return `Получите обновления кода с "${deployment}"`;
        },
        'development-show-diagnostics': 'Показать диагностику',
        'development-show-panel': 'Показать эту панель',

        'device-selector-camera-$number': (number) => {
            return `Камера ${number}`;
        },
        'device-selector-camera-back': 'Задняя',
        'device-selector-camera-front': 'Передняя',
        'device-selector-mic-$number': (number) => {
            return `Микрофон ${number}`;
        },

        'empty-currently-offline': 'Вы не подключены к Интернету',

        'image-editor-page-rendering-in-progress': 'Создание предварительного просмотра веб-сайта...',
        'image-editor-poster-extraction-in-progress': 'Извлечение предварительного просмотра из видео...',
        'image-editor-upload-in-progress': 'Загрузка выполняется...',

        'issue-cancel': 'Отмена',
        'issue-delete': 'Удалить',
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

        'membership-request-$you-are-member': 'Вы являетесь участником этого проекта',
        'membership-request-$you-are-now-member': 'Вы теперь являетесь участником этого проекта',
        'membership-request-$you-have-requested-membership': 'Вы запросили членство в этом проекте',
        'membership-request-browse': 'Просматривать',
        'membership-request-cancel': 'Отмена',
        'membership-request-join': 'Присоединиться',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Проследовать',
        'membership-request-withdraw': 'Отзывать',

        'mobile-device-revoke': 'отмени',
        'mobile-device-revoke-are-you-sure': 'Вы действительно хотите отменить авторизацию этого устройства?',

        'mobile-setup-address': 'Адрес сервера',
        'mobile-setup-close': 'Закрыть',
        'mobile-setup-code': 'Код авторизации',
        'mobile-setup-project': 'Проект',

        'news-no-stories-by-role': 'Никаких рассказов кем-то с этой ролью',
        'news-no-stories-found': 'Не найдено совпадающих рассказов',
        'news-no-stories-on-date': 'Нет рассказов этой даты',
        'news-no-stories-yet': 'Нет рассказов',

        'notification-$name-added-you-as-coauthor': (name) => {
            var e = pastTenseEnding(name);
            return `${name} предложил${e} вам совместно редактировать сообщение`;
        },
        'notification-$name-added-your-post-to-issue-tracker': (name) => {
            var e = pastTenseEnding(name);
            return `${name} добавил${e} ваше сообщение в баг трекер`;
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
        'notification-$name-is-assigned-to-your-issue': (name) => {
            var ve = pastTenseEnding(name);
            var ae = ve;
            return `${name} был${ve} назначен${ae} на ваш отчёт об ошибке`;
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
        'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
            reaction = 'в комментарии';
            return `${name} упомянул вас ${reaction}`;
        },
        'notification-$name-mentioned-you-in-$story': (name, story) => {
            switch (story) {
                case 'survey': story = 'в опросе'; break;
                case 'task-list': story = 'в списке задач'; break;
                case 'post': story = 'в сообщении'; break;
                case 'issue': story = 'в отчёте об ошибке'; break;
                case 'merge-request': story = 'в запросе слияния'; break;
                default: story = 'в рассказе';
            }
            return `${name} упомянул вас ${story}`;
        },
        'notification-$name-merged-code-to-$branch': (name, branch) => {
            var e = pastTenseEnding(name);
            return `${name} слил${e} изменения в ветку «${branch}»`;
        },
        'notification-$name-opened-an-issue': (name) => {
            var e = pastTenseEnding(name);
            return `${name} написал${e} отчёт об ошибке`;
        },
        'notification-$name-posted-a-note-about-your-$story': (name, story) => {
            var e = pastTenseEnding(name);
            switch (story) {
                case 'push': story = 'ваш коммит'; break;
                case 'issue': story = 'ваш отчёт об ошибке'; break;
                case 'merge-request': story = 'ваш слияния'; break;
            }
            return `${name} прокомментировал${e} ${story}`;
        },
        'notification-$name-posted-a-survey': (name) => {
            var e = pastTenseEnding(name);
            return `${name} опубликовал${e} опрос`;
        },
        'notification-$name-pushed-code-to-$branch': (name, branch) => {
            return `${name} отправил${e} изменения в ветку «${branch}»`;
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
        'notification-option-assignment': 'Когда кто-то назначен на вашу проблему',
        'notification-option-bookmark': 'Когда кто-то отправляет вам закладку',
        'notification-option-coauthor': 'Когда кто-то приглашает вас совместно редактировать сообщение',
        'notification-option-comment': 'Когда кто-то комментирует ваш рассказ',
        'notification-option-issue': 'Когда кто-то пишет отчёт об ошибке',
        'notification-option-join-request': 'Когда кто-то хочет присоединиться к проекту',
        'notification-option-like': 'Когда кому-то нравится ваш рассказ',
        'notification-option-mention': 'Когда кто-то упоминает вас в истории или комментарии',
        'notification-option-merge': 'Когда кто-то сливает код в ветку «master»',
        'notification-option-note': 'Когда кто-то публикует заметку о коммите или отчёте об ошибке',
        'notification-option-push': 'Когда кто-то отправляет код в репозиторий git',
        'notification-option-survey': 'Когда кто-то публикует опрос',
        'notification-option-task-completion': 'Когда кто-то завершает задачу в вашем списке',
        'notification-option-vote': 'Когда кто-то отвечает на ваш опрос',
        'notification-option-web-session': 'Когда вы просматриваете этот сайт с помощью веб-браузера',

        'notifications-no-notifications-on-date': 'Нет уведомлений на эту дату',
        'notifications-no-notifications-yet': 'Пока нет уведомлений',

        'option-add-bookmark': 'Добавить закладку',
        'option-add-issue': 'Добавить сообщение в баг трекер',
        'option-bump-story': 'Продвинуть рассказ',
        'option-edit-comment': 'Редактировать комментарий',
        'option-edit-post': 'Редактировать сообщение',
        'option-hide-comment': 'Скрыть комментарий от гостей',
        'option-hide-story': 'Скрыть рассказ от гостей',
        'option-keep-bookmark': 'Удерживать закладку',
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
        'option-statistics-biweekly': 'Показать действия за последние 14 дней',
        'option-statistics-monthly': 'Показать ежемесячные мероприятия',
        'option-statistics-to-date': 'Показывать действия на сегодняшний день',

        'people-no-stories-found': 'Не найдено совпадающих рассказов',
        'people-no-stories-on-date': 'Никаких действий на эту дату',
        'people-no-users-by-role': 'Ни один из участников проекта не имеет такой роли',
        'people-no-users-yet': 'Пока нет участников проекта',

        'person-no-stories-found': 'Не найдено совпадающих рассказов',
        'person-no-stories-on-date': 'Нет рассказов этой даты',
        'person-no-stories-yet': 'Нет рассказов',

        'photo-capture-accept': 'Прими',
        'photo-capture-cancel': 'Отмена',
        'photo-capture-retake': 'Пересдавай',
        'photo-capture-snap': 'Сделать',

        'project-description-close': 'Закрыть',

        'project-management-add': 'Добавить',
        'project-management-cancel': 'Отмена',
        'project-management-description': 'описание проекта',
        'project-management-join-project': 'присоединиться к проекту',
        'project-management-manage': 'Управлять списком',
        'project-management-mobile-set-up': 'мобильная установка',
        'project-management-remove': 'Удалить',
        'project-management-sign-out': 'выход',
        'project-management-sign-out-are-you-sure': 'Вы действительно хотите выйти с этого сервера?',
        'project-management-withdraw-request': 'аннулировать запрос о членстве',

        'qr-scanner-cancel': 'Отмена',
        'qr-scanner-invalid-qr-code': 'Неверный QR-код',
        'qr-scanner-qr-code-found': 'QR-код найден',

        'reaction-$name-added-story-to-issue-tracker': (name) => {
            var e = pastTenseEnding(name);
            return `${name} добавил${e} это сообщение в баг трекер`;
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
            var ve = pastTenseEnding(name);
            var ae = ve;
            return `${name} был${ve} назначен${ae} на этот отчёт об ошибке`;
        },
        'reaction-$name-is-assigned-to-merge-request': (name) => {
            var e = pastTenseEnding(name);
            return `${name} был назначен на этот запрос слияния`;
        },
        'reaction-$name-is-editing': (name) => {
            return `${name} редактирует комментарий...`;
        },
        'reaction-$name-is-sending': (name) => {
            return `${name} отправляет комментарий...`;
        },
        'reaction-$name-is-writing': (name) => {
            return `${name} пишет комментарий...`;
        },
        'reaction-$name-likes-this': (name) => {
            return `${name} любит это`;
        },
        'reaction-status-storage-pending': 'в ожидании',
        'reaction-status-transcoding': 'Tранскодирование',
        'reaction-status-uploading': 'Загрузка',

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

        'settings-development': 'Параметры разработчика',
        'settings-device': 'Мобильное устройство',
        'settings-devices': 'Мобильные устройства',
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
        'start-activation-instructions': (ui) => {
            return [
                'Чтобы получить доступ к серверу Трамбар на этом устройстве, сначала войдите в сервер с помощью веб-браузера. Выберите проект, затем перейдите в страницу ',
                ui.settings,
                '. На панели ',
                ui.projects,
                ' нажмите ',
                ui.mobileSetup,
                '. На экране появится QR-код. Затем на этом устройстве нажмите кнопку ниже и сканируйте код. В качестве альтернативы вы можете вручную ввести код активации.'
            ];
        },
        'start-activation-instructions-short': (ui) => {
            return [
                'Войдите в систему через веб-браузер, затем сканируйте QR-код показанный на странице ',
                ui.settings,
                ' > ',
                ui.mobileSetup,
            ];
        },
        'start-activation-manual': 'Ввод вручную',
        'start-activation-new-server': 'Новый сервер',
        'start-activation-others-servers': 'Доступные серверы',
        'start-activation-return': 'Вернуть',
        'start-activation-scan-code': 'Сканировать QR-код',
        'start-error-access-denied': 'Запрос отклонен',
        'start-error-account-disabled': 'В настоящее время отключена учетная запись',
        'start-error-existing-users-only': 'Доступ к этой системе может получить только уполномоченный персонал',
        'start-error-undefined': 'Неожиданная ошибка',
        'start-no-projects': 'Нет проектов',
        'start-no-servers': 'Нет поставщиков OAuth',
        'start-projects': 'Проекты',
        'start-social-login': 'Социальный вход',
        'start-system-title-default': 'Трамбар',
        'start-welcome': 'Добро пожаловать!',
        'start-welcome-again': 'Добро пожаловать снова',

        'statistics-bar': 'Столбчатая',
        'statistics-line': 'Линейная',
        'statistics-pie': 'Круговая',

        'story-$count-reactions': (count) => {
            if (singularN(count)) {
                return `${count} реакция`;
            } else if (singularG(count)) {
                return `${count} реакции`;
            } else {
                return `${count} реакций`;
            }
        },
        'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            return `Создал${e} ветку «${branch}» в репозитории «${repo}»`;
        },
        'story-$name-created-$milestone': (name, milestone) => {
            var e = pastTenseEnding(name);
            return `Создал${e} веху «${milestone}»`;
        },
        'story-$name-created-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Создал${e} wiki-страницу «${page}»`;
        },
        'story-$name-created-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Создал репозиторий`;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-deleted-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Удалил${e} wiki-страницу «${page}»`;
        },
        'story-$name-joined-$repo': (name, repo) => {
            var e = reflective(pastTenseEnding(name));
            var text = `Присоединил${e} к репозиторию`;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-left-$repo': (name, repo) => {
            var e = pastTenseEnding(name);
            var text = `Оставил${e} репозиторий`;
            if (repo) {
                text += ` «${repo}»`;
            }
            return text;
        },
        'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Слил${e} изменения`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `«${branch}»`;
                });
                text += ` из`;
                if (branches.length > 1) {
                    text += ` веток`;
                } else {
                    text += ` ветки`;
                }
                text += ` ${sources.join(', ')}`;
            }
            text += ` в ветку «${branch}»`;
            if (repo) {
                text += ` репозитория «${repo}»`;
            }
            return text;
        },
        'story-$name-opened-issue-$number-$title': (name, number, title) => {
            var e = pastTenseEnding(name);
            var text = `Написал${e} отчёт ${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
            var e = pastTenseEnding(name);
            var text = `Отправил${e} изменения в ветку «${branch}»`;
            if (repo) {
                text += ` репозитория «${repo}»`;
            }
            return text;
        },
        'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
            var e = pastTenseEnding(name);
            return `Попросил${e} слить ветку «${branch1}» в ветку «${branch2}»`;
        },
        'story-$name-updated-$page': (name, page) => {
            var e = pastTenseEnding(name);
            return `Обновил${e} wiki-страницу «${page}»`;
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
        'story-status-storage-pending': 'в ожидании',
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

        'time-$hours-ago': (hours) => {
            if (singularN(hours)) {
                return `Час назад`;
            } else if (singularG(hours)) {
                return `${hours} часа назад`;
            } else {
                return `${hours} часов назад`;
            }
        },
        'time-$hr-ago': (hr) => {
            return `${hr} ч. назад`;
        },
        'time-$min-ago': (min) => {
            return `${min} м. назад`;
        },
        'time-$minutes-ago': (minutes) => {
            if (singularN(minutes)) {
                return `Минута назад`;
            } else if (singularG(minutes)) {
                return `${minutes} минуты назад`;
            } else {
                return `${minutes} минут назад`;
            }
        },
        'time-just-now': 'Прямо сейчас',
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
        'user-activity-$name-reported-issue': (name ) => {
            return `Сообщил${e} о проблеме`;
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
        'user-activity-back': 'Назад',
        'user-activity-more': 'Более',

        'user-image-adjust': 'Настроить',
        'user-image-cancel': 'Отмена',
        'user-image-replace': 'Заменить',
        'user-image-save': 'Сохранить',
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
        'user-statistics-legend-issue': 'Отчёты об ошибке',
        'user-statistics-legend-member': 'Изменения членства',
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
                return `${count} отчёт`;
            } else if (singularG(count)) {
                return `${count} отчёта`;
            } else {
                return `${count} отчётов`;
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
        'user-statistics-tooltip-$count-merge-request': (count) => {
            if (singularN(count)) {
                return `${count} запрос слияния`;
            } else if (singularG(count)) {
                return `${count} запроса слияния`;
            } else {
                return `${count} запросов слияния`;
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

        'warning-no-connection': 'Нет мгновенного обновления',
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
