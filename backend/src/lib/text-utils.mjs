import { Parser, AsyncParser, JSONRenderer } from 'mark-gor/html.mjs';
import { findTags } from './tag-scanner.mjs';

async function convertMarkdownToJSON(markdown, options) {
  const parser = new AsyncParser(options);
  const renderer = new JSONRenderer;
  const tokens = await parser.parse(markdown);
  const json = renderer.render(tokens);
  return json;
}

async function convertHTMLToJSON(html, options) {
  const parser = new AsyncParser({ ...options, htmlOnly: true });
  const renderer = new JSONRenderer;
  const tokens = await parser.parse(html);
  const json = renderer.render(tokens);
  return json;
}

function findTagsInMarkdown(markdown) {
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
      }
      if (token.children) {
        scanTokens(token.children);
      }
    }
  };
  const parser = new Parser;
  const tokens = parser.parse(markdown);
  scanTokens(tokens);
  return findTags(strings);
}

export {
  convertMarkdownToJSON,
  convertHTMLToJSON,
  findTagsInMarkdown,
};
