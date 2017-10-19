var _ = require('lodash');
var React = require('react');
var MarkGor = require('mark-gor/react');

var Theme = require('theme/theme');

exports.detect = detect;
exports.parse = parse;
exports.createParser = createParser;
exports.createRenderer = createRenderer;

/**
 * Detect whether text appears to be Markdown
 *
 * @param  {String|Object} text
 * @param  {Array<Object>} resources
 * @param  {Theme} theme
 *
 * @return {Boolean}
 */
function detect(text, resources, theme) {
    if (typeof(text) === 'object') {
        return _.some(text, detect);
    }
    // process the text fully at block level, so ref links are captured
    var parser = createParser(resources, theme);
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
            default:
                return true;
        }
    });
}

/**
 * Parse Markdown text, adding resources that are referenced to given array
 *
 * @param  {String} text
 * @param  {Array<Object>} resources
 * @param  {Theme} theme
 * @param  {Array<Object>} resourcesReferenced
 *
 * @return {Array<ReactElement>}
 */
function parse(text, resources, theme, resourcesReferenced) {
    var parser = createParser(resources, theme, resourcesReferenced);
    var renderer = createRenderer(resources, theme);
    var bTokens = parser.parse(text);
    var paragraphs = renderer.render(bTokens);
    return paragraphs;
}

/**
 * Create a Markdown parser that can reference resources
 *
 * @param  {Array<Object>} resources
 * @param  {Theme} theme
 * @param  {Array<Object>} resourcesReferenced
 *
 * @return {Parser}
 */
function createParser(resources, theme, resourcesReferenced) {
    var blockLexer = new MarkGor.BlockLexer();
    var inlineLexer = new MarkGor.InlineLexer({
        links: blockLexer.links,
        findRefLink: findMarkdownRefLink,
        resources,
        theme,
        resourcesReferenced,
    });
    var parser = new MarkGor.Parser({ blockLexer, inlineLexer });
    return parser;
}

/**
 * Create a Markdown renderer that render image tag in a custom manner
 *
 * @param  {Array<Object>} resources
 * @param  {Theme} theme
 *
 * @return {Renderer}
 */
function createRenderer(resources, theme) {
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
    var res = findResource(this.resources, name);
    if (res) {
        if (this.resourcesReferenced instanceof Array) {
            this.resourcesReferenced.push(res);
        }
        return getResourceLink(res, this.theme, forImage);
    } else {
        return null;
    }
}

/**
 * Look for an attached resource
 *
 * @param  {Array<Object>} resources
 * @param  {String} name
 *
 * @return {Object|null}
 */
function findResource(resources, name) {
    var match = /^(picture|image|video|audio|website)-(\d+)$/.exec(name);
    if (match) {
        var type = match[1];
        if (type === 'picture') {
            type = 'image';
        }
        var number = parseInt(match[2]);
        var index = number - 1;
        var res = _.get(_.filter(resources, { type }), index);
        if (res) {
            return res;
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
    // TODO: handle blobs
    // TODO: adjust image size
    var url, title;
    if (forImage) {
        var options = {
            height: 120
        };
        switch (res.type) {
            case 'image':
                url = theme.getImageUrl(res, options);
                break;
            case 'video':
                url = theme.getPosterUrl(res, options);
                break;
            case 'website':
                url = theme.getPosterUrl(res, options);
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

/**
 * Override Mark-Gor's default render function for images
 *
 * @param  {Object} token
 *
 * @return {ReactElement}
 */
function renderMarkdownImage(token) {
    // TODO: style should be applied
    // TODO: should pop open on click
    var href = token.href;
    var title = token.title;
    var text = token.text;
    var name = token.ref;
    return <img src={href} title={title} alt={text} />
}
