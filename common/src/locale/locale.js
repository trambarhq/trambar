module.exports = Locale;

function Locale(localeManager) {
    this.languageCode = localeManager.getLanguageCode();

    this.translate = function(phrase) {
        if (phrase instanceof Object) {
            return localeManager.pick(phrase);
        }
        return localeManager.translate.apply(localeManager, arguments);
    };

    this.pick = function(phraseVersions) {
        return localeManager.pick(phraseVersions);
    };
}
