import _ from 'lodash';

// look for in Latin x, Cyrillic х, and Greek χ
const regExp = /^([ \t]*)\*\s+\[([ xхχ])\]([ \t]*)(.*?)([ \t]*?)$/mig;

/**
 * Extract "[ ] label..." item lists from text
 *
 * @param  {string} text
 *
 * @return {Object[]}
 */
function extractListItems(text) {
  text = (text) ? text : '';

  const tokens = [];
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
        if (textBefore.trim()) {
          currentList = null;
          list++;
          tokens.push({ text: textBefore });
        } else {
          // append the whitespaces onto the last time
          const lastItem = currentList[currentList.length - 1];
          lastItem.after += textBefore;
        }
      } else {
        tokens.push({ text: textBefore });
      }
    }
    const before = m[1];
    const answer = m[2];
    const checked = !!answer.trim();
    const between = m[3]
    const label = m[4];
    const after = m[5];
    const item = { label, checked, answer, before, between, after, list, key };
    if (currentList) {
      currentList.push(item);
    } else {
      currentList = [ item ];
      tokens.push(currentList);
    }
    si = m.index + m[0].length;
    key++;
  }
  const textAfter = text.substring(si);
  if (textAfter) {
    tokens.push({ text: textAfter });
  }
  return tokens;
}

/**
 * Detect whether text contains a list
 *
 * @param  {string|Object} text
 *
 * @return {boolean}
 */
function isList(text) {
  if (typeof(text) === 'object') {
    for (let langText of Object.values(text)) {
      if (isList(langText)) {
        return true;
      }
    }
    return false;
  }
  const tokens = extractListItems(text);
  for (let token of tokens) {
    // lists are arrays
    if (token instanceof Array) {
      return true;
    }
  }
  return false;
}

/**
 * Check or uncheck item
 *
 * @param  {Array} tokens
 * @param  {number|string} list
 * @param  {number|string} key
 * @param  {boolean} checked
 * @param  {boolean} clearOthers
 */
function setListItem(tokens, list, key, checked, clearOthers) {
  for (let token of tokens) {
    if (token instanceof Array) {
      for (let item of token) {
        if (item.list == list) {
          // update .checked then .answer of item
          if (item.key == key) {
            updateListItem(item, checked);
          } else {
            if (checked && clearOthers) {
              updateListItem(item, false);
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
 * @param  {number|string} list
 * @param  {number|string} key
 *
 * @return {Object|null}
 */
function findListItem(tokens, list, key) {
  for (let token of tokens) {
    if (token instanceof Array) {
      for (let item of token) {
        if (item.list == list && item.key == key) {
          return item;
        }
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
 * @return {number}
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
 * @return {string}
 */
function stringifyList(tokens) {
  const lines = [];
  for (let token of tokens) {
    if (token instanceof Array) {
      for (let item of token) {
        const { before, answer, between, label, after } = item;
        lines.push(before + '* [' + answer + ']' + between + label + after);
      }
    } else {
      const { text } = token;
      lines.push(text);
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
