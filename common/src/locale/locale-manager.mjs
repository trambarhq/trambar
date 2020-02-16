import _ from 'lodash';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

const defaultOptions = {
  defaultLocale: 'en-US',
  directory: [],
};

class LocaleManager extends EventEmitter {
  constructor(options) {
    super();

    this.options = _.defaults({}, options, defaultOptions);
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
      await this.change(defaultLocale);
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
    let entry = this.phraseTable[phrase];
    if (entry != null) {
      if (typeof(entry) === 'function') {
        try {
          let results = entry.apply(this, args);
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
    let currentLanguageCode = this.languageCode;
    if (overrideLanguageCode) {
      currentLanguageCode = overrideLanguageCode.substr(0, 2);
    }
    let matchingPhrase = '';
    let firstNonEmptyPhrase = '';
    let defaultLanguageCode = this.options.defaultLocale.substr(0, 2);
    let defaultLanguagePhrase = '';
    for (let key in languageVersions) {
      let phrase = languageVersions[key];
      let localeCode = _.toLower(key);
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
    localeCode = _.toLower(localeCode);
    if (localeCode === this.localeCode) {
      return true;
    }
    const [ lc, cc ] = _.split(localeCode, '-');
    const module = await this.loadModule(lc);
    this.phraseTable = this.getPhraseTable(module, cc);
    this.localeCode = localeCode;
    this.languageCode = lc;
    this.countryCode = /^[a-z]{2}$/.test(cc) ? cc : this.getDefaultCountry(lc);
    this.module = module;

    if (process.env.NODE_ENV !== 'production') {
      const targetKeys = _.keys(this.phraseTable);
      const sorted = _.sortBy(targetKeys);
      if (!_.isEqual(targetKeys, sorted)) {
        console.log(`The following phrases are out of order [${localeCode}]:`);
        for (let [ index, phrase ] of targetKeys.entries()) {
          const sortedIndex = _.indexOf(sorted, phrase);
          if (sorted[sortedIndex - 1] !== targetKeys[index - 1]) {
            console.log(phrase);
          }
        }
      } else if (lc !== 'en') {
        const eng = await this.loadModule('en');
        const engTable = this.getPhraseTable(eng, 'us');
        const engKeys = _.keys(engTable);
        const missing = _.difference(engKeys, targetKeys);
        const extra = _.difference(targetKeys, engKeys);
        if (!_.isEmpty(missing)) {
          console.log(`The following phrases are missing [${localeCode}]:`);
          for (let name of missing) {
            console.log(name);
          }
        } else if (!_.isEmpty(extra)) {
          console.log(`The following phrases are extraneous [${localeCode}]:`);
          for (let name of extra) {
            console.log(name);
          }
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
    const entry = _.find(this.directory, { code: languageCode });
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
    let table = module.phrases;
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
    const entry = _.find(this.directory, { code: languageCode });
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
    let browserLocale = getBrowserLocale();
    if (browserLocale !== this.browserLocale) {
      this.change(browserLocale).catch((err) => {});
    }
  }
}

function getBrowserLocale() {
  const list = _.union(navigator.languages, _.filter([
    navigator.language,
    navigator.browserLanguage,
    navigator.systemLanguage,
    navigator.userLanguage,
  ]));
  for (let lang of list) {
    if (lang && lang.length >= 2) {
      return _.toLower(lang);
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
