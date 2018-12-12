import _ from 'lodash';
import React from 'react';
import EmojiRegex from 'emoji-regex';
import ReactEasyEmoji from 'react-easy-emoji';
import * as ListParser from 'utils/list-parser';

/**
 * Render text containing a survey
 *
 * @param  {String} text
 * @param  {Object} answers
 * @param  {Function} onChange
 *
 * @return {Array<String|ReactElement>}
 */
function renderSurvey(text, answers, onChange) {
    let listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                let checked = item.checked;
                if (answers) {
                    // override radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    let answer = answers[item.list];
                    if (answer !== undefined) {
                        checked = (item.key == answer);
                    }
                }
                let inputProps = {
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
            return listToken;
        }
    });
}

/**
 * Render text containing a survey, showing the results
 *
 * @param  {String} text
 * @param  {Object} voteCounts
 *
 * @return {Array<String|ReactElement>}
 */
function renderSurveyResults(text, voteCounts) {
    let listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                let tally = voteCounts[item.list];
                let total = _.get(tally, 'total', 0);
                let count = _.get(tally, [ 'answers', item.key ], 0);
                let percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
                let color = `color-${item.key % 12}`;
                let className = 'vote-count';
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
            return listToken;
        }
    });
}

/**
 * Render text containing a tasj list
 *
 * @param  {String} text
 * @param  {Object} answers
 * @param  {Function} onChange
 *
 * @return {Array<String|ReactElement>}
 */
function renderTaskList(text, answers, onChange) {
    let listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                let checked = item.checked;
                if (answers) {
                    // override checkbox/radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    let answer = answers[item.list];
                    if (answer !== undefined) {
                        let selected = answer[item.key];
                        if (selected !== undefined) {
                            checked = selected;
                        }
                    }
                }
                let inputProps = {
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
            return listToken;
        }
    });
}

let needEmojiHandling = !hasEmojiSupport();
let needSkinToneStripping = !needEmojiHandling && !hasSkinToneSupport();

/**
 * Render text that might contain emojis unsupported by browser
 *
 * @param  {String} text
 * @param  {Object|undefined} options
 *
 * @return {Array<String|ReactElement>}
 */
function renderEmoji(text, options) {
    if (!needEmojiHandling) {
        if (needSkinToneStripping) {
            text = stripSkinTone(text);
        }
        return [ text ];
    }
    // use custom function so we can add prefix to key
    let parentKey = _.get(options, 'key');
    return ReactEasyEmoji(text, renderEmojiImage.bind(null, parentKey));
}

let emojiStyle = {
	height: '1em',
	width: '1em',
	margin: '0 .05em 0 .1em',
	verticalAlign: '-0.1em'
};

function renderEmojiImage(parentKey, code, string, characterKey) {
    let key = (parentKey !== undefined) ? `${parentKey}.${characterKey}` : characterKey;
    let src = `https://twemoji.maxcdn.com/2/72x72/${code}.png`;
    return <img key={key} alt={string} draggable={false} src={src} style={emojiStyle} />;
}

/**
 * Return true if browser supports emojis
 *
 * @return {Boolean}
 */
function hasEmojiSupport() {
    return canDrawEmoji('\ud83d\ude03');
}

/**
 * Return true if browser supports emojis with different skin tones
 *
 * @return {Boolean}
 */
function hasSkinToneSupport() {
    return canDrawEmoji('\ud83c\udffb');
}

/**
 * Return true browser is able to draw the specified emoji
 *
 * @return {Boolean}
 */
function canDrawEmoji(text) {
    let canvas = document.createElement('canvas');
    if (!canvas.getContext) {
        return false;
    }
    let context = canvas.getContext('2d');
    if (!context.fillText) {
        return false;
    }
    context.textBaseline = "top";
    context.font = "32px Arial";
    context.fillText(text, 0, 0);
    let pixels = context.getImageData(16, 16, 1, 1).data;
    return pixels[0] !== 0;
}

const skinToneRegExp = /\ud83c\udffb|\ud83c\udffc|\ud83c\udffd|\ud83c\udffe|\ud83c\udfff/g;

/**
 * Strip skin tone modifier from a string
 *
 * @param  {String} s
 *
 * @return {String}
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
    let m = string.match(emojiRegex);
    return m;
}

export {
    renderSurvey,
    renderSurveyResults,
    renderTaskList,
    renderEmoji,
    findEmoji,
    hasEmojiSupport,
};
