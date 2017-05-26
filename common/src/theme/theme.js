module.exports = Theme;

function Theme(themeManager) {

    Object.defineProperty(this, 'themeManager', {
        value: themeManager
    });
}
