
function Locale(localeManager) {
    this.languageCode = localManager.getLanguageCode();

    this.translate = this.translate.bind(this);
    this.pick = this.pick.bind(this);
}

Locale.prototype.translate = function(phrase) {
    if (phrase instanceof Object) {
        return this.pick(phrase);
    }
    return this.localManager.translate.apply(this.localManager, arguments);
};

Locale.prototype.pick = function(phraseVersions) {
    return this.localManager.pick(phraseVersions);
};
