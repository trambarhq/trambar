var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ListParser = require('utils/list-parser');
var MarkGor = require('mark-gor/react');

module.exports = StoryText;
module.exports.hasLists = hasLists;
module.exports.hasMarkdownFormatting = hasMarkdownFormatting;
module.exports.createListTemplate = createListTemplate;

require('./story-text.scss');

function StoryText(props) {
    var story = props.story;
    var languageCode = props.languageCode || props.locale.languageCode;
    var storyType = _.get(story, 'type');
    var markdown = _.get(story, 'details.markdown', false);
    var listType;
    if (storyType === 'vote' || storyType === 'task-list') {
        listType = storyType;
    }
    var lang = languageCode.substr(0, 2);
    var text = _.get(story, 'details.text');
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
            onClick: props.onItemClick,
            markdown,
            story,
        });
    } else if (markdown){
        contents = MarkGor.parse(contents);
    }

    var containerProps = _.omit(props, 'locale', 'languageCode', 'story');
    containerProps.className = classNames.join(' ');
    containerProps.lang = languageCode;
    if (markdown) {
        return <div {...containerProps}>{contents}</div>;
    } else {
        return <p {...containerProps}>{contents}</p>;
    }
}

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
        var parser = createMarkdownParser(props.story);
        var blockTokenLists = [];
        _.each(listTokens, (listToken, index) => {
            var blockTokens;
            if (listToken instanceof Array) {
                // process the label of each item
                blockTokens = _.map(listToken, (item) => {
                    return parser.extractBlocks(item.label);
                });
            } else {
                blockTokens = parser.extractBlocks(listToken);
            }
            blockTokenLists[index] = blockTokens;
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
        // render
        var renderer = new MarkGor.Renderer;
        return _.map(listTokens, (listToken, index) => {
            var blockTokens = blockTokenLists[index];
            if (listToken instanceof Array) {
                var elements = [];
                _.each(listToken, (item, index) => {
                    var label = _.first(renderer.render(blockTokens[index]));
                    if (label && label.props && label.type === 'p') {
                        // take text out from <p>
                        label = label.props.children;
                    }
                    var itemProps = {
                        type: props.type,
                        label: label,
                        name: `list-${item.list}`,
                        value: item.key,
                        checked: item.checked,
                        onClick: props.onClick,
                        key: index,
                    };
                    elements.push(<ListItem {...itemProps} />);
                });
                return <div key={index}>{elements}</div>;
            } else {
                return renderer.render(blockTokens);
            }
        });
    } else {
        // lists within plain text
        return _.map(listTokens, (listToken, index) => {
            if (listToken instanceof Array) {
                var elements = [];
                _.each(listToken, (item, index) => {
                    var itemProps = {
                        type: props.type,
                        label: item.between + item.label,
                        name: `list-${item.list}`,
                        value: item.key,
                        checked: item.checked,
                        onClick: props.onClick,
                        key: index
                    };
                    // retain whitespaces
                    elements.push(item.before);
                    elements.push(<ListItem {...itemProps} />);
                    elements.push(item.after);
                });
                return elements;
            } else {
                // plain text
                return listToken;
            }
        });
    }
}

function ListItem(props) {
    var inputProps = {
        type: (props.type === 'vote') ? 'radio' : 'checkbox',
        name: props.name,
        value: props.value,
        checked: props.checked,
        onClick: props.onClick,
    };
    return (
        <label className="list-item" key={props.key}>
            <input {...inputProps} />
            {props.label}
        </label>
    );
}

/**
 * Create list template
 *
 * @param  {String} type
 * @param  {Locale} locale
 *
 * @return {String}
 */
function createListTemplate(type, locale) {
    var t = locale.translate;
    var items = _.map(_.range(1, 4), (number) => {
        var label = t(`${type}-item-$1`, number);
        return `[ ] ${label}`;
    });
    return items.join('\n');
}

/**
 * Check if given story contains lists
 *
 * @param  {Story} story
 *
 * @return {Boolean}
 */
function hasLists(story, languageCode) {
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

function createMarkdownParser(story) {
    var blockLexer = new MarkGor.BlockLexer();
    var inlineLexer = new MarkGor.InlineLexer({
        links: blockLexer.links,
        findRefLink: findMarkdownRefLink,
        story,
    });
    var parser = new MarkGor.Parser({ blockLexer, inlineLexer });
    return parser;
}

function findMarkdownRefLink(name) {
    console.log('Look up: ' + name)
    var link = this.links[name];
    if (link) {
        return link;
    }
    var match = /^(picture|video|audio|website)-(\d+)$/.exec(name);
    if (match) {
        var type = match[1];
        var number = parseInt(match[2]);
        var index = number -1 ;
        var resources = _.get(this.story, 'details.resources');
        var res = _.get(resources, index);
        var url;
        if (res) {
            url = res.url;
        } else {
            // TODO: return placeholder image
            url = '/todo';
        }
        return {
            href: url,
            title: '',
        };
    } else {
        return null;
    }
}
