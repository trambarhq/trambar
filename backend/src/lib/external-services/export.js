var _ = require('lodash');
var MarkdownExporter = require('utils/markdown-exporter');

module.exports = {
    format,
    text,
};

var languageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

function text(versions, lang) {
    if (typeof(versions) === 'string') {
        return versions;
    }
    if (!lang) {
        lang = languageCode;
    }
    var langText = _.get(versions, lang);
    if (!langText) {
        langText = _.first(_.values(versions));
    }
    return langText || '';
}

function format(text, markdown, resources, system) {
    var address = _.get(system, 'settings.address');
    if (!markdown) {
        text = MarkdownExporter.escape(text);
    }
    text = MarkdownExporter.attachResources(text, resources, address);
    return text;
}
