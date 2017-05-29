module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Трамбар',
        'bottom-nav-bookmarks': 'закладки',
        'bottom-nav-news': 'новости',
        'bottom-nav-notifications': 'уведомления',
        'bottom-nav-people': 'люди',
        'bottom-nav-settings': 'настройки',
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
