var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ListParser = require('utils/list-parser');
var MarkGor = require('mark-gor/react');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = StoryText;
module.exports.hasLists = hasLists;
module.exports.hasMarkdownFormatting = hasMarkdownFormatting;
module.exports.addListTemplate = addListTemplate;
module.exports.updateList = updateList;

require('./story-text.scss');

function StoryText(props) {
    var options = props.options;
    var languageCode = options.languageCode || props.locale.languageCode;
    var storyType = _.get(props.story, 'type');
    var markdown = _.get(props.story, 'details.markdown', false);
    var listType;
    if (storyType === 'vote' || storyType === 'task-list') {
        listType = storyType;
    }
    var lang = languageCode.substr(0, 2);
    var text = _.get(props.story, 'details.text');
    var contents = _.get(text, lang, '');
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
            markdown: markdown,
            story: props.story,
            theme: props.theme,
            onItemChange: props.onItemChange,
        });
    } else if (markdown) {
        contents = MarkGor.parse(contents);
    }

    var containerProps = _.omit(props, 'locale', 'theme', 'options', 'story', 'onItemChange');
    containerProps.className = classNames.join(' ');
    containerProps.lang = languageCode;
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
        PropTypes.number,
        PropTypes.arrayOf(PropTypes.number)
    ])),

    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,

    onItemClick: PropTypes.func,
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
        var parser = createMarkdownParser(props.story, props.theme);
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
        var renderer = createMarkdownRenderer(props.story, props.theme);
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
    var type = (props.type === 'vote') ? 'radio' : 'checkbox';
    var onChange = props.onItemChange;
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            var elements = [];
            _.each(listToken, (item, key) => {
                var name = `list-${item.list}`;
                var value = item.key;
                var checked = item.checked;
                var label;
                if (props.markdown) {
                    // get Markdown text rendered earlier
                    label = markdownTexts[index][key];
                } else {
                    // add spaces between checkbox and label when it's plain text
                    label = item.between + item.label;
                }
                if (props.answers) {
                    var answer = props.answers[name];
                    if (type === 'radio') {
                        checked = (value === answer);
                    } else {
                        checked = _.includes(answer, item.key);
                    }
                }
                var itemProps = { type, label, name, value, checked, key, onChange };
                if (props.markdown) {
                    elements.push(<ListItem {...itemProps} />);
                } else {
                    // retain whitespaces when it's plain text
                    elements.push(item.before);
                    elements.push(<ListItem {...itemProps} />);
                    elements.push(item.after);
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

/**
 * Create list template
 *
 * @param  {Story} story
 * @param  {String} languageCode
 * @param  {Locale} locale
 */
function addListTemplate(story, languageCode, locale) {
    var lang = languageCode.substr(0, 2);
    var text = _.get(story, 'details.text');
    text = _.clone(text) || {};
    var langText = _.get(text, lang, '');
    if (_.trimEnd(langText)) {
        langText = _.trimEnd(langText) + '\n\n';
    }
    var type = story.type;
    var t = locale.translate;
    var items = _.map(_.range(1, 4), (number) => {
        var label = t(`${type}-item-$1`, number);
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
 * @param  {String} languageCode
 * @param  {HTMLInputElement} input
 */
function updateList(story, languageCode, input) {
    var lang = languageCode.substr(0, 2);
    var text = _.get(story, 'details.text');
    text = _.clone(text) || {};
    var langText = _.get(text, lang, '');

    // make "[ ]" => "[x]" or vice-versa
    var list = parseInt(input.name.substr(5));
    var key = parseInt(input.value);
    var checked = input.checked;
    var clearOthers = (input.type === 'radio');
    langText = ListParser.update(langText, list, key, checked, clearOthers);

    text[lang] = langText;
    story.details = _.clone(story.details);
    story.details.text = text;
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

/**
 * Check if given story contains Markdown formatting
 *
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function hasMarkdownFormatting(story) {
    var text = _.get(story, 'details.text');
    // check text of each language
    return _.some(text, (langText) => {
        // process the text fully at block level, so ref links are captured
        var parser = createMarkdownParser();
        var tokens = parser.extractBlocks(langText);
        return _.some(tokens, (token) => {
            switch (token.type) {
                case 'space':
                    return false;
                case 'paragraph':
                case 'text_block':
                    // scan for inline markup
                    var iToken;
                    var inlineLexer = parser.inlineLexer;
                    inlineLexer.start(token.markdown);
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
                default:
                    return true;
            }
        });
    });
}

/**
 * Create a Markdown parser that can reference resources in story
 *
 * @param  {Story} story
 * @param  {Theme} theme
 *
 * @return {Parser}
 */
function createMarkdownParser(story, theme) {
    var blockLexer = new MarkGor.BlockLexer();
    var inlineLexer = new MarkGor.InlineLexer({
        links: blockLexer.links,
        findRefLink: findMarkdownRefLink,
        story,
        theme,
    });
    var parser = new MarkGor.Parser({ blockLexer, inlineLexer });
    return parser;
}

/**
 * Create a Markdown renderer that render image tag in a custom manner
 *
 * @param  {Story} story
 * @param  {Theme} theme
 *
 * @return {Renderer}
 */
function createMarkdownRenderer(story, theme) {
    var renderer = new MarkGor.Renderer({
        renderImage: renderMarkdownImage
    });
    return renderer;
}

/**
 * Override Mark-Gor's default ref-link lookup mechanism
 *
 * @param  {String} name
 * @param  {Boolean} forImage
 *
 * @return {Object}
 */
function findMarkdownRefLink(name, forImage) {
    var link = this.links[name];
    if (link) {
        return link;
    }
    var res = findResource(this.story, name);
    if (res) {
        return getResourceLink(res, this.theme, forImage);
    } else {
        return null;
    }
}

/**
 * Look for an attached resource
 *
 * @param  {Story} story
 * @param  {String} name
 *
 * @return {Object|null}
 */
function findResource(story, name) {
    var match = /^(picture|image|video|audio|website)-(\d+)$/.exec(name);
    if (match) {
        var type = match[1];
        if (type === 'picture') {
            type = 'image';
        }
        var number = parseInt(match[2]);
        var index = number -1 ;
        var resources = _.get(story, 'details.resources');
        var res = _.get(_.filter(resources, { type }), index);
        if (res) {
            return res;
        } else {
            return { type };
        }
    }
    return null;
}

/**
 * Get a link object for a resource
 *
 * @param  {Object} res
 * @param  {Theme} theme
 * @param  {Boolean} forImage
 *
 * @return {Object}
 */
function getResourceLink(res, theme, forImage) {
    var url, title;
    if (forImage) {
        switch (res.type) {
            case 'image':
                url = theme.getImageUrl(res);
                break;
            case 'video':
                url = theme.getPosterUrl(res);
                break;
            case 'website':
                url = theme.getPosterUrl(res);
                break;
            case 'audio':
                // TODO: should return something
                return;
        }
        if (!url) {
            // TODO
        }
    } else {
        switch (res.type) {
            case 'image':
                url = theme.getImageUrl(res);
                break;
            case 'video':
                url = theme.getVideoUrl(res);
                break;
            case 'website':
                url = res.url;
                break;
            case 'audio':
                url = theme.getAudioUrl(res);
                return;
        }
        if (!url) {
            // TODO
        }
    }
    return {
        href: url,
        title: title
    };
}

function getFileUrl(url, file) {
    if (url) {
        return url;
    }
    if (file) {
        return URL.createObjectUrl(file);
    }
    return '';
}

/**
 * Override Mark-Gor's default render function for images
 *
 * @param  {Object} token
 *
 * @return {ReactElement}
 */
function renderMarkdownImage(token) {
    var href = token.href;
    var title = token.title;
    var text = token.text;
    var name = token.ref;
    return <img src={href} title={title} alt={text} />
}
