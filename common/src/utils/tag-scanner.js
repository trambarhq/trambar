var _ = require('lodash');

module.exports = {
    findTags,
    isTag,
    removeTags,
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
        text = removeURLs(text);
        text = removeEmails(text);
        tags = text.match(findRE);
    } else if(text instanceof Object) {
        tags = _.flatten(_.filter(_.map(text, (version) => {
            version = removeURLs(version);
            version = removeEmails(version);
            return String(version).match(findRE);
        })));
    }
    return _.uniq(tags).sort();
}

function isTag(text) {
    return checkRE.test(text);
}

function removeTags(text) {
    return _.trim(String(text).replace(findRE, ''));
}

var pattern = `[@#][a-zA-Z][a-zA-Z0-9_\\-]*`;
var findRE = new RegExp(`${pattern}`, 'g');
var checkRE = new RegExp(`^${pattern}$`);

function removeURLs(text) {
    return text.replace(/https?:\/\/\S+/g, '');
}

function removeEmails(text) {
    return text.replace(/\w+@\w+.\w+/g, '');
}
