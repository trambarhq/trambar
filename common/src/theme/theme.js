module.exports = Theme;

function Theme(themeManager) {
    this.mode = themeManager.getMode();
    this.details = themeManager.getDetails();

    this.change = function(details) {
        return themeManager.change(details);
    };
}
