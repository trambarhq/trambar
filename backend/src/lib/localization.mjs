import _ from 'lodash';

async function load(locale) {
  if (!phraseTables[locale]) {
    const lang = getLanguageCode(locale);
    let module;
    try {
      module = await import(`./localization/client/${lang}.mjs`);
    } catch(err) {
      module = await import('./localization/client/en.mjs');
    }
    let phrases = module.phrases;
    if (phrases instanceof Function) {
      const country = getCountryCode(locale);
      phrases = phrases(country);
    }
    phraseTables[locale] = phrases;
  }
}

/**
 * Return a phrase for the given locale
 *
 * @param  {String} phrase
 * @param  {...} args
 * @param  {String} locale
 *
 * @return {String}
 */
function translate(phrase, args, locale) {
  const table = phraseTables[locale];
  if (!table) {
    throw new Error(`Locale not available: ${locale}`);
  }
  const f = table[phrase];
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

const phraseTables = {};

/**
 * Return a string object of the name with the gender attached
 *
 * @param  {User} user
 * @param  {String} locale
 *
 * @return {Object}
 */
function getUserName(user, locale) {
  const lang = getLanguageCode(locale);
  let name = pick(locale, user.details.name);
  if (!name) {
    name = _.capitalize(user.username);
  }
  const strObject = new String(name);
  strObject.gender = user.details.gender;
  return strObject;
}

/**
 * Return a text from a multilingual text object
 *
 * @param  {Object} versions
 * @param  {String} locale
 *
 * @return {String}
 */
function pick(versions, locale) {
  let s;
  if (typeof(versions) === 'object') {
    const lang = getLanguageCode(locale);
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

const serverLanguageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

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
  load,
  translate,
  pick,
  getUserName,
  getDefaultLanguageCode,
};
