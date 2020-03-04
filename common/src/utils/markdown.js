import _ from 'lodash';
import React from 'react';
import { Parser, InlineLexer, ReactRenderer } from 'mark-gor';
import * as ListParser from './list-parser.js';
import * as PlainText from './plain-text.js';
import * as ResourceUtils from '../objects/utils/resource-utils.js';

// widgets
import ResourceView from '../widgets/resource-view.jsx';

/**
 * Detect whether text appears to be Markdown
 *
 * @param  {String|Object} text
 * @param  {Function} onReference
 *
 * @return {Boolean}
 */
function detect(text, onReference) {
  if (typeof(text) === 'object') {
    return _.some(text, detect);
  }
  // process the text fully at block level, so ref links are captured
  const parser = createParser(onReference);
  const bTokens = parser.extractBlocks(text);
  return _.some(bTokens, (bToken) => {
    switch (bToken.type) {
      case 'space':
        return false;
      case 'paragraph':
      case 'text_block':
        // scan for inline markup
        const inlineLexer = parser.inlineLexer;
        inlineLexer.start(bToken.markdown);
        let iToken;
        while (iToken = inlineLexer.captureToken()) {
          switch (iToken.type) {
            case 'url':
            case 'text':
            case 'autolink':
            case 'br':
              // ignore these, as they can occur in plain text
              break;
            default:
              return true;
          }
        }
        break;
      case 'list':
        return _.every(bToken.children, (item) => {
          const child = item.children[0];
          if (child.type === 'text_block') {
            if (/^\s*\[/.test(child.markdown)) {
              // it might be a task-list or survey item
              return false;
            }
          }
          return true;
        });
      default:
        return true;
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
function render(text, onReference) {
  const parser = createParser(onReference);
  const renderer = createRenderer();
  const bTokens = parser.parse(text);
  const paragraphs = renderer.render(bTokens);
  return paragraphs;
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
  const listTokens = ListParser.extract(text);
  const markdownTexts = renderListTokens(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      // it's a list
      const listItems = _.map(listToken, (item, key) => {
        let checked = item.checked;
        const label = markdownTexts[index][key];
        if (answers) {
          // override radio-button state indicated in text
          // with set-but-not-yet-saved value
          const answer = answers[item.list];
          if (answer !== undefined) {
            checked = (item.key == answer);
          }
        }
        return (
          <div className="list-item" key={key}>
            <label onClick={handleClick}>
              <input type="radio" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
              {' '}
              {label}
            </label>
          </div>
        );
      });
      return <div key={index}>{listItems}</div>;
    } else {
      // regular text
      return markdownTexts[index];
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
  const listTokens = ListParser.extract(text);
  const markdownTexts = renderListTokens(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      const listItems = _.map(listToken, (item, key) => {
        const label = markdownTexts[index][key];
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
            <div className="label">{label}</div>
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
      // regular text
      return markdownTexts[index];
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
  const listTokens = ListParser.extract(text);
  const markdownTexts = renderListTokens(listTokens, onReference);

  // create text nodes and list items
  return _.map(listTokens, (listToken, index) => {
    if (listToken instanceof Array) {
      const listItems = _.map(listToken, (item, key) => {
        let checked = item.checked;
        const label = markdownTexts[index][key];
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
        return (
          <div className="list-item" key={key}>
            <label onClick={handleClick}>
              <input type="checkbox" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
              {' '}
              {label}
            </label>
          </div>
        );
      });
      return <div key={index}>{listItems}</div>;
    } else {
      // regular text
      return markdownTexts[index];
    }
  });
}

/**
 * Parse results from ListParser.parse() as Markdown. The result will retain the
 * same structure, with arrays of ReactElement replacing plain text.
 *
 * @param  {Array<String|Array<Object>>} listTokens
 * @param  {Function} onReference
 *
 * @return {Array<Array<ReactElement>|Array<Object>>}
 */
function renderListTokens(listTokens, onReference) {
  // process the text fully at block level, so ref links are captured
  const parser = createParser(onReference);
  const blockTokenLists = _.map(listTokens, (listToken, index) => {
    let blockTokens;
    if (listToken instanceof Array) {
      // process the label of each item
      return _.map(listToken, (item) => {
        return parser.extractBlocks(item.label);
      });
    } else {
      return parser.extractBlocks(listToken);
    }
  });

  // process at the inline level
  for (let [ index, listToken ] of _.entries(listTokens)) {
    const blockTokens = blockTokenLists[index];
    if (listToken instanceof Array) {
      for (let tokens of blockTokens) {
        parser.processInline(tokens);
      }
    } else {
      parser.processInline(blockTokens);
    }
  }

  // render tokens
  const renderer = createRenderer();
  const markdownTexts = _.map(listTokens, (listToken, index) => {
    const blockTokens = blockTokenLists[index];
    if (listToken instanceof Array) {
      return _.map(listToken, (item, index) => {
        let label = _.first(renderer.render(blockTokens[index]));
        if (label && label.props && label.type === 'p') {
          // take text out from <p>
          label = label.props.children;
        }
        return label;
      });
    } else {
      // regular Markdown text
      return renderer.render(blockTokens);
    }
  });
  return markdownTexts;
}

/**
 * Create a Markdown parser that can reference resources through callback
 *
 * @param  {Function} onReference
 *
 * @return {Parser}
 */
function createParser(onReference) {
  class inlineLexerClass extends InlineLexer {
    findRefLink(name, forImage) {
      let link = super.findRefLink(name, forImage);
      if (link) {
        return link;
      }
      if (onReference) {
        link = onReference({
          type: 'reference',
          target: this,
          name,
          forImage,
        });
      }
      return link;

    }
  }
  return new Parser({ inlineLexerClass });
}

/**
 * Create a Markdown renderer, overriding certain functions
 *
 * @return {Renderer}
 */
function createRenderer() {
  return new MarkGor.Renderer({ renderImage, renderText });
}

/**
 * Render image referenced in text
 *
 * @param  {Object} token
 * @param  {Number} key
 *
 * @return {ReactElement}
 */
function renderImage(token, key) {
  const url = token.href;
  const title = token.title;
  const text = token.text;
  const resource = ResourceUtils.parseJSONEncodedURL(url);
  if (resource) {
    return <ResourceView key={key} resource={resource} alt={text} title={title} />;
  } else {
    return <img key={key} src={url} alt={text} title={title} />;
  }
};

/**
 * Render text with emoji
 *
 * @param  {Object} token
 * @param  {Number} key
 *
 * @return {Array<String|ReactElement>}
 */
function renderText(token, key) {
  return PlainText.renderEmoji(token.text, { key });
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
  detect,
  render,
  renderSurvey,
  renderSurveyResults,
  renderTaskList,
  createParser,
  createRenderer,
  findReferencedResource,
};
