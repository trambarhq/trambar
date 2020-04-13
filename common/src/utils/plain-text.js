import React from 'react';
import EmojiRegex from 'emoji-regex';
import ReactEasyEmoji from 'react-easy-emoji';
import capitalize from 'lodash/capitalize.js';
import { extractListItems } from './list-parser.js';
import { get } from './object-utils.js';

function renderPlainText(props) {
  const { type, text, answers, results, onChange } = props;
  if (type === 'survey') {
    if (results) {
      return renderSurveyResults(text, results);
    } else {
      return renderSurvey(text, answers, onChange);
    }
  } else if (type === 'task-list') {
    return renderTaskList(text, answers, onChange);
  } else {
    if (!text) {
      return null;
    }
    const contents = renderEmoji(text);
    if (type === 'post') {
      return <p>{contents}</p>;
    } else {
      return contents;
    }
  }
}

/**
 * Render text containing a survey
 *
 * @param  {string} text
 * @param  {Object} answers
 * @param  {Function} onChange
 *
 * @return {string[]|ReactElement[]}
 */
function renderSurvey(text, answers, onChange) {
  const listTokens = extractListItems(text);
  return listTokens.map((listToken, index) => {
    if (listToken instanceof Array) {
      return listToken.map((item, key) => {
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
          <span key={key}>
            {item.before}
            <label>
              <input {...inputProps} />
              {item.between}
              {renderEmoji(item.label)}
            </label>
            {item.after}
          </span>
        );
      });
    } else {
      // regular text
      return renderEmoji(listToken.text, { key: index });
    }
  });
}

/**
 * Render text containing a survey, showing the results
 *
 * @param  {string} text
 * @param  {Object} voteCounts
 *
 * @return {string[]|ReactElement[]}
 */
function renderSurveyResults(text, voteCounts) {
  const listTokens = extractListItems(text);
  return listTokens.map((listToken, index) => {
    if (listToken instanceof Array) {
      return listToken.map((item, key) => {
        const tally = voteCounts[item.list];
        const total = get(tally, 'total', 0);
        const count = get(tally, [ 'answers', item.key ], 0);
        const percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
        const color = `color-${item.key % 12}`;
        const className = 'vote-count';
        if (count === total) {
          className += ' unanimous';
        }
        return (
          <span key={key}>
            {item.before}
            <span className={className}>
              <span className="label">{renderEmoji(item.label)}</span>
              <span className="bar">
                <span className={`filled ${color}`} style={{ width: percent }} />
                <span className="percent">{percent}</span>
                <span className="count">{count + '/' + total}</span>
              </span>
            </span>
            {item.after}
          </span>
        );
      });
    } else {
      // regular text
      return renderEmoji(listToken.text, { key: index });
    }
  });
}

/**
 * Render text containing a tasj list
 *
 * @param  {string} text
 * @param  {Object} answers
 * @param  {Function} onChange
 *
 * @return {string[]|ReactElement[]}
 */
function renderTaskList(text, answers, onChange) {
  const listTokens = extractListItems(text);
  return listTokens.map((listToken, index) => {
    if (listToken instanceof Array) {
      return listToken.map((item, key) => {
        let checked = item.checked;
        if (answers) {
          // override checkbox/radio-button state indicated in text
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
          <span key={key}>
            {item.before}
            <label>
              <input {...inputProps} />{item.between}{renderEmoji(item.label)}
            </label>
            {item.after}
          </span>
        );
      });
    } else {
      // regular text
      return renderEmoji(listToken.text, { key: index });
    }
  });
}

let needEmojiHandling = !hasEmojiSupport();
let needSkinToneStripping = !needEmojiHandling && !hasSkinToneSupport();

/**
 * Render text that might contain emojis unsupported by browser
 *
 * @param  {string} text
 * @param  {Object|undefined} options
 *
 * @return {string[]|ReactElement[]}
 */
function renderEmoji(text, options) {
  if (!needEmojiHandling) {
    if (needSkinToneStripping) {
      text = stripSkinTone(text);
    }
    return [ text ];
  }
  // use custom function so we can add prefix to key
  const parentKey = (options) ? options.key : undefined;
  return ReactEasyEmoji(text, renderEmojiImage.bind(null, parentKey));
}

const emojiStyle = {
	height: '1em',
	width: '1em',
	margin: '0 .05em 0 .1em',
	verticalAlign: '-0.1em'
};

function renderEmojiImage(parentKey, code, string, characterKey) {
  const key = (parentKey !== undefined) ? `${parentKey}.${characterKey}` : characterKey;
  const src = `https://twemoji.maxcdn.com/2/72x72/${code}.png`;
  return <img key={key} alt={string} draggable={false} src={src} style={emojiStyle} />;
}

/**
 * Return true if browser supports emojis
 *
 * @return {boolean}
 */
function hasEmojiSupport() {
  return canDrawEmoji('\ud83d\ude03');
}

/**
 * Return true if browser supports emojis with different skin tones
 *
 * @return {boolean}
 */
function hasSkinToneSupport() {
  return canDrawEmoji('\ud83c\udffb');
}

/**
 * Return true browser is able to draw the specified emoji
 *
 * @return {boolean}
 */
function canDrawEmoji(text) {
  const canvas = document.createElement('canvas');
  if (!canvas.getContext) {
    return false;
  }
  const context = canvas.getContext('2d');
  if (!context.fillText) {
    return false;
  }
  context.textBaseline = "top";
  context.font = "32px Arial";
  context.fillText(text, 0, 0);
  const pixels = context.getImageData(16, 16, 1, 1).data;
  return pixels[0] !== 0;
}

const skinToneRegExp = /\ud83c\udffb|\ud83c\udffc|\ud83c\udffd|\ud83c\udffe|\ud83c\udfff/g;

/**
 * Strip skin tone modifier from a string
 *
 * @param  {string} s
 *
 * @return {string}
 */
function stripSkinTone(s) {
  return s.replace(skinToneRegExp, '');
}

let emojiRegex;

function findEmoji(string) {
  if (typeof(string) !== 'string') {
    return 0;
  }
  if (!emojiRegex) {
    emojiRegex = EmojiRegex();
  }
  const m = string.match(emojiRegex);
  return m;
}

let letterCaptureRegExp, rtlCaptureRegExp, rtlDetectionRegExp;

try {
  letterCaptureRegExp = new RegExp('\\p{Letter}+', 'gu');
  rtlCaptureRegExp = new RegExp('[\\p{Script=Arabic}\\p{Script=Hebrew}]+', 'gu');
  rtlDetectionRegExp = new RegExp('[\\p{Script=Arabic}\\p{Script=Hebrew}]', 'u');
} catch (err) {
}

function detectDirection(text) {
  text = text + '';
  if (letterCaptureRegExp && rtlCaptureRegExp && rtlDetectionRegExp) {
    if (rtlDetectionRegExp.test(text)) {
      const letters = text.match(letterCaptureRegExp).join('');
      const rtlLetters = letters.match(rtlCaptureRegExp).join('');
      if (rtlLetters.length > (letters.length / 2)) {
        return 'rtl'
      }
    }
  }
  return 'ltr';
}

export {
  capitalize,

  renderPlainText,
  renderEmoji,
  findEmoji,
  hasEmojiSupport,
  detectDirection,
};
