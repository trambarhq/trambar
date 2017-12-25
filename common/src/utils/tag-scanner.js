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
        text = removeUrls(text);
        text = removeEmails(text);
        tags = text.match(findRE);
    } else if(text instanceof Object) {
        tags = _.flatten(_.filter(_.map(text, (version) => {
            version = removeUrls(version);
            version = removeEmails(version);
            return String(version).match(findRE);
        })));
    }
    return _.uniq(tags).sort();
}

function isTag(text) {
    return checkRE.test(text);
}

var characters = 'a-zA-Z';
var digits = '0-9';
var pattern = `[@#][${characters}][${digits}${characters}]*`;

var findRE = new RegExp(`${pattern}`, 'g');
var checkRE = new RegExp(`^${pattern}$`);

function removeUrls(text) {
    return text.replace(/https?:\/\/\S+/g, '');
}

function removeEmails(text) {
    return text.replace(/\w+@\w+.\w+/g, '');
}
