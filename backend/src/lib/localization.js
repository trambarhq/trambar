module.exports = {
    translate,
    name,
    pick,
};

function name(locale, user) {
    var lang = getLanguageCode(locale);
    var name = pick(locale, user.details.name);
    var strObject = new String(name);
    strObject.gender = user.details.gender;
    return strObject;
}

var phraseTables = {};

function translate(locale, phrase, ...args) {
    var table = phraseTables[locale];
    if (!table) {
        var lang = locale.substr(0, 2);
        var module;
        try {
            module = require(`locales/${lang}`);
        } catch(err) {
            module = require('locales/en');
        }
        table = phraseTables[lang] = module(locale);
    }
    var f = table[phrase];
    if (f instanceof Function) {
        return f.apply(table, args);
    } else {
        return String(f);
    }
}

function pick(locale, versions) {
    var s;
    if (typeof(versions) === 'object') {
        var lang = getLanguageCode(locale);
        s = versions[lang];
        if (!s) {
            var codes = Object.keys(versions);
            s = versions[codes[0]];
        }
    } else {
        s = String(versions);
    }
    return s;
}

function getLanguageCode(locale) {
    var lang;
    if (typeof(locale) === 'string') {
        lang = locale.substr(0, 2);
    }
    if (!lang) {
        lang = (process.env.LANG || 'en').substr(0, 2).toLowerCase();
    }
    return lang;
}
