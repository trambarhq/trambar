module.exports = Theme;

function Theme(themeManager) {
    this.mode = themeManager.getMode();
    this.modes = themeManager.getModes();
    this.details = themeManager.getDetails();

    this.change = function(details) {
        return themeManager.change(details);
    };

    this.isAboveMode = function(mode) {
        var indexReq = _.indexOf(this.modes, mode);
        var indexCur = _.indexOf(this.modes, this.mode);
        return indexCur >= indexReq;
    };

    this.isBelowMode = function(mode) {
        return !this.isAboveMode(mode);
    };

    this.getImageUrl = function(res, params) {
        return themeManager.getImageUrl(res, params);
    };

    this.getImageFile = function(res, params) {
        return themeManager.getImageUrl(res);
    };

    this.getVideoUrl = function(res, params) {
        return themeManager.getVideoUrl(res);
    };

    this.getAudioUrl = function(res, params) {
        return themeManager.getAudioUrl(res);
    };
}
