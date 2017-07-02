var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ListParser = require('utils/list-parser');
var ReactMarked = require('react-marked');

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
        contents = renderLists(contents, listType, markdown);
    } else if (markdown){
        contents = ReactMarked.parse(contents);
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
function renderLists(text, type, markdown) {
    var tokens = ListParser.extract(text);
    return _.map(tokens, (token) => {
        if (token instanceof Array) {
            var items = token;
            return renderListItems({ items, type, markdown });
        } else {
            if (markdown) {
                return ReactMarked.parse(token);
            } else {
                return token;
            }
        }
    });
}

/**
 * Render list items
 *
 * @param  {Object}
 *
 * @return {ReactElement|Array<ReactElement>}
 */
function renderListItems(props) {
    var elements = [];
    var itemProps = _.omit(props, 'items');
    _.each(props.items, (item, index) => {
        var element = renderListItem(_.extend(itemProps, { item, key: index }));
        if (props.markdown) {
            elements.push(element);
        } else {
            // retain whitespaces when it's plain text
            elements.push(item.before);
            elements.push(element);
            elements.push(item.after);
        }
    });
    if (props.markdown) {
        return <div>{elements}</div>;
    } else {
        return elements;
    }
}

/**
 * Render one list item
 *
 * @param  {Object}
 *
 * @return {ReactElement}
 */
function renderListItem(props) {
    var item = props.item;
    var inputProps = {
        type: (props.type === 'vote') ? 'radio' : 'checkbox',
        name: `list-${item.list}`,
        defaultChecked: item.checked,
        'data-list': item.list,
        'data-key': item.key,
    };
    var label = item.label;
    if (props.markdown) {
        var elements = ReactMarked.parse(label);
        // grab elements from P tag
        var first = _.first(elements);
        if (first && first.props) {
            label = first.props.children;
        }
    }
    return (
        <label className="list-item" key={props.key}>
            <input {...inputProps} />
            {item.between}
            {label}
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
 * Check if given text contains lists
 *
 * @param  {String} text
 *
 * @return {Boolean}
 */
function hasLists(text) {
    var tokens = ListParser.extract(text);
    return _.some(tokens, (token) => {
        return token instanceof Array;
    });
}

/**
 * Check if given text contains Markdown formatting
 *
 * @param  {String}  text
 * @param  {Options}  options
 *
 * @return {Boolean}
 */
function hasMarkdownFormatting(text, options) {
    var check = function(children) {
        children = React.Children.toArray(children);
        return _.some(children, (element) => {
            if (element && element.type && element.props) {
                if (element.type !== 'p') {
                    return true;
                } else if (element.props.children) {
                    return check(element.props.children);
                }
            }
        })
    };
    var contents = ReactMarked(text, options);
    return check(contents);
}
