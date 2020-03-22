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

function getText(elements) {
  const strings = [];
  if (elements instanceof Array) {
    for (let element of elements) {
      if (typeof(element) === 'string') {
        strings.push(element);
      } else if (typeof(element) === 'object') {
        strings.push(getText(element.children));
      }
    }
  }
  return strings.join('');
}

function scanElements(elements, f) {
  if (elements instanceof Array) {
    for (let element of elements) {
      if (typeof(element) === 'object') {
        const { type, props, children } = element;
        f(type, props, children);
        scanElements(children, f);
      }
    }
  }
}

function getResourcesFromJSON(json) {
  const resources = [];
  scanElements(json, (type, props) => {
    if (type === 'img') {
      if (props.src) {
        resources.push({ src: props.src });
      }
    }
  });
  return resources;
}

function getReferencesFromJSON(json) {
  const references = [];
  scanElements(json, (type, props) => {
    if (type === 'a') {
      if (props.href) {
        references.push(props.href);
      }
    }
  });
  return references;
}

function getLanguagesFromJSON(json) {
  const languages = [];
  scanElements(json, (type, props) => {
    if (/^h[1-6]$/.test(type)) {
      const text = getText(children);
      const m = /^\s*([a-z]{2})(-[a-z]{2})?\b/i.exec(text);
      if (m) {
        const code = m[1].toLowerCase();
        if (languages.indexOf(code) !== -1 && code !== 'zz') {
          languages.push(code);
        }
      }
    }
  });
  return languages;
}

export {
  convertMarkdownToJSON,
  convertHTMLToJSON,
  getResourcesFromJSON,
  getReferencesFromJSON,
  getLanguagesFromJSON,
  findTagsInMarkdown,
};
