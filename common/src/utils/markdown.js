import _ from 'lodash';
import React from 'react';
import { Parser, InlineLexer, ReactRenderer } from 'mark-gor';
import { extractListItems } from './list-parser.js';
import { renderEmoji } from './plain-text.js';
import { parseJSONEncodedURL } from '../objects/utils/resource-utils.js';

// widgets
import { ResourceView } from '../widgets/resource-view.jsx';

function renderMarkdown(props) {
  const { type, text, answers, results, onChange, onReference } = props;
  if (type === 'survey') {
    if (results) {
      return renderSurveyResults(text, results);
    } else {
      return renderSurvey(text, answers, onChange, onReference);
    }
  } else if (type === 'task-list') {
    return renderTaskList(text, answers, onChange, onReference);
  } else {
    return renderText(text, onReference);
  }
}

/**
 * Detect whether text appears to be Markdown
 *
 * @param  {String|Object} text
 * @param  {Function} onReference
 *
 * @return {Boolean}
 */
function isMarkdown(text, onReference) {
  if (typeof(text) === 'object') {
    return _.some(text, isMarkdown);
  }
  const parser = new CustomParser({ onReference });
  return parser.detect(text);
}

function findReferencedResource(resources, name) {
  const match = /^(picture|image|photo|video|audio|website)(-(\d+))?$/.exec(name);
  if (match) {
    let type = match[1];
    if (type === 'picture' || type === 'photo') {
      type = 'image';
    }
    const matchingResources = _.filter(resources, { type });
    const number = parseInt(match[3]) || 1;
    const res = matchingResources[number - 1];
    if (res) {
      return res;
    }
  }
  return null;
}

/**
 * Render text containing a survey
 *
 * @param  {String} text
 * @param  {Object} answers
 * @param  {Function} onChange
 * @param  {Function} onReference
 *
 * @return {Array<String|ReactElement>}
 */
function renderSurvey(text, answers, onChange, onReference) {
  const listTokens = extractListItems(text);
  renderListItems(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      // it's a list
      const listItems = _.map(listToken, (item, key) => {
        let checked = item.checked;
        if (answers) {
          // override radio-button state indicated in text
          // with set-but-not-yet-saved value
          const answer = answers[item.list];
          if (answer !== undefined) {
            checked = (item.key == answer);
          }
        }
        const inputProps = {
          type: 'radio',
          name: item.list,
          value: item.key,
          readOnly: !onChange,
          checked,
          onChange,
        };
        return (
          <div className="list-item" key={key}>
            <label onClick={handleClick}>
              <input {...inputProps}/> {item.react}
            </label>
          </div>
        );
      });
      return <div key={index}>{listItems}</div>;
    } else {
      // regular text
      return listToken.react;
    }
  });
}

/**
 * Render text containing a survey, showing the results
 *
 * @param  {String} text
 * @param  {Object} voteCounts
 * @param  {Function} onReference
 *
 * @return {Array<String|ReactElement>}
 */
function renderSurveyResults(text, voteCounts, onReference) {
  const listTokens = extractListItems(text);
  renderListItems(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      const listItems = _.map(listToken, (item, key) => {
        const tally = voteCounts[item.list];
        const total = _.get(tally, 'total', 0);
        const count = _.get(tally, [ 'answers', item.key ], 0);
        const percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
        const color = `color-${item.key % 12}`;
        let className = 'vote-count';
        if (count === total) {
          className += ' unanimous';
        }
        return (
          <div className={className} key={key}>
            <div className="label">{item.react}</div>
            <div className="bar">
              <span className={`filled ${color}`} style={{ width: percent }} />
              <span className="percent">{percent}</span>
              <span className="count">{count + '/' + total}</span>
            </div>
          </div>
        );
      });
      return <div key={index}>{listItems}</div>;
    } else {
      return listToken.react;
    }
  });
}

/**
 * Render text containing a task list
 *
 * @param  {String} text
 * @param  {Object} answers
 * @param  {Function} onChange
 * @param  {Function} onReference
 *
 * @return {Array<String|ReactElement>}
 */
function renderTaskList(text, answers, onChange, onReference) {
  const listTokens = extractListItems(text);
  renderListItems(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      const listItems = _.map(listToken, (item, key) => {
        let checked = item.checked;
        if (answers) {
          // override checkbox state indicated in text
          // with set-but-not-yet-saved value
          const answer = answers[item.list];
          if (answer !== undefined) {
            const selected = answer[item.key];
            if (selected !== undefined) {
              checked = selected;
            }
          }
        }
        const inputProps = {
          type: 'checkbox',
          name: item.list,
          value: item.key,
          readOnly: !onChange,
          checked,
          onChange,
        };
        return (
          <div className="list-item" key={key}>
            <label onClick={handleClick}>
              <input {...inputProps}/> {item.react}
            </label>
          </div>
        );
      });
      return <div key={index}>{listItems}</div>;
    } else {
      return listToken.react;
    }
  });
}

/**
 * Render Markdown text
 *
 * @param  {String} text
 * @param  {Function} onReference
 *
 * @return {Array<ReactElement>}
 */
function renderText(text, onReference) {
  const parser = new CustomParser({ onReference });
  const renderer = new CustomRenderer;
  const tokens = parser.parse(text);
  return renderer.render(tokens);
}

/**
 * Parse results from extractListItems() as Markdown. Results are saved into
 * the tokens themselves.
 *
 * @param  {Array<String|Array<Object>>} listTokens
 * @param  {Function} onReference
 */
function renderListItems(listTokens, onReference) {
  // process the text fully at block level, so ref links are captured
  const parser = new CustomParser({ onReference });
  const renderer = new CustomRenderer;
  parser.parseList(listTokens);
  renderer.renderList(listTokens);
}

class CustomParser extends Parser {
  constructor(options) {
    super(options, { inlineLexerClass: CustomInlineLexer });
  }

  detect(text) {
    this.initialize(text);
    this.processBlocks();
    for (let bToken of this.tokens) {
      switch (bToken.type) {
        case 'space':
          break;
        case 'paragraph':
        case 'text_block':
          // scan for inline markup
          this.inlineLexer.initialize(bToken.markdown, bToken.type);
          while (this.inlineLexer.remaining) {
            const iToken = this.inlineLexer.captureToken();
            if (iToken) {
              switch (iToken.type) {
                case 'url':   // ignore these, as they can occur in plain text
                case 'text':
                case 'autolink':
                case 'br':
                  break;
                default:
                  return true;
              }
            }
          }
          break;
        case 'list':
          for (let itemToken of bToken.children) {
            const child = itemToken.children[0];
            if (child && /^\s*\[/.test(child.markdown)) {
              // it might be a task-list or survey item
              break;
            }
          }
          return true;
        default:
          return true;
      }
    }
    return false;
  }

  /**
   * Parse markdown text in list items from extractListItems(), storing
   * tokens into the list tokens themselves
   *
   * @param  {Array<Object>} listTokens
   */
  parseList(listTokens) {
    this.initialize('');
    // parse blocks first so we have all references
    this.processListItemBlocks(listTokens);
    this.processListItemInline(listTokens);
  }

  /**
   * Parse token at block level
   *
   * @param  {Object|Array<Object>} listToken
   */
  processListItemBlocks(listToken) {
    if (listToken instanceof Array) {
      for (let token of listToken) {
        this.processListItemBlocks(token);
      }
    } else {
      this.text = (listToken.list) ? listToken.label : listToken.text;
      this.tokens = [];
      this.processBlocks();
      if (listToken.list) {
        if (this.tokens[0] && this.tokens[0].type === 'paragraph') {
          // take text out of paragraph
          this.tokens[0].type = 'html_block';
        }
      }
      listToken.tokens = this.tokens;
    }
  }

  /**
   * Parse token at inline level
   *
   * @param  {Object|Array<Object>} listToken
   */
  processListItemInline(listToken) {
    if (listToken instanceof Array) {
      for (let token of listToken) {
        this.processListItemInline(token);
      }
    } else {
      this.tokens = listToken.tokens;
      this.processInline();
    }
  }
}

class CustomInlineLexer extends InlineLexer {
  findRefLink(name, type) {
    let link = super.findRefLink(name, type);
    if (link) {
      return link;
    }
    const { onReference } = this.options;
    if (onReference) {
      link = onReference({
        type: 'reference',
        target: this,
        name,
        type,
      });
    }
    return link;
  }
}

class CustomRenderer extends ReactRenderer {
  /**
   * Convert markdown tokens in list tokens into React elements
   *
   * @param  {Array<Object>} listTokens
   */
  renderList(listTokens) {
    this.renderListItem(listTokens);
  }

  /**
   * Convert markdown tokens into a React element, storing it in the
   * given list token itself
   *
   * @param  {Object|Array<Object>} listToken
   */
  renderListItem(listToken) {
    if (listToken instanceof Array) {
      for (let token of listToken) {
        this.renderListItem(token);
      }
    } else {
      this.tokens = [];
      this.renderTokens(listToken.tokens);
      if (this.options.normalizeTags) {
        this.normalize();
      }
      listToken.react = this.output();
    }
  }

  /**
   * Render image referenced in text
   *
   * @param  {Object} token
   * @param  {Number} key
   *
   * @return {ReactElement}
   */
  outputHTMLElement(token, key) {
    const { tagName, attributes, children } = token;
    if (tagName === 'img') {
      const { src, ...otherAttrs } = attributes;
      const resource = parseJSONEncodedURL(src);
      if (resource) {
        const props = { ...otherAttrs, resource };
        return <ResourceView key={key} {...props} />;
      }
    }
    return super.outputHTMLElement(token, key);
  }

  /**
   * Render text with emoji
   *
   * @param  {Object} token
   * @param  {Number} key
   *
   * @return {Array<String|ReactElement>}
   */
  outputText(token, key) {
    const { text } = token;
    return renderEmoji(text, { key });
  }
}

function handleClick(evt) {
  switch (evt.target.tagName) {
    case 'IMG':
    case 'svg':
    case 'CANVAS':
      evt.preventDefault();
      break;
  }
}

export {
  renderMarkdown,
  isMarkdown,
  findReferencedResource,
};
