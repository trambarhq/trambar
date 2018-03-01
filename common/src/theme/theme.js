var _ = require('lodash');

module.exports = Theme;

function Theme(themeManager) {
    this.themeManager = themeManager;
    this.mode = this.themeManager.getMode();
    this.modes = this.themeManager.getModes();
    this.details = this.themeManager.getDetails();
}

Theme.prototype.change = function(details) {
    return this.themeManager.change(details);
};

Theme.prototype.isAboveMode = function(mode) {
    var indexReq = _.indexOf(this.modes, mode);
    var indexCur = _.indexOf(this.modes, this.mode);
    return indexCur >= indexReq;
};

Theme.prototype.isBelowMode = function(mode) {
    return !this.isAboveMode(mode);
};

Theme.prototype.getImageURL = function(res, params) {
    return this.themeManager.getImageURL(res, params);
};

Theme.prototype.getVideoURL = function(res, params) {
    return this.themeManager.getVideoURL(res, params);
};

Theme.prototype.getAudioURL = function(res, params) {
    return this.themeManager.getAudioURL(res, params);
};

Theme.prototype.getURL = function(res, params) {
    return this.themeManager.getURL(res, params);
};

Theme.prototype.getImageDimensions = function(res, params) {
    return this.themeManager.getImageDimensions(res, params);
};

Theme.prototype.getDimensions = function(res, params) {
    return this.themeManager.getDimensions(res, params);
};
