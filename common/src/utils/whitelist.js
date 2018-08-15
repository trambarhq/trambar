var _ = require('lodash');

module.exports = {
    match,
};

/**
 * Return true if a email address matches an item on a whitelist
 *
 * @param  {String} email
 * @param  {String} whitelist
 *
 * @return {Boolean}
 */
function match(email, whitelist) {
    var items = _.split(_.trim(whitelist), /\s*\n\s*/);
    var emailParts = _.split(email, '@');
    var name = emailParts[0];
    var domain = emailParts[1];
    return _.some(items, (item) => {
        if (/^#/.test(item)) {
            return;
        }
        var permitted = _.split(item, '@');
        if (permitted.length === 1) {
            if (domain === permitted[0]) {
                return true;
            }
        } else if (permitted.length === 2) {
            if (domain === permitted[1] && name === permitted[0]) {
                return true;
            }
        }
    });
}
