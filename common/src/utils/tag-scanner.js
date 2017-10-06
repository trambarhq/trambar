var _ = require('lodash');

exports.findTags = findTags;

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
        tags = text.match(regExp);
    } else if(text instanceof Object) {
        tags = _.flatten(_.map(text, (version) => {
            return String(version).match(regExp);
        }));
    }
    return _.map(_.uniq(tags), _.toLower).sort();
}

var characters = 'a-zA-Z';
var digits = '0-9';

var regExp = new RegExp(`[@#][${characters}][${digits}${characters}]*`, 'g');
