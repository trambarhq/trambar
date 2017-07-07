module.exports = Theme;

function Theme(themeManager) {
    this.mode = themeManager.getMode();
    this.details = themeManager.getDetails();

    this.change = function(details) {
        return themeManager.change(details);
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
