import Moment from 'moment';

class Locale {
    constructor(localeManager) {
        this.localeManager = localeManager;
        this.directory = localeManager.directory;
        this.localeCode = localeManager.localeCode;
        this.languageCode = localeManager.languageCode;
        this.countryCode = localeManager.countryCode;

        // bound shorthand functions
        this.t = this.translate.bind(this);
        this.p = this.pick.bind(this);
        this.g = this.genderize.bind(this);
        this.f = this.format.bind(this);
    }

    translate(phrase) {
        return this.localeManager.translate.apply(this.localeManager, arguments);
    }

    pick(versions, overridingLanguageCode) {
        return this.localeManager.pick(versions, overridingLanguageCode);
    }

    genderize(name, gender) {
        return this.localeManager.genderize(name, gender);
    }

    format(date, format) {
        if (date) {
            return Moment(date).locale(this.localeCode).format(format || 'll');
        } else {
            return '';
        }
    }

    change(localeCode) {
        return this.localeManager.change(localeCode);
    }
}

export {
    Locale as default,
    Locale,
};
