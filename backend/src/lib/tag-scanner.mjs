import _ from 'lodash';

/**
 * Find @name and #keyword tags
 *
 * @param  {String|Object} text
 * @param  {Boolean} markdown
 *
 * @return {Array<String>}
 */
function findTags(text, markdown) {
  let tags;
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
  return _.sortBy(_.uniq(tags));
}

function isTag(text) {
  return checkRE.test(text);
}

function removeTags(text) {
  return _.trim(String(text).replace(findRE, ''));
}

let pattern = `[@#][a-zA-Z][a-zA-Z0-9_\\-]*`;
let findRE = new RegExp(`${pattern}`, 'g');
let checkRE = new RegExp(`^${pattern}$`);

function removeURLs(text) {
  return text.replace(/https?:\/\/\S+/g, '');
}

function removeEmails(text) {
  return text.replace(/\w+@\w+.\w+/g, '');
}

export {
  findTags,
  isTag,
  removeTags,
};
