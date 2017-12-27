var _ = require('lodash');

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

    this.getImageURL = function(res, params) {
        return themeManager.getImageURL(res, params);
    };

    this.getImageFile = function(res) {
        return themeManager.getImageFile(res);
    };

    this.getVideoURL = function(res, params) {
        return themeManager.getVideoURL(res, params);
    };

    this.getAudioURL = function(res, params) {
        return themeManager.getAudioURL(res, params);
    };

    this.getURL = function(res, params) {
        return themeManager.getURL(res, params);
    };
}
