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

    this.getImageUrl = function(image, width, height) {
        return themeManager.getImageUrl(image, width, height);
    };

    this.getVideoUrl = function(image, bandwidth) {
        return themeManager.getVideoUrl(image);
    };

    this.getPosterUrl = function(video, width, height) {
        return themeManager.getPosterUrl(video, width, height);
    };
}
