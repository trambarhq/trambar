/**
 * Find @name and #keyword tags
 *
 * @param  {String|Array<String>} text
 *
 * @return {Array<String>}
 */
function findTags(text) {
  const strings = [];

  if (typeof(text) === 'string') {
    strings.push(cleanPlainText(text));
  } else if (text instanceof Array) {
    for (let fragment of text) {
      if (typeof(fragment) === 'string') {
        strings.push(cleanPlainText(fragment));
      }
    }
  }

  const tags = [];
  for (let string of strings) {
    const match = string.match(findRE);
    if (match) {
      for (let tag of match) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
  }
  return tags.sort();
}

function isTag(text) {
  return checkRE.test(text);
}

function removeTags(text) {
  return String(text).replace(findRE, '').trim();
}

const pattern = `[@#][a-zA-Z][a-zA-Z0-9_\\-]*`;
const findRE = new RegExp(`${pattern}`, 'g');
const checkRE = new RegExp(`^${pattern}$`);

function removeURLs(text) {
  return text.replace(/https?:\/\/\S+/g, '');
}

function removeEmails(text) {
  return text.replace(/\w+@\w+.\w+/g, '');
}

function cleanPlainText(text) {
  text = removeURLs(text || '');
  text = removeEmails(text);
  return text;
}

export {
  findTags,
  isTag,
  removeTags,
};
