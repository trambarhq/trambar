var _ = require('lodash');

module.exports = {
    findTags,
    isTag,
};

/**
 * Find @name and #keyword tags
 *
 * @param  {String|Object} text
 *
 * @return {Array<String>}
 */
function findTags(text) {
    var tags;
    if (typeof(text) === 'string') {
        tags = text.match(findRE);
    } else if(text instanceof Object) {
        tags = _.flatten(_.filter(_.map(text, (version) => {
            return String(version).match(findRE);
        })));
    }
    return _.map(_.uniq(tags), _.toLower).sort();
}

function isTag(text) {
    return checkRE.test(text);
}

var characters = 'a-zA-Z';
var digits = '0-9';
var pattern = `[@#][${characters}][${digits}${characters}]*`;

var findRE = new RegExp(`${pattern}`, 'g');
var checkRE = new RegExp(`^${pattern}$`);
