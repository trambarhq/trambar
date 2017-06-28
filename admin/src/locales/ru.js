module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Трамбар',
        'app-title': 'Трамбар - Административная консоль',
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
