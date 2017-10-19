var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ListParser = require('utils/list-parser');
var Markdown = require('utils/markdown');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = exports = StoryText;

exports.hasLists = hasLists;
exports.addListTemplate = addListTemplate;
exports.updateList = updateList;
exports.getDefaultAnswers = getDefaultAnswers;

require('./story-text.scss');

function StoryText(props) {
    var p = props.locale.pick;
    var options = props.options;
    var storyType = _.get(props.story, 'type');
    var markdown = _.get(props.story, 'details.markdown', false);
    var listType;
    if (storyType === 'survey' || storyType === 'task-list') {
        listType = storyType;
    }
    var contents = p(props.story.details.text, options.languageCode);
    var classNames = [ 'story-text' ];
    if (!markdown) {
        classNames.push('plain-text');
    }
    if (props.className) {
        classNames.push(props.className);
    }

    if (listType) {
        contents = renderLists({
            text: contents,
            type: listType,
            answers: props.answers,
            voteCounts: props.voteCounts,
            markdown: markdown,
            story: props.story,
            theme: props.theme,
            readOnly: props.readOnly,
            onItemChange: props.onItemChange,
        });
    } else if (markdown) {
        // resources and theme are needed to handle media references
        var resources = _.get(props.story, 'details.resources');
        contents = Markdown.parse(contents, resources, props.theme);
        classNames.push('markdown');
    }

    var containerProps = _.omit(props, _.keys(StoryText.propTypes));
    containerProps.className = classNames.join(' ');
    containerProps.lang = options.languageCode || props.locale.languageCode;
    if (markdown) {
        return <div {...containerProps}>{contents}</div>;
    } else {
        // put text in a <p> to be consistent with Markdown text
        return <p {...containerProps}>{contents}</p>;
    }
}

StoryText.propTypes = {
    story: PropTypes.object.isRequired,
    options: PropTypes.object,
    answers: PropTypes.objectOf(PropTypes.oneOfType([
        PropTypes.number,                       // survey answer
        PropTypes.objectOf(PropTypes.bool)      // task-list check states
    ])),
    voteCounts: PropTypes.object,
    readOnly: PropTypes.bool,

    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,

    onItemChange: PropTypes.func,
};

StoryText.defaultProps = {
    options: {}
};

/**
 * Render list embedded in text
 *
 * @param  {String} text
 *
 * @return {Array<ReactElement|String>}
 */
function renderLists(props) {
    var listTokens = ListParser.extract(props.text);
    if (props.markdown) {
        // process the text fully at block level, so ref links are captured
        var resources = _.get(props.story, 'details.resources');
        var parser = Markdown.createParser(resources, props.theme);
        var blockTokenLists = _.map(listTokens, (listToken, index) => {
            var blockTokens;
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
        _.each(listTokens, (listToken, index) => {
            var blockTokens = blockTokenLists[index];
            if (listToken instanceof Array) {
                _.each(blockTokens, (blockTokens) => {
                    parser.processInline(blockTokens);
                });
            } else {
                parser.processInline(blockTokens);
            }
        });
        // render tokens
        var renderer = Markdown.createRenderer(resources, props.theme);
        var markdownTexts = _.map(listTokens, (listToken, index) => {
            var blockTokens = blockTokenLists[index];
            if (listToken instanceof Array) {
                return _.map(listToken, (item, index) => {
                    var label = _.first(renderer.render(blockTokens[index]));
                    if (label && label.props && label.type === 'p') {
                        // take text out from <p>
                        label = label.props.children;
                    }
                    return label;
                });
            } else {
                return renderer.render(blockTokens);
            }
        });
    }

    // create text nodes and list items
    var type = (props.type === 'survey') ? 'radio' : 'checkbox';
    var readOnly = props.readOnly;
    var onChange = (!readOnly) ? props.onItemChange : null;
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            var elements = [];
            _.each(listToken, (item, key) => {
                var name = `list-${item.list}`;
                var value = item.key;
                var checked = item.checked;
                var label;
                if (!props.voteCounts) {
                    var label;
                    if (props.markdown) {
                        // get Markdown text rendered earlier
                        label = markdownTexts[index][key];
                    } else {
                        // add spaces between checkbox and label when it's plain text
                        label = item.between + item.label;
                    }
                    if (props.answers) {
                        // override checkbox/radio-button state indicated in text
                        // with set-but-not-yet-saved value
                        var answer = props.answers[name];
                        if (answer !== undefined) {
                            if (type === 'radio') {
                                checked = (value === answer);
                            } else {
                                var selected = answer[item.key];
                                if (selected !== undefined) {
                                    checked = selected;
                                }
                            }
                        }
                    }
                    var itemProps = { key, type, label, name, value, checked, readOnly, onChange };
                    if (props.markdown) {
                        elements.push(<ListItem {...itemProps} />);
                    } else {
                        // retain whitespaces when it's plain text
                        elements.push(item.before);
                        elements.push(<ListItem {...itemProps} />);
                        elements.push(item.after);
                    }
                } else {
                    var label;
                    if (props.markdown) {
                        // get Markdown text rendered earlier
                        label = markdownTexts[index][key];
                    } else {
                        label = item.label;
                    }
                    var tally = props.voteCounts[name];
                    var itemProps = { key, label, value, tally };
                    if (props.markdown) {
                        elements.push(<ListItemCount {...itemProps} />);
                    } else {
                        // retain whitespaces when it's plain text
                        elements.push(item.before);
                        elements.push(<ListItemCount {...itemProps} />);
                        elements.push(item.after);
                    }
                }
            });
            if (props.markdown) {
                // put list in a div when it's markdown
                return <div key={index}>{elements}</div>;
            } else {
                // treat list items as inline elements within text
                return elements;
            }
        } else {
            if (props.markdown) {
                return markdownTexts[index];
            } else {
                return listToken;
            }
        }
    });
}

function ListItem(props) {
    var inputProps = _.omit(props, 'label');
    return (
        <label className="list-item">
            <input {...inputProps} />
            {props.label}
        </label>
    );
}

function ListItemCount(props) {
    var total = _.get(props.tally, 'total', 0);
    var count = _.get(props.tally, [ 'answers', props.value ], 0);
    var percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
    var num = (props.value - 1) % 10;
    return (
        <label className="list-item vote-count">
            <span className="label">{props.label}</span>
            <span className="bar">
                <span className={`filled item-${num}`} style={{ width: percent }}></span>
                <span className="percent">{percent}</span>
                <span className="count">{count + '/' + total}</span>
            </span>
        </label>
    );
}

/**
 * Create list template
 *
 * @param  {Story} story
 * @param  {Locale} locale
 */
function addListTemplate(story, locale) {
    var lang = locale.lang;
    var text = _.get(story, 'details.text');
    text = _.clone(text) || {};
    var langText = _.get(text, lang, '');
    if (_.trimEnd(langText)) {
        langText = _.trimEnd(langText) + '\n\n';
    }
    var type = story.type;
    var t = locale.translate;
    var items = _.map(_.range(1, 4), (number) => {
        var label = t(`${type}-item-$number`, number);
        return `[ ] ${label}`;
    });
    langText += items.join('\n');

    text[lang] = langText;
    story.details = _.clone(story.details);
    story.details.text = text;
}

/**
 * Check or uncheck list item
 *
 * @param  {Story} story
 * @param  {HTMLInputElement} input
 */
function updateList(story, input) {
    var list = parseInt(input.name.substr(5));
    var key = parseInt(input.value);
    var clearOthers = (input.type === 'radio');
    var checked = input.checked;
    var newText = _.mapValues(story.details.text, (langText) => {
        // make "[ ]" => "[x]" or vice-versa
        return ListParser.update(langText, list, key, checked, clearOthers);
    });
    story.details = _.clone(story.details);
    story.details.text = newText;
}

/**
 * Return answers that are set in the story
 *
 * @param  {Story} story
 * @param  {Locale} locale
 *
 * @return {Object}
 */
function getDefaultAnswers(story, locale) {
    var answers = {};
    if (story.type === 'survey') {
        var p = locale.pick;
        var langText = p(story.details.text);
        var tokens = ListParser.extract(langText);
        _.each(tokens, (list, listIndex) => {
            var name = `list-${listIndex + 1}`;
            _.each(list, (item, itemIndex) => {
                if (item.checked) {
                    answers[name] = itemIndex + 1;
                }
            });
        });
    }
    return answers;
}

/**
 * Check if given story contains lists
 *
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function hasLists(story) {
    var text = _.get(story, 'details.text');
    // check text of each language
    return _.some(text, (langText) => {
        var tokens = ListParser.extract(langText);
        return _.some(tokens, (token) => {
            // lists are arrays
            return token instanceof Array;
        });
    });
}
