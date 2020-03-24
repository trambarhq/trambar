import EventEmitter, { GenericEvent } from 'relaks-event-emitter';
import { difference } from '../utils/array-utils.js';

const defaultOptions = {
  defaultLocale: 'en-US',
  directory: [],
};

class LocaleManager extends EventEmitter {
  constructor(options) {
    super();

    this.options = {};
    for (let [ name, value ] of Object.entries(defaultOptions)) {
      if (options && options[name]) {
        this.options[name] = options[name];
      } else {
        this.options[name] = value;
      }
    }
    this.directory = this.options.directory;
    this.browserLocaleCode = getBrowserLocale();
    this.localeCode = '';
    this.languageCode = '';
    this.countryCode = '';
    this.phraseTable = {};
  }

  activate() {
    // check for locale change in browser settings
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  deactivate() {
    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  async start(locale) {
    const { defaultLocale } = this.options;
    if (!locale) {
      locale = this.browserLocaleCode;
      if (!locale) {
        locale = defaultLocale;
      }
    }
    try {
      await this.change(locale);
    } catch (err) {
      if (locale !== defaultLocale) {
        await this.change(defaultLocale);
      }
    }
  }

  /**
   * Look up a phrase in phrase dictionary
   *
   * @param  {String} phrase
   * @param  {*} ...args
   *
   * @return {String}
   */
  translate(phrase, ...args) {
    const entry = this.phraseTable[phrase];
    if (entry != null) {
      if (typeof(entry) === 'function') {
        try {
          const results = entry.apply(this, args);
          return results;
        } catch (err) {
          console.error(err);
          return `[${phrase}: ${err.message}]`;
        }
      } else {
        return entry;
      }
    } else {
      return phrase;
    }
  }

  /**
   * Pick language text from a text object
   *
   * @param  {Object|String} languageVersions
   * @param  {String} overrideLanguageCode
   *
   * @return {String}
   */
  pick(languageVersions, overrideLanguageCode) {
    if (typeof(languageVersions) === 'string') {
      return languageVersions;
    }
    // no support for country-specific versions
    const currentLanguageCode = this.languageCode;
    if (overrideLanguageCode) {
      currentLanguageCode = overrideLanguageCode.substr(0, 2);
    }
    let matchingPhrase = '';
    let firstNonEmptyPhrase = '';
    let defaultLanguageCode = this.options.defaultLocale.substr(0, 2);
    let defaultLanguagePhrase = '';
    for (let key in languageVersions) {
      const phrase = languageVersions[key];
      const localeCode = key.toLowerCase();
      if (localeCode === currentLanguageCode) {
        matchingPhrase = phrase;
      }
      if (!firstNonEmptyPhrase) {
        firstNonEmptyPhrase = phrase;
      }
      if (localeCode === defaultLanguageCode) {
        defaultLanguagePhrase = phrase;
      }
    }
    if (matchingPhrase) {
      return matchingPhrase;
    } else if (defaultLanguagePhrase) {
      return defaultLanguagePhrase;
    } else {
      return firstNonEmptyPhrase;
    }
  }

  /**
   * Switch to a different locale
   *
   * @param  {String} localeCode
   *
   * @return {Promise<Boolean>}
   */
  async change(localeCode) {
    localeCode = localeCode.toLowerCase();
    if (localeCode === this.localeCode) {
      return true;
    }
    const [ lc, cc ] = localeCode.split('-');
    const module = await this.loadModule(lc);
    this.phraseTable = this.getPhraseTable(module, cc);
    this.localeCode = localeCode;
    this.languageCode = lc;
    this.countryCode = /^[a-z]{2}$/.test(cc) ? cc : this.getDefaultCountry(lc);
    this.module = module;

    if (process.env.NODE_ENV !== 'production') {
      const unsorted = Object.keys(this.phraseTable);
      const targetKeys = unsorted.slice().sort();
      if (isEqual(targetKeys, unsorted)) {
        console.log(`The following phrases are out of order [${localeCode}]:`);
        for (let [ index, phrase ] of unsorted.entries()) {
          const unsortedIndex = targetKeys.indexOf(phrase);
          if (unsorted[sortedIndex - 1] !== targetKeys[index - 1]) {
            console.log(phrase);
          }
        }
      } else if (lc !== 'en') {
        try {
          const eng = await this.loadModule('en');
          const engTable = this.getPhraseTable(eng, 'us');
          const engKeys = Object.keys(engTable);
          const missing = difference(engKeys, targetKeys);
          const extra = difference(targetKeys, engKeys);
          if (missing.length > 0) {
            console.log(`The following phrases are missing [${localeCode}]:`);
            for (let name of missing) {
              console.log(name);
            }
          } else if (extra.length > 0) {
            console.log(`The following phrases are extraneous [${localeCode}]:`);
            for (let name of extra) {
              console.log(name);
            }
          }
        } catch (err) {
        }
      }
    }

    const evt = new LocaleManagerEvent('change', this);
    this.triggerEvent(evt);
    return true;
  }

  /**
   * Load phrase table
   *
   * @param  {String} languageCode
   *
   * @return {Promise<Boolean>}
   */
  async loadModule(languageCode) {
    const entry = this.directory.find(e => e.code === languageCode);
    if (!entry || !entry.module) {
      throw new Error(`No module for language: ${languageCode}`);
    }
    const module = await entry.module();
    return module;
  }

  /**
   * Return phrase table from module country
   *
   * @param  {Object} module
   * @param  {String} countryCode
   *
   * @return {Object}
   */
  getPhraseTable(module, countryCode) {
    const table = module.phrases;
    if (table instanceof Function) {
      table = table(countryCode);
    }
    return table;
  }

  /**
   * Return code of country most strongly associated with given language
   *
   * @param  {String} languageCode
   *
   * @return {String}
   */
  getDefaultCountry(languageCode) {
    const entry = this.directory.find(e => e.code === languageCode);
    return (entry) ? entry.defaultCountry : '';
  }

  /**
   * Assign a gender to a name for so grammatically correctly phrases can
   * be formulated
   *
   * @param  {String} name
   * @param  {String} gender
   */
  genderize(name, gender) {
    if (this.module.genderize) {
      this.module.genderize(name, gender);
    }
  }

  /**
   * Called when user switches between tabs
   *
   * @param  {Event} evt
   */
  handleVisibilityChange = (evt) => {
    const browserLocale = getBrowserLocale();
    if (browserLocale !== this.browserLocale) {
      this.change(browserLocale).catch((err) => {});
    }
  }
}

function getBrowserLocale() {
  const list = [
    ...navigator.languages,
    navigator.language,
    navigator.browserLanguage,
    navigator.systemLanguage,
    navigator.userLanguage,
  ];
  for (let lang of list) {
    if (lang && lang.length >= 2) {
      return lang.toLowerCase();
    }
  }
  return 'en-us';
}

class LocaleManagerEvent extends GenericEvent {
}

export {
  LocaleManager as default,
  LocaleManager,
  LocaleManagerEvent,
};
