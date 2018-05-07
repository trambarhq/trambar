var _ = require('lodash');
var React = require('react');
var ReactEasyEmoji = require('react-easy-emoji');
var ListParser = require('utils/list-parser');

module.exports = {
    renderSurvey,
    renderSurveyResults,
    renderTaskList,
    renderEmoji,
    hasEmojiSupport,
};

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
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var checked = item.checked;
                if (answers) {
                    // override radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    var answer = answers[item.list];
                    if (answer !== undefined) {
                        checked = (item.key == answer);
                    }
                }
                return (
                    <span>
                        {item.before}
                        <label>
                            <input type="radio" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
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
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var tally = voteCounts[item.list];
                var total = _.get(tally, 'total', 0);
                var count = _.get(tally, [ 'answers', item.key ], 0);
                var percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
                var color = `color-${item.key % 12}`;
                var className = 'vote-count';
                if (count === total) {
                    className += ' unanimous';
                }
                return (
                    <span>
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
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var checked = item.checked;
                if (answers) {
                    // override checkbox/radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    var answer = answers[item.list];
                    if (answer !== undefined) {
                        var selected = answer[item.key];
                        if (selected !== undefined) {
                            checked = selected;
                        }
                    }
                }
                return (
                    <span>
                        {item.before}
                        <label>
                            <input type="checkbox" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
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

var needEmojiHandling = !hasEmojiSupport();

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
        return [ text ];
    }
    // use custom function so we can add prefix to key
    var parentKey = _.get(options, 'key');
    return ReactEasyEmoji(text, renderEmojiImage.bind(null, parentKey));
}

var emojiStyle = {
	height: '1em',
	width: '1em',
	margin: '0 .05em 0 .1em',
	verticalAlign: '-0.1em'
};

function renderEmojiImage(parentKey, code, string, characterKey) {
    var key = (parentKey !== undefined) ? `${parentKey}.${characterKey}` : characterKey;
    var src = `https://twemoji.maxcdn.com/2/72x72/${code}.png`;
    return <img key={key} alt={string} draggable={false} src={src} style={emojiStyle} />;
}

/**
 * Return true if browser supports emojis
 *
 * @return {Boolean}
 */
function hasEmojiSupport() {
    var canvas = document.createElement('canvas');
    if (!canvas.getContext) {
        return false;
    }
    var context = canvas.getContext('2d');
    if (!context.fillText) {
        return false;
    }
    var smile = '\ud83d\ude03';
    context.textBaseline = "top";
    context.font = "32px Arial";
    context.fillText(smile, 0, 0);
    var pixels = context.getImageData(16, 16, 1, 1).data;
    return pixels[0] !== 0;
}
