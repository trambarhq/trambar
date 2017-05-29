module.exports = Locale;

function Locale(localeManager) {
    this.languageCode = localeManager.getLanguageCode();

    // bind functions to object so we can place them in short-named variables
    // for convenience
    this.translate = this.translate.bind(this);
    this.pick = this.pick.bind(this);

    Object.defineProperty(this, 'localeManager', {
        value: localeManager
    });
}

Locale.prototype.translate = function(phrase) {
    if (phrase instanceof Object) {
        return this.pick(phrase);
    }
    return this.localeManager.translate.apply(this.localManager, arguments);
};

Locale.prototype.pick = function(phraseVersions) {
    return this.localManager.pick(phraseVersions);
};
