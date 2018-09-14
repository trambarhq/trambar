import _ from 'lodash';
import React from 'react';
import MarkGor from 'mark-gor/react';
import ListParser from 'utils/list-parser';
import PlainText from 'utils/plain-text';

// widgets
import ResourceView from 'widgets/resource-view';

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
    let parser = createParser(onReference);
    let bTokens = parser.extractBlocks(text);
    return _.some(bTokens, (bToken) => {
        switch (bToken.type) {
            case 'space':
                return false;
            case 'paragraph':
            case 'text_block':
                // scan for inline markup
                let iToken;
                let inlineLexer = parser.inlineLexer;
                inlineLexer.start(bToken.markdown);
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
                    let child = item.children[0];
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
    let parser = createParser(onReference);
    let renderer = createRenderer();
    let bTokens = parser.parse(text);
    let paragraphs = renderer.render(bTokens);
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
    let listTokens = ListParser.extract(text);
    let markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            // it's a list
            let listItems = _.map(listToken, (item, key) => {
                let checked = item.checked;
                let label = markdownTexts[index][key];
                if (answers) {
                    // override radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    let answer = answers[item.list];
                    if (answer !== undefined) {
                        checked = (item.key == answer);
                    }
                }
                return (
                    <div className="list-item" key={key}>
                        <label>
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
    let listTokens = ListParser.extract(text);
    let markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            let listItems = _.map(listToken, (item, key) => {
                let label = markdownTexts[index][key];
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
    let listTokens = ListParser.extract(text);
    let markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            let listItems = _.map(listToken, (item, key) => {
                let checked = item.checked;
                let label = markdownTexts[index][key];
                if (answers) {
                    // override checkbox state indicated in text
                    // with set-but-not-yet-saved value
                    let answer = answers[item.list];
                    if (answer !== undefined) {
                        let selected = answer[item.key];
                        if (selected !== undefined) {
                            checked = selected;
                        }
                    }
                }
                return (
                    <div className="list-item" key={key}>
                        <label>
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
    let parser = createParser(onReference);
    let blockTokenLists = _.map(listTokens, (listToken, index) => {
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
    _.each(listTokens, (listToken, index) => {
        let blockTokens = blockTokenLists[index];
        if (listToken instanceof Array) {
            _.each(blockTokens, (blockTokens) => {
                parser.processInline(blockTokens);
            });
        } else {
            parser.processInline(blockTokens);
        }
    });

    // render tokens
    let renderer = createRenderer();
    let markdownTexts = _.map(listTokens, (listToken, index) => {
        let blockTokens = blockTokenLists[index];
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
    let blockLexer = new MarkGor.BlockLexer();
    let inlineLexer = new MarkGor.InlineLexer({
        links: blockLexer.links,
        findRefLink: findMarkdownRefLink,
        onReference,
    });
    let parser = new MarkGor.Parser({ blockLexer, inlineLexer });
    return parser;
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
    let href = token.href;
    let title = token.title;
    let text = token.text;
    return <ResourceView key={key} url={href} alt={text} title={title} />;
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

/**
 * Override Mark-Gor's default ref-link lookup mechanism
 *
 * @param  {String} name
 * @param  {Boolean} forImage
 *
 * @return {Object|undefined}
 */
function findMarkdownRefLink(name, forImage) {
    let link = this.links[name];
    if (link) {
        return link;
    }
    if (this.onReference) {
        link = this.onReference({
            type: 'reference',
            target: this,
            name,
            forImage,
        });
    }
    return link;
}

function findReferencedResource(resources, name) {
    let match = /^(picture|image|photo|video|audio|website)(-(\d+))?$/.exec(name);
    if (match) {
        let type = match[1];
        if (type === 'picture' || type === 'photo') {
            type = 'image';
        }
        let matchingResources = _.filter(resources, { type });
        let number = parseInt(match[3]) || 1;
        let res = matchingResources[number - 1];
        if (res) {
            return res;
        }
    }
    return null;
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
    exports as default,
};
