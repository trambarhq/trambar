var _ = require('lodash');

module.exports = {
    translate,
    name,
    pick,
    getDefaultLanguageCode,
};

/**
 * Return a string object of the name with the gender attached
 *
 * @param  {String} locale
 * @param  {User} user
 *
 * @return {Object}
 */
function name(locale, user) {
    var lang = getLanguageCode(locale);
    var name = pick(locale, user.details.name);
    if (!name) {
        name = _.capitalize(user.username);
    }
    var strObject = new String(name);
    strObject.gender = user.details.gender;
    return strObject;
}

/**
 * Return a phrase for the given locale
 *
 * @param  {String} locale
 * @param  {String} phrase
 * @param  {...} args
 *
 * @return {String}
 */
function translate(locale, phrase, ...args) {
    var table = phraseTables[locale];
    if (!table) {
        var lang = getLanguageCode(locale);
        var module;
        try {
            module = require(`locales/${lang}`);
        } catch(err) {
            module = require('locales/en');
        }
        table = phraseTables[lang] = module(locale);
    }
    var f = table[phrase];
    if (f === undefined) {
        return phrase;
    }
    if (f instanceof Function) {
        try {
            return f.apply(table, args);
        } catch (err) {
            return err.message;
        }
    } else {
        return f;
    }
}

var phraseTables = {};

/**
 * Return a text from a multilingual text object
 *
 * @param  {String} locale
 * @param  {Object} versions
 *
 * @return {String}
 */
function pick(locale, versions) {
    var s;
    if (typeof(versions) === 'object') {
        var lang = getLanguageCode(locale);
        s = versions[lang];
        if (!s) {
            s = _.first(versions);
        }
    } else {
        s = String(versions);
    }
    return s;
}

/**
 * Return the default input language
 *
 * @param  {System|undefined} system
 *
 * @return {String}
 */
function getDefaultLanguageCode(system) {
    var lang = _.get(system, 'settings.input_languages.0');
    console.log('default language = ' + lang);
    if (!lang) {
        lang = serverLanguageCode;
    }
    return lang;
}

var serverLanguageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

/**
 * Extract language code from locale code
 *
 * @param  {String} locale
 *
 * @return {String}
 */
function getLanguageCode(locale) {
    var lang;
    if (typeof(locale) === 'string') {
        lang = locale.substr(0, 2);
    }
    if (!lang) {
        lang = getDefaultLanguageCode();
    }
    return lang;
}
