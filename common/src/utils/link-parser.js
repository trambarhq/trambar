var _ = require('lodash');

module.exports = {
    parse,
};

/**
 * Parse contents of a .ini file for properties of web bookmark
 *
 * @param  {String} text
 *
 * @return {Object|null}
 */
function parse(text) {
    var props = {};
    var re = /^(\w+)=(.*)/g;
    var lines = _.split(text, /[\r\n]+/);
    _.each(lines, (line) => {
        var match = /^(\w+)\s*=\s*(.*)/.exec(line);
        if (match) {
            var name = _.lowerCase(match[1]);
            var value = _.trim(match[2]);
            props[name] = value;
        }
    });
    console.log(props);
    return (props.url) ? props : null;
}
