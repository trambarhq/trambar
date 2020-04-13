import { Parser } from 'mark-gor';
import { findTags } from '../../../backend/src/lib/tag-scanner.mjs';

/**
 * Find @name and #keyword tags
 *
 * @param  {string|Object} text
 * @param  {boolean} markdown
 *
 * @return {string[]}
 */
function findTagsInText(text, markdown) {
  let strings;
  if (text instanceof Object) {
    strings = Object.values(text);
  } else if (typeof(text) === 'string') {
    strings = [ text ];
  } else {
    strings = [];
  }
  if (markdown) {
    strings = extractFromMarkdown(strings);
  }
  return findTags(strings);
}

function extractFromMarkdown(versions) {
  const strings = [];
  const scanTokens = (tokens) => {
    for (let token of tokens) {
      switch (token.type) {
        case 'code':  // skip
        case 'autolink':
        case 'url':
          continue;
        case 'text':
          strings.push(token.text);
          break;
      }
      if (token.children) {
        scanTokens(token.children);
      }
    }
  };
  const parser = new Parser;
  for (let version of versions) {
    const tokens = parser.parse(version);
    scanTokens(tokens);
  }
  return strings;
}

export {
  findTagsInText,
};

// use code from backend
export * from '../../../backend/src/lib/tag-scanner.mjs';
