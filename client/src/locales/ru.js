require('moment/locale/ru');

module.exports = function(localeCode) {
    return {
        'app-name': 'Трамбар',
        'bottom-nav-bookmarks': 'Закладки',
        'bottom-nav-news': 'Новости',
        'bottom-nav-notifications': 'Уведомления',
        'bottom-nav-people': 'Люди',
        'bottom-nav-settings': 'Настройки',

        'photo-capture-accept': 'Принять',
        'photo-capture-cancel': 'Отмена',
        'photo-capture-retake': 'Переделать',
        'photo-capture-snap': 'Сделать',

        'selection-cancel': 'Отмена',
        'selection-ok': 'ОК',

        'settings-language': 'Язык',
        'settings-notification': 'Уведомление',
        'settings-projects': 'Проекты',
        'settings-user-profile': 'Профиль пользователя',

        'story-$count-user-reacted-to-story': (count) => {
            if (singularN(count)) {
                return `1 человек отреагировал на новости`;
            } else if (singularG(count)) {
                return `${count} человека отреагировало на новости`;
            } else {
                return `${count} человек отреагировало на новости`;
            }
        },
        'story-add-coauthor': 'Добавить соавтора',
        'story-add-remove-coauthor': 'Добавить/удалить соавтора',
        'story-cancel': 'Отмена',
        'story-comment': 'Комментировать',
        'story-like': 'Любить',
        'story-photo': 'Фото',
        'story-post': 'Слать',
        'story-video': 'Видео',
    };
};

function singularN(n) {
    return n === 1;
}

function singularG(n) {
    return n === 2 || n === 3 || n === 4;
}
