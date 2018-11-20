import 'moment/locale/ru';
import {
    cardinal,
    gender,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/russian';

let phrases = {
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
        return cardinal(count, '1 новая закладка', '2 новые закладки', '5 новых закладок');
    },
    'alert-$count-new-notifications': (count) => {
        return cardinal(count, '1 новое уведомление', '2 новых уведомления', '5 новых уведомлений');
    },
    'alert-$count-new-stories': (count) => {
        return cardinal(count, '1 новый рассказ', '2 новых рассказа', '5 новых рассказов');
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
        return cardinal(count, '1 другой пользователь', '2 других пользователя', '5 других пользователей');
    },
    'bookmark-$count-users': (count) => {
        return cardinal(count, '1 пользователь', '2 пользователя', '5 пользователей');
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} рекомендует это`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name1, name2) => {
        return [ name1, ` и `, name2, ` рекомендуют это` ];
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
    'issue-export-$names-posted-$photos-$videos-$audios': (names, photos, videos, audios) => {
        let objects = [];
        let ae;
        if (photos > 0) {
            objects.push(photos === 1 ? 'изображение' : 'изображения');
            ae = (photos === 1) ? 'ий' : 'ие';
        }
        if (videos > 0) {
            objects.push(videos === 1 ? 'видеоклип' : 'видеоклипы');
            if (!ae) {
                ae = (photos === 1) ? 'ий' : 'ие';
            }
        }
        if (audios > 0) {
            objects.push(audios === 1 ? 'аудиоклип' : 'аудиоклипы');
            if (!ae) {
                ae = (photos === 1) ? 'ий' : 'ие';
            }
        }
        let ve = pastTenseEnding(names, names.length > 1);
        return `${list(names)} размести${ve} следующ${ae} ${list(objects)}:`;
    },
    'issue-export-$names-wrote': (names) => {
        let e = pastTenseEnding(names, names.length > 1);
        return `${list(names)} написа${e}:`;
    },
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
        let e = pastTenseEnding(name);
        return `${name} предложи${e} вам совместно редактировать сообщение`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        let e = pastTenseEnding(name);
        return `${name} добави${e} ваше сообщение в баг трекер`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'ваш опрос'; break;
            case 'task-list': story = 'ваш список задач'; break;
            case 'post': 'ваше сообщение'; break;
            default: story = 'ваш рассказ';
        }
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        let e = pastTenseEnding(name);
        return `${name} выполнил задачу в вашем списке`;
    },
    'notification-$name-is-assigned-to-your-issue': (name) => {
        let ve = pastTenseEnding(name);
        let ae = ve.substr(1);
        return `${name} бы${ve} назначен${ae} на ваш отчёт об ошибке`;
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
        let e = pastTenseEnding(name);
        return `${name} сли${e} изменения в ветку «${branch}»`;
    },
    'notification-$name-opened-an-issue': (name) => {
        let e = pastTenseEnding(name);
        return `${name} написа${e} отчёт об ошибке`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        let e = pastTenseEnding(name);
        switch (story) {
            case 'push': story = 'ваш коммит'; break;
            case 'issue': story = 'ваш отчёт об ошибке'; break;
            case 'merge-request': story = 'ваш слияния'; break;
        }
        return `${name} прокомментирова${e} ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        let e = pastTenseEnding(name);
        return `${name} опубликова${e} опрос`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        let e = pastTenseEnding(name);
        return `${name} отправи${e} изменения в ветку «${branch}»`;
    },
    'notification-$name-requested-to-join': (name) => {
        let e = pastTenseEnding(name);
        return `${name} попроси${e} присоединиться к проекту`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'опрос'; break;
            case 'task-list': story = 'список задач'; break;
            case 'post': story = 'сообщение'; break;
            default: story = 'рассказ';
        }
        let e = pastTenseEnding(name);
        return `${name} отправи${e} вам закладку в ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        let e = pastTenseEnding(name);
        return `${name} ответи${e} на ваш опрос`;
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
    'option-statistics-14-days': 'Показать действия за последние 14 дней',
    'option-statistics-biweekly': 'Показать двухнедельные',
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
    'qr-scanner-code-found': 'QR-код найден',
    'qr-scanner-code-invalid': 'Неверный QR-код',
    'qr-scanner-code-used': 'Устаревший QR-код',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        let e = pastTenseEnding(name);
        return `${name} добави${e} это сообщение в баг трекер`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        let e = pastTenseEnding(name);
        return `${name} проголосова${e}`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} эту ветку`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} эту проблему`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} это слияние`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} этот запрос слияния`;
    },
    'reaction-$name-commented-on-push': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} это помещение`;
    },
    'reaction-$name-commented-on-tag': (name) => {
        let e = pastTenseEnding(name);
        return `${name} прокомментирова${e} этот тег`;
    },
    'reaction-$name-completed-a-task': (name) => {
        let e = pastTenseEnding(name);
        return `${name} выполнил задачу`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        let ve = pastTenseEnding(name);
        let ae = ve.substr(1);
        return `${name} бы${ve} назначен${ae} на этот отчёт об ошибке`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        let e = pastTenseEnding(name);
        let ae = ve.substr(1);
        return `${name} бы${ve} назначен${ae} на этот запрос слияния`;
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
        return cardinal(count, '1 реакция', '2 реакции', '5 реакций');
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name);
        return `Созда${e} ветку «${branch}» в репозитории «${repo}»`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        let e = pastTenseEnding(name);
        return `Созда${e} веху «${milestone}»`;
    },
    'story-$name-created-$page': (name, page) => {
        let e = pastTenseEnding(name);
        return `Созда${e} wiki-страницу «${page}»`;
    },
    'story-$name-created-$repo': (name, repo) => {
        let e = pastTenseEnding(name);
        let text = `Создал репозиторий`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-created-$tag-in-$repo': (name, tag, repo) => {
        let e = pastTenseEnding(name);
        return `Созда${e} тег «${tag}» в репозитории «${repo}»`;
    },
    'story-$name-deleted-$page': (name, page) => {
        let e = pastTenseEnding(name);
        return `Удали${e} wiki-страницу «${page}»`;
    },
    'story-$name-deleted-$repo': (name, repo) => {
        let text = `Удали${e} проект`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-imported-$repo': (name, repo) => {
        let text = `Импортирова${e} проект`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-joined-$repo': (name, repo) => {
        let e = reflective(pastTenseEnding(name));
        let text = `Присоедини${e} к репозиторию`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        let e = pastTenseEnding(name);
        let text = `Остави${e} репозиторий`;
        if (repo) {
            text += ` «${repo}»`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
        let e = pastTenseEnding(name);
        let text = `Сли${e} изменения`;
        if (branches && branches.length > 0) {
            let sources = branches.map((branch) => {
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
        let e = pastTenseEnding(name);
        let text = `Написа${e} отчёт ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        let e = pastTenseEnding(name);
        let text = `Отправи${e} изменения в ветку «${branch}»`;
        if (repo) {
            text += ` репозитория «${repo}»`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        let e = pastTenseEnding(name);
        return `Попроси${e} слить ветку «${branch1}» в ветку «${branch2}»`;
    },
    'story-$name-updated-$page': (name, page) => {
        let e = pastTenseEnding(name);
        return `Обнови${e} wiki-страницу «${page}»`;
    },
    'story-add-coauthor': 'Добавить соавтора',
    'story-add-remove-coauthor': 'Добавить/удалить соавтора',
    'story-audio': 'Аудио',
    'story-author-$count-others': (count) => {
        return `${count} других`;
    },
    'story-author-$name1-and-$name2': (name1, name2) => {
        return [ name1, ` и `, name2 ];
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
        let files = cardinal(count, '1 файл', '2 файла', '5 файлов');
        return `${files} добавлено`;
    },
    'story-push-added-$count-lines': (count) => {
        let lines = cardinal(count, '1 линия', '2 линии', '5 линий');
        return `${lines} добавлено`;
    },
    'story-push-components-changed': 'Изменено следующие части:',
    'story-push-deleted-$count-files': (count) => {
        let files = cardinal(count, '1 файл', '2 файла', '5 файлов');
        return `${files} удалено`;
    },
    'story-push-deleted-$count-lines': (count) => {
        let lines = cardinal(count, '1 линия', '2 линии', '5 линий');
        return `${lines} удалено`;
    },
    'story-push-modified-$count-files': (count) => {
        let files = cardinal(count, '1 файл', '2 файла', '5 файлов');
        return `${files} изменено`;
    },
    'story-push-modified-$count-lines': (count) => {
        let lines = cardinal(count, '1 линия', '2 линии', '5 линий');
        return `${lines} изменено`;
    },
    'story-push-renamed-$count-files': (count) => {
        let files = cardinal(count, '1 файл', '2 файла', '5 файлов');
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

    'time-$days-ago': (days) => {
        let time = cardinal(days, 'День', '2 дня', '5 дней');
        return `${time} назад`;
    },
    'time-$hours-ago': (hours) => {
        let time = cardinal(hours, 'Час', '2 часа', '5 часов');
        return `${time} назад`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} ч. назад`;
    },
    'time-$min-ago': (min) => {
        return `${min} м. назад`;
    },
    'time-$minutes-ago': (minutes) => {
        let time = cardinal(minutes, 'Минута', '2 минуты', '5 минут');
        return `${time} назад`;
    },
    'time-just-now': 'Прямо сейчас',
    'time-yesterday': 'Вчера',

    'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
        let files = (count === 1) ? `1 файла` : `${count} файлов`;
        return `Загрузка ${files}, оставшихся ${size}`;
    },

    'user-actions': 'Действия',

    'user-activity-$name-created-branch': (name) => {
        let e = pastTenseEnding(name);
        return `Созда${e} новую ветку`;
    },
    'user-activity-$name-created-merge-request': (name) => {
        let e = pastTenseEnding(name);
        return `Отправи${e} a запрос слияния`;
    },
    'user-activity-$name-created-milestone': (name) => {
        let e = pastTenseEnding(name);
        return `Созда${e} веху`;
    },
    'user-activity-$name-created-repo': (name) => {
        let e = pastTenseEnding(name);
        return `Созда${e} проект git`;
    },
    'user-activity-$name-created-tag': (name) => {
        let e = pastTenseEnding(name);
        return `Созда${e} новый тег`;
    },
    'user-activity-$name-deleted-repo': (name) => {
        let e = pastTenseEnding(name);
        return `Удали${e} проект git`;
    },
    'user-activity-$name-edited-wiki-page': (name) => {
        let e = pastTenseEnding(name);
        return `Редактирова${e} страницу wiki`;
    },
    'user-activity-$name-imported-repo': (name) => {
        let e = pastTenseEnding(name);
        return `Импортирова${e} проект git`;
    },
    'user-activity-$name-joined-repo': (name) => {
        let e = reflective(pastTenseEnding(name));
        return `Присоедини${e} к проекту git`
    },
    'user-activity-$name-left-repo': (name) => {
        let e = pastTenseEnding(name);
        return `Остави${e} проект git`;
    },
    'user-activity-$name-merged-code': (name) => {
        let e = pastTenseEnding(name);
        return `Выполни${e} слияние`;
    },
    'user-activity-$name-posted-$count-audio-clips': (name, count) => {
        let audios = cardinal(count, 'аудиоклип', '2 аудиоклипа', '5 аудиоклипов');
        let e = pastTenseEnding(name);
        return `Опубликова${e} ${audios}`;
    },
    'user-activity-$name-posted-$count-links': (name, count) => {
        let links = cardinal(count, 'веб-ссылка', '2 веб-ссылки', '5 веб-ссылок');
        let e = pastTenseEnding(name);
        return `Опубликова${e} ${links}`;
    },
    'user-activity-$name-posted-$count-pictures': (name, count) => {
        let pictures = cardinal(count, 'фото', '2 фото', '5 фото');
        let e = pastTenseEnding(name);
        return `Опубликова${e} ${pictures}`;
    },
    'user-activity-$name-posted-$count-video-clips': (name, count) => {
        let videos = cardinal(count, 'видеоклип', '2 видеоклипа', '5 видеоклипов');
        let e = pastTenseEnding(name);
        return `Опубликова${e} ${videos}`;
    },
    'user-activity-$name-pushed-code': (name) => {
        let e = pastTenseEnding(name);
        return `Отправи${e} код в репозиторий`;
    },
    'user-activity-$name-reported-issue': (name ) => {
        let e = pastTenseEnding(name);
        return `Сообщи${e} о проблеме`;
    },
    'user-activity-$name-started-survey': (name) => {
        let e = pastTenseEnding(name);
        return `Нача${e} опрос`;
    },
    'user-activity-$name-started-task-list': (name) => {
        let e = pastTenseEnding(name);
        return `Нача${e} список задач`;
    },
    'user-activity-$name-wrote-post': (name) => {
        let e = pastTenseEnding(name);
        return `Написа${e} сообщение`;
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
    'user-statistics-legend-tag': 'Теги',
    'user-statistics-legend-task-list': 'Списки задач',
    'user-statistics-legend-wiki': 'Правки wiki',
    'user-statistics-today': 'Cегодня',
    'user-statistics-tooltip-$count-branch': (count) => {
        return cardinal(count, '1 ветка', '2 ветки', '5 веток');
    },
    'user-statistics-tooltip-$count-issue': (count) => {
        return cardinal(count, '1 отчёт', '2 отчёта', '5 отчётов');
    },
    'user-statistics-tooltip-$count-member': (count) => {
        return cardinal(count, '1 изменение членства', '2 изменения членства', '5 изменений членства');
    },
    'user-statistics-tooltip-$count-merge': (count) => {
        return cardinal(count, '1 слияние', '2 слияния', '5 слияний');
    },
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return cardinal(count, '1 запрос слияния', '2 запроса слияния', '5 запросов слияния');
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return cardinal(count, '1 веха', '2 вехи', '5 вех');
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return cardinal(count, '1 сообщение', '2 сообщений', '5 сообщений');
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return cardinal(count, '1 помещение', '2 помещения', '5 помещений');
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return cardinal(count, '1 изменение репозитория', '2 изменения репозитория', '5 изменений репозитория');
    },
    'user-statistics-tooltip-$count-survey': (count) => {
        return cardinal(count, '1 опрос', '2 опроса', '5 опросов');
    },
    'user-statistics-tooltip-$count-tag': (count) => {
        return cardinal(count, '1 тег', '2 теги', '5 тегов');
    },
    'user-statistics-tooltip-$count-task-list': (count) => {
        return cardinal(count, '1 список задач', '2 списка задач', '5 списков задач');
    },
    'user-statistics-tooltip-$count-wiki': (count) => {
        return cardinal(count, '1 правка wiki', '2 правки wiki', '5 правок wiki');
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

module.exports = {
    phrases,
    genderize,
};
