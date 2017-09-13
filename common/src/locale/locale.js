module.exports = Locale;

function Locale(localeManager) {
    this.languageCode = localeManager.getLanguageCode();
    this.lang = this.languageCode.substr(0, 2);
    this.directory = localeManager.getDirectory();

    this.translate = function(phrase) {
        if (phrase instanceof Object) {
            return localeManager.pick(phrase);
        }
        return localeManager.translate.apply(localeManager, arguments);
    };

    this.pick = function(phraseVersions, overrideLanguageCode) {
        return localeManager.pick(phraseVersions, overrideLanguageCode);
    };

    this.change = function(languageCode) {
        return localeManager.change(languageCode);
    };
}
