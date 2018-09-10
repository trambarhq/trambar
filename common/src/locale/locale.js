class Locale {
    constructor(localeManager) {
        this.localeManager = localeManager;
        this.directory = localeManager.directory;
        this.localeCode = localeManager.localeCode;
        this.languageCode = localeManager.languageCode;
        this.countryCode = localeManager.countryCode;

        // bound shorthand functions
        this.t = this.translate.bind(this)
        this.p = this.pick.bind(this)
        this.g = this.genderize.bind(this)
    }

    translate(phrase) {
        this.localeManager.translate(phrase);
    }

    pick(versions, overridingLanguageCode) {
        this.localeManager.pick(versions, overridingLanguageCode);
    }

    genderize(name, gender) {
        this.localeManager.genderize(name, gender);
    }

    change(localeCode) {
        this.localeManager.change(localeCode);
    }
}

export {
    Locale as default,
    Locale,
};
