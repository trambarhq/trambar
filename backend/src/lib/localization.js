import _ from 'lodash';

/**
 * Return a string object of the name with the gender attached
 *
 * @param  {String} locale
 * @param  {User} user
 *
 * @return {Object}
 */
function name(locale, user) {
    let lang = getLanguageCode(locale);
    let name = pick(locale, user.details.name);
    if (!name) {
        name = _.capitalize(user.username);
    }
    let strObject = new String(name);
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
    let table = phraseTables[locale];
    if (!table) {
        let lang = getLanguageCode(locale);
        let module;
        try {
            module = require(`locales/${lang}`);
        } catch(err) {
            module = require('locales/en');
        }
        let phrases = module.phrases;
        if (phrases instanceof Function) {
            let country = getCountryCode(locale);
            phrases = phrases(country);
        }
        table = phraseTables[locale] = phrases;
    }
    let f = table[phrase];
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

let phraseTables = {};

/**
 * Return a text from a multilingual text object
 *
 * @param  {String} locale
 * @param  {Object} versions
 *
 * @return {String}
 */
function pick(locale, versions) {
    let s;
    if (typeof(versions) === 'object') {
        let lang = getLanguageCode(locale);
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
    let lang = _.get(system, 'settings.input_languages.0');
    if (!lang) {
        lang = serverLanguageCode;
    }
    return lang;
}

let serverLanguageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

/**
 * Extract language code from locale code
 *
 * @param  {String} locale
 *
 * @return {String}
 */
function getLanguageCode(locale) {
    let lang;
    if (typeof(locale) === 'string') {
        lang = _.toLower(locale.substr(0, 2));
    }
    if (!lang) {
        lang = getDefaultLanguageCode();
    }
    return lang;
}

function getCountryCode(locale) {
    let country = '';
    if (typeof(locale) === 'string') {
        country = _.toLower(locale.substr(3, 2));
    }
    return country;
}

export {
    translate,
    name,
    pick,
    getDefaultLanguageCode,
};
