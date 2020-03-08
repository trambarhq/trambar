import _ from 'lodash';

// look for in Latin x, Cyrillic х, and Greek χ
const regExp = /^([ \t]*)\*\s+\[([ xхχ])\]([ \t]*)(.*?)([ \t]*?)$/mig;

/**
 * Extract "[ ] label..." item lists from text
 *
 * @param  {String} text
 *
 * @return {Array}
 */
function extractListItems(text) {
  text = (text) ? text : '';

  let tokens = [];
  let si = 0;
  let m;
  let currentList = null;
  let key = 1;
  let list = 1;
  while (m = regExp.exec(text)) {
    let textBefore = text.substring(si, m.index);
    if (textBefore) {
      // if there's text before the item, then close out then current list
      if (currentList) {
        if (_.trim(textBefore)) {
          currentList = null;
          list++;
          tokens.push(textBefore);
        } else {
          // append the whitespaces onto the last time
          let lastItem = _.last(currentList);
          lastItem.after += textBefore;
        }
      } else {
        tokens.push(textBefore);
      }
    }
    let before = m[1];
    let answer = m[2];
    let checked = !!_.trim(answer);
    let between = m[3]
    let label = m[4];
    let after = m[5];
    let item = { label, checked, answer, before, between, after, list, key };
    if (currentList) {
      currentList.push(item);
    } else {
      currentList = [ item ];
      tokens.push(currentList);
    }
    si = m.index + m[0].length;
    key++;
  }
  let textAfter = text.substring(si);
  if (textAfter) {
    tokens.push(textAfter);
  }
  return tokens;
}

/**
 * Detect whether text contains a list
 *
 * @param  {String|Object} text
 *
 * @return {Boolean}
 */
function isList(text) {
  if (typeof(text) === 'object') {
    return _.some(text, isList);
  }
  const tokens = extractListItems(text);
  return _.some(tokens, (token) => {
    // lists are arrays
    return token instanceof Array;
  });
}

/**
 * Check or uncheck item
 *
 * @param  {Array} tokens
 * @param  {Number|String} list
 * @param  {Number|String} key
 * @param  {Boolean} checked
 * @param  {Boolean} clearOthers
 */
function setListItem(tokens, list, key, checked, clearOthers) {
  for (let token of tokens) {
    if (token instanceof Array) {
      for (let item of token) {
        if (item.list == list) {
          // update .checked then .answer of item
          if (item.key == key) {
            update(item, checked);
          } else {
            if (checked && clearOthers) {
              update(item, false);
            }
          }
        }
      }
    }
  }
}

function updateListItem(item, checked) {
  item.checked = checked;
  if (checked) {
    let x;
    if (/[\u0x0400-\u0x04ff]/.test(item.label)) {
      x = 'х';
    } else if (/[\u0x0370-\u0x03ff]/.test(item.label)) {
      x = 'χ';
    } else {
      x = 'x';
    }
    item.answer = x;
  } else {
    item.answer = ' ';
  }
}

/**
 * Find an item
 *
 * @param  {Array} tokens
 * @param  {Number|String} list
 * @param  {Number|String} key
 *
 * @return {Object|null}
 */
function findListItem(tokens, list, key) {
  for (let token of tokens) {
    if (token instanceof Array) {
      let result = _.find(token, (item) => {
        if (item.list == list && item.key == key) {
          return true;
        }
      });
      if (result) {
        return result;
      }
    }
  }
  return null;
}

/**
 * Count the number of items--of a particular state or any
 *
 * @param  {Array} tokens
 * @param  {Boolean|undefined} checked
 *
 * @return {Number}
 */
function countListItems(tokens, checked) {
  let total = 0;
  for (let token of tokens) {
    if (token instanceof Array) {
      for (let item of token) {
        if (checked === undefined || item.checked === checked) {
          total++;
        }
      }
    }
  }
  return total;
}

/**
 * Convert list of tokens into text again
 *
 * @param  {Array} tokens
 *
 * @return {String}
 */
function stringifyList(tokens) {
  // concatenate tokens into a string again
  tokens = _.flattenDeep(tokens);
  let lines = [];
  for (let token of tokens) {
    if (token instanceof Object) {
      lines.push(token.before + '* [' + token.answer + ']' + token.between + token.label + token.after);
    } else {
      lines.push(token);
    }
  }
  return lines.join('');
}

export {
  extractListItems,
  setListItem,
  updateListItem,
  findListItem,
  countListItems,
  isList,
  stringifyList,
};
