module.exports = Theme;

function Theme(themeManager) {

    this.change = function(props) {
        return themeManager.change(props);
    };
}
