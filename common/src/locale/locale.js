module.exports = Locale;

function Locale(localeManager) {
    this.localeManager = localeManager;
    this.directory = this.localeManager.getDirectory();
    this.localeCode = this.localeManager.getLocaleCode();
    var parts = _.split(this.localeCode, '-');
    this.languageCode = parts[0];
    this.countryCode = parts[1];

    // bind the functions to this so we can use short aliases
    this.translate = this.translate.bind(this);
    this.pick = this.pick.bind(this);
    this.name = this.name.bind(this);
    this.change = this.change.bind(this);
}

Locale.prototype.translate = function(phrase) {
    if (phrase instanceof Object) {
        return this.localeManager.pick(phrase);
    }
    return this.localeManager.translate.apply(this.localeManager, arguments);
};

Locale.prototype.pick = function(phraseVersions, overrideLanguageCode) {
    return this.localeManager.pick(phraseVersions, overrideLanguageCode);
};

Locale.prototype.name = function(nameVersions, gender, overrideLanguageCode) {
    var name = this.localeManager.pick(nameVersions, overrideLanguageCode);
    var obj = new String(name || '');
    obj.gender = gender;
    return obj;
};

Locale.prototype.change = function(localeCode) {
    return this.localeManager.change(localeCode);
};
