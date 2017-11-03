var _ = require('lodash');

exports.format = format;
exports.text = text;

var languageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

function text(versions, lang) {
    if (!lang) {
        lang = languageCode;
    }
    var langText = _.get(versions, lang);
    if (!langText) {
        langText = _.first(_.values(versions));
    }
    return langText || '';
}

function format(text, markdown, resources) {
    if (markdown) {
        return text;
    } else {
        return text;
    }
}
