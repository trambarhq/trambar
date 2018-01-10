var _ = require('lodash');
var React = require('react');
var MarkGor = require('mark-gor/react');
var ListParser = require('utils/list-parser');

var Theme = require('theme/theme');

// widgets
var ImageView = require('media/image-view');

module.exports = {
    detect,
    parse,
    parseSurvey,
    parseSurveyResults,
    parseTaskList,
    createParser,
    createRenderer,
    findReferencedResource,
    attachClipRect,
};

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
    var parser = createParser(onReference);
    var bTokens = parser.extractBlocks(text);
    return _.some(bTokens, (bToken) => {
        switch (bToken.type) {
            case 'space':
                return false;
            case 'paragraph':
            case 'text_block':
                // scan for inline markup
                var iToken;
                var inlineLexer = parser.inlineLexer;
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
                    var child = item.children[0];
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
 * Parse Markdown text
 *
 * @param  {String} text
 * @param  {Function} onReference
 *
 * @return {Array<ReactElement>}
 */
function parse(text, onReference) {
    var parser = createParser(onReference);
    var renderer = createRenderer();
    var bTokens = parser.parse(text);
    var paragraphs = renderer.render(bTokens);
    return paragraphs;
}

/**
 * Render lists embedded in text
 *
 * @param  {String} text
 *
 * @return {Array<ReactElement|String>}
 */
function parseSurvey(text, answers, onChange, onReference) {
    var listTokens = ListParser.extract(text);
    var markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            // it's a list
            var listItems = _.map(listToken, (item, key) => {
                var checked = item.checked;
                var label = markdownTexts[index][key];
                if (answers) {
                    // override radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    var answer = answers[item.list];
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

function parseSurveyResults(text, voteCounts, onReference) {
    var listTokens = ListParser.extract(text);
    var markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            var listItems = _.map(listToken, (item, key) => {
                var label = markdownTexts[index][key];
                var tally = voteCounts[item.list];
                var total = _.get(tally, 'total', 0);
                var count = _.get(tally, [ 'answers', item.key ], 0);
                var percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
                var color = `color-${item.key % 10}`;
                return (
                    <div className="vote-count" key={key}>
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

function parseTaskList(text, answers, onChange, onReference) {
    var listTokens = ListParser.extract(text);
    var markdownTexts = renderListTokens(listTokens, onReference);

    // create text nodes and list items
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            var listItems = _.map(listToken, (item, key) => {
                var checked = item.checked;
                var label = markdownTexts[index][key];
                if (answers) {
                    // override checkbox state indicated in text
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
    var parser = createParser(onReference);
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
    var renderer = createRenderer();
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
    var blockLexer = new MarkGor.BlockLexer();
    var inlineLexer = new MarkGor.InlineLexer({
        links: blockLexer.links,
        findRefLink: findMarkdownRefLink,
        onReference,
    });
    var parser = new MarkGor.Parser({ blockLexer, inlineLexer });
    return parser;
}

/**
 * Create a Markdown renderer
 *
 * @return {Renderer}
 */
function createRenderer() {
    return new MarkGor.Renderer({ renderImage });
}

function renderImage(token, key) {
    var href = token.href;
    var title = token.title;
    var text = token.text;
    if (/^blob:/.test(href)) {
        var queryIndex = href.indexOf('?');
        var clip;
        if (queryIndex !== -1) {
            var pairs = _.split(href.substr(queryIndex + 1), '&');
            clip = _.transform(pairs, (clip, pair) => {
                var p = _.split(pair, '=');
                var name = p[0];
                var value = parseInt(p[1]);
                clip[name] = value;
            }, {});
            href = href.substr(0, queryIndex);
        }
        return <ImageView key={key} url={href} clippingRect={clip} alt={text} title={title} />;
    } else {
        return <img key={key} src={href} alt={text} title={title} />;
    }
};

/**
 * Override Mark-Gor's default ref-link lookup mechanism
 *
 * @param  {String} name
 * @param  {Boolean} forImage
 *
 * @return {Object|undefined}
 */
function findMarkdownRefLink(name, forImage) {
    var link = this.links[name];
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
    var match = /^(picture|image|photo|video|audio|website)(-(\d+))?$/.exec(name);
    if (match) {
        var type = match[1];
        if (type === 'picture' || type === 'photo') {
            type = 'image';
        }
        var matchingResources = _.filter(resources, { type });
        var number = parseInt(match[3]) || 1;
        var res = matchingResources[number - 1];
        if (res) {
            return res;
        }
    }
    return null;
}

/**
 * Attach clipping rectangle coordinates to a blob URL
 *
 * @param  {String} blobURL
 * @param  {Object} clip
 *
 * @return {String}
 */
function attachClipRect(blobURL, clip) {
    if (blobURL && clip) {
        var query = _.join(_.map(clip, (value, name) => {
            return `${name}=${value}`;
        }), '&');
        blobURL += '?' + query;
    }
    return blobURL;
}
