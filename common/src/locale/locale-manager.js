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
        this.module = null;
        this.entry = null;
        this.phraseTable = {};
        this.missingPhrases = [];
    }

    activate() {
        // check for locale change in browser settings
        window.addEventListener('visibilitychange', this.handleVisibilityChange);

    }

    deactivate() {
        window.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.module = null;
        this.entry = null;
    }

    start(locale) {
        let { defaultLocale } = this.options;
        if (!locale) {
            locale = this.browserLocaleCode;
            if (!locale) {
                locale = defaultLocale;
            }
        }
        return this.change(locale).catch((err) => {
            return this.change(defaultLocale);
        });
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
            this.missingPhrases.push(phrase);
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
    change(localeCode) {
        localeCode = _.toLower(localeCode);
        if (localeCode === this.localeCode) {
            return Promise.resolve(true);
        }
        let [ languageCode, countryCode ] = _.split(localeCode, '-');
        let entry = _.find(this.directory, { code: languageCode });
        if (!entry || !entry.module) {
            let err = new Error(`No module for language: ${languageCode}`);
            return Promise.reject(err);
        }
        // Wekpack returns a native promise--convert it to Bluebird
        return Promise.resolve(entry.module()).then((module) => {
            let phraseTable = module.phrases;
            if (!/^[a-z]{2}$/.test(countryCode)) {
                countryCode = entry.defaultCountry;
            }
            if (phraseTable instanceof Function) {
                phraseTable = phraseTable(countryCode);
            }
            this.phraseTable = phraseTable;
            this.localeCode = localeCode;
            this.languageCode = languageCode;
            this.countryCode = countryCode;
            this.module = module;
            this.entry = entry;
            this.missingPhrases = [];

            let evt = new LocaleManagerEvent('change', this);
            this.triggerEvent(evt);
            return true;
        });
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
    // check navigator.languages
    _.each(navigator.languages, check);

    let code;
    function check(lang) {
        if (code === undefined) {
            if (lang && lang.length >= 2) {
                code = _.toLower(lang);
            }
        }
    }

    // check other fields
    let keys = [ 'language', 'browserLanguage', 'systemLanguage', 'userLanguage' ];
    _.each(keys, (key) => { check(navigator[key]) })
    return code;
}

class LocaleManagerEvent extends GenericEvent {
}

export {
    LocaleManager as default,
    LocaleManager,
    LocaleManagerEvent,
};
