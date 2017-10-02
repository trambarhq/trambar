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

    this.name = function(nameVersions, gender, overrideLanguageCode) {
        var name = localeManager.pick(nameVersions, overrideLanguageCode);
        var obj = new String(name || '');
        obj.gender = gender;
        return obj;
    };

    this.change = function(languageCode) {
        return localeManager.change(languageCode);
    };
}
