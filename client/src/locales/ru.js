module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Трамбар',
        'bottom-nav-bookmarks': 'закладки',
        'bottom-nav-news': 'новости',
        'bottom-nav-notifications': 'уведомления',
        'bottom-nav-people': 'люди',
        'bottom-nav-settings': 'настройки',

        'photo-capture-accept': 'Принять',
        'photo-capture-cancel': 'Отмена',
        'photo-capture-retake': 'Переделать',
        'photo-capture-snap': 'Сделать',

        'selection-cancel': 'Отмена',
        'selection-ok': 'ОК',

        'story-$1-user-reacted-to-story': ($1) => {
            if (singularN($1)) {
                return `1 человек отреагировал на новости`;
            } else if (singularG($1)) {
                return `${$1} человека отреагировало на новости`;
            } else {
                return `${$1} человек отреагировало на новости`;
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
    }
    var languageName = 'Русский';
    var scriptDirection = 'ltr';
    var countries = {
        am: 'Армения',
        by: 'Беларусь',
        ge: 'Грузия',
        lv: 'Латвия',
        kz: 'Казахстан',
        kg: 'Киргизия',
        lt: 'Литва',
        ru: 'Россия',
        tj: 'Таджикистан',
        ua: 'Украина',
        uz: 'Узбекистан',
        es: 'Эстония',
    };
    var countryCode = 'ru';
    return {
        languageName,
        scriptDirection,
        countryCode,
        countries,
        phrases,
    };
};

function singularN(n) {
    return n === 1;
}

function singularG(n) {
    return n === 2 || n === 3 || n === 4;
}
